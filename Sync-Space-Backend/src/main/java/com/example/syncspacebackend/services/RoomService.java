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

        // Use saveAndFlush to instantly generate the ID for the composite key
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

        if (!participantRepository.existsByRoomAndUser(room, user)) {
            RoomParticipantId memberId = new RoomParticipantId(user.getId(), room.getId());
            participantRepository.save(RoomParticipant.builder()
                .id(memberId).room(room).user(user).role(RoomParticipant.Role.MEMBER).build());
        }
        return room;
    }

    public Room getRoomForEntry(Long roomId) {
        User user = getAuthenticatedUser();
        Room room = roomRepository.findById(roomId).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        RoomParticipant participant = participantRepository.findByRoomAndUser(room, user)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.FORBIDDEN, "Not a member"));

        // If WAITING or ENDED, ONLY Admin can enter (to see the Lobby/Start button)
        if ((room.getStatus() == Room.RoomStatus.WAITING || room.getStatus() == Room.RoomStatus.ENDED) 
            && participant.getRole() != RoomParticipant.Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Wait for the Admin to start the session.");
        }
        return room;
    }

    @Transactional
    public void startRoomSession(Long roomId) {
        Room room = roomRepository.findById(roomId).orElseThrow();
        if (!room.getOwner().getId().equals(getAuthenticatedUser().getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        room.setStatus(Room.RoomStatus.ACTIVE);
        roomRepository.save(room);
    }

    @Transactional
    public void restartRoom(Long roomId) {
        Room room = roomRepository.findById(roomId).orElseThrow();
        if (!room.getOwner().getId().equals(getAuthenticatedUser().getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        room.setStatus(Room.RoomStatus.WAITING);
        room.setEndedAt(null);
        roomRepository.save(room);
    }

    @Transactional
    public void endRoom(Long roomId) {
        Room room = roomRepository.findById(roomId).orElseThrow();
        if (!room.getOwner().getId().equals(getAuthenticatedUser().getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        room.setStatus(Room.RoomStatus.ENDED);
        room.setEndedAt(LocalDateTime.now());
        roomRepository.save(room);
    }

    @Transactional
    public void promoteParticipant(Long roomId, Long targetUserId) {
        Room room = roomRepository.findById(roomId).orElseThrow();
        if (!room.getOwner().getId().equals(getAuthenticatedUser().getId())) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        
        RoomParticipant target = participantRepository.findByRoomAndUserId(room, targetUserId).orElseThrow();
        target.setRole(RoomParticipant.Role.CONTRIBUTOR);
        participantRepository.save(target);
    }

    public List<UserRoomResponse> getAuthenticatedUserRooms() {
        User user = getAuthenticatedUser();
        return participantRepository.findAllByUserId(user.getId()).stream()
                .map(p -> new UserRoomResponse(p.getRoom().getId(), p.getRoom().getName(), 
                     p.getRoom().getDescription(), p.getRoom().getJoinCode(), 
                     p.getRoom().getStatus().name(), p.getRole().name()))
                .collect(Collectors.toList());
    }

    public List<MemberResponse> getRoomMembers(Long roomId) {
        Room room = roomRepository.findById(roomId).orElseThrow();
        return participantRepository.findAllByRoom(room).stream()
                .map(p -> new MemberResponse(p.getUser().getId(), p.getUser().getUsername(), p.getRole().name()))
                .collect(Collectors.toList());
    }

    private User getAuthenticatedUser() {
        String email = SecurityContextHolder.getContext().getAuthentication().getName();
        return userRepository.findByEmail(email).orElseThrow();
    }
}