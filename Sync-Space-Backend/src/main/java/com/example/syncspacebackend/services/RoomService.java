package com.example.syncspacebackend.services;

import com.example.syncspacebackend.models.*;
import com.example.syncspacebackend.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomParticipantRepository participantRepository;
    private final UserRepository userRepository;

    @Transactional
    public Room createRoom(RoomRequest request) {
        User user = getAuthenticatedUser();

        Room room = Room.builder()
                .name(request.getName())
                .description(request.getDescription())
                .joinCode(UUID.randomUUID().toString().substring(0, 8).toUpperCase())
                .status(Room.RoomStatus.ACTIVE)
                .owner(user)
                .createdAt(LocalDateTime.now())
                .build();

        Room savedRoom = roomRepository.saveAndFlush(room);

        RoomParticipantId adminId = new RoomParticipantId(user.getId(), savedRoom.getId());
        participantRepository.save(RoomParticipant.builder()
                .id(adminId).room(savedRoom).user(user).role(RoomParticipant.Role.ADMIN).build());

        return savedRoom;
    }

    @Transactional
    public Room joinRoomByCode(String joinCode) {
        User user = getAuthenticatedUser();

        Room room = roomRepository.findByJoinCode(joinCode.toUpperCase())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid code"));

        if (room.getStatus() == Room.RoomStatus.INACTIVE) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "This room is closed.");
        }

        RoomParticipantId pid = new RoomParticipantId(user.getId(), room.getId());
        if (!participantRepository.existsById(pid)) {
            participantRepository.save(RoomParticipant.builder()
                    .id(pid).room(room).user(user).role(RoomParticipant.Role.MEMBER).build());
        }

        return room;
    }

    public Room getRoomForEntry(Long roomId) {
        User user = getAuthenticatedUser();

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        RoomParticipantId pid = new RoomParticipantId(user.getId(), room.getId());
        participantRepository.findById(pid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member of this room"));

        return room;
    }

    @Transactional
    public void closeRoom(Long roomId) {
        Room room = getOwnedRoom(roomId);
        room.setStatus(Room.RoomStatus.INACTIVE);
        room.setClosedAt(LocalDateTime.now());
        roomRepository.save(room);
    }

    // Returns username of promoted member so controller can broadcast it
    @Transactional
    public String promoteParticipant(Long roomId, Long targetUserId) {
        getOwnedRoom(roomId);

        RoomParticipantId pid = new RoomParticipantId(targetUserId, roomId);
        RoomParticipant target = participantRepository.findById(pid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Participant not found"));

        target.setRole(RoomParticipant.Role.CONTRIBUTOR);
        participantRepository.save(target);

        return target.getUser().getUsername();
    }

    @Transactional
    public void removeParticipant(Long roomId, Long targetUserId) {
        Room room = getOwnedRoom(roomId);

        if (room.getOwner().getId().equals(targetUserId)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot remove the admin");
        }

        RoomParticipantId pid = new RoomParticipantId(targetUserId, roomId);
        RoomParticipant target = participantRepository.findById(pid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Participant not found"));

        participantRepository.delete(target);
    }

    // Member voluntarily leaves — admin cannot leave (must close instead)
    @Transactional
    public LeaveResult leaveRoom(Long roomId) {
        User user = getAuthenticatedUser();

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));

        if (room.getOwner().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST,
                    "Admin cannot leave — close the room instead.");
        }

        RoomParticipantId pid = new RoomParticipantId(user.getId(), room.getId());
        RoomParticipant participant = participantRepository.findById(pid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Not a member"));

        participantRepository.delete(participant);

        return new LeaveResult(user.getId(), user.getUsername());
    }

    public record LeaveResult(Long userId, String username) {}

    public List<UserRoomResponse> getAuthenticatedUserRooms() {
        User user = getAuthenticatedUser();
        return participantRepository.findAllByUserId(user.getId()).stream()
                .map(p -> new UserRoomResponse(
                        p.getRoom().getId(),
                        p.getRoom().getName(),
                        p.getRoom().getDescription(),
                        p.getRoom().getJoinCode(),
                        p.getRoom().getStatus().name(),
                        p.getRole().name()))
                .collect(Collectors.toList());
    }

    public List<MemberResponse> getRoomMembers(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        return participantRepository.findAllByRoom(room).stream()
                .map(p -> new MemberResponse(
                        p.getUser().getId(),
                        p.getUser().getUsername(),
                        p.getRole().name()))
                .collect(Collectors.toList());
    }

    private Room getOwnedRoom(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        if (!room.getOwner().getId().equals(getAuthenticatedUser().getId())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only the admin can do this");
        }
        return room;
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow();
    }
    // Lightweight admin check used by controller
public void verifyAdmin(Long roomId) {
    getOwnedRoom(roomId); // throws 403 if not the admin
}
}