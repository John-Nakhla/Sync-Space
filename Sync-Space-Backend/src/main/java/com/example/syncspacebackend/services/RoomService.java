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
                .status(Room.RoomStatus.WAITING)
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
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Invalid Code"));

        if (room.getStatus() == Room.RoomStatus.ENDED) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Room is permanently closed.");
        }

        // FIX: use composite key lookup instead of existsByRoomAndUser (unreliable with @EmbeddedId)
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

        // FIX: use composite key lookup instead of findByRoomAndUser (unreliable with @EmbeddedId)
        RoomParticipantId pid = new RoomParticipantId(user.getId(), room.getId());
        participantRepository.findById(pid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member"));

        return room;
    }

    @Transactional
    public void startRoomSession(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        if (!room.getOwner().getId().equals(getAuthenticatedUser().getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        room.setStatus(Room.RoomStatus.ACTIVE);
        roomRepository.save(room);
    }

    @Transactional
    public void restartRoom(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        if (!room.getOwner().getId().equals(getAuthenticatedUser().getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        room.setStatus(Room.RoomStatus.WAITING);
        room.setEndedAt(null);
        roomRepository.save(room);
    }

    @Transactional
    public void endRoom(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        if (!room.getOwner().getId().equals(getAuthenticatedUser().getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        room.setStatus(Room.RoomStatus.ENDED);
        room.setEndedAt(LocalDateTime.now());
        roomRepository.save(room);
    }

    @Transactional
    public void promoteParticipant(Long roomId, Long targetUserId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        if (!room.getOwner().getId().equals(getAuthenticatedUser().getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);

        // FIX: findByRoomAndUserId fails with @EmbeddedId composite keys.
        // Use findById(compositeKey) — always reliable with Spring Data JPA.
        RoomParticipantId pid = new RoomParticipantId(targetUserId, roomId);
        RoomParticipant target = participantRepository.findById(pid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Participant not found"));

        target.setRole(RoomParticipant.Role.CONTRIBUTOR);
        participantRepository.save(target);
    }

    @Transactional
    public void removeParticipant(Long roomId, Long targetUserId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Room not found"));
        if (!room.getOwner().getId().equals(getAuthenticatedUser().getId()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        if (room.getOwner().getId().equals(targetUserId))
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Cannot remove the Admin");

        // FIX: same composite key fix — findByRoomAndUserId is unreliable with @EmbeddedId.
        RoomParticipantId pid = new RoomParticipantId(targetUserId, roomId);
        RoomParticipant target = participantRepository.findById(pid)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Participant not found"));

        participantRepository.delete(target);
    }

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
                .map(p -> new MemberResponse(p.getUser().getId(), p.getUser().getUsername(), p.getRole().name()))
                .collect(Collectors.toList());
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow();
    }
}