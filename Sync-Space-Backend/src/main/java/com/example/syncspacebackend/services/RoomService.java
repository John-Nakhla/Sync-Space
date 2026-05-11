package com.example.syncspacebackend.services;

import com.example.syncspacebackend.models.UserRoomResponse;
import com.example.syncspacebackend.models.*;
import com.example.syncspacebackend.repositories.*;
import com.example.syncspacebackend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final SimpMessagingTemplate messagingTemplate;

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();

        if (auth == null || !auth.isAuthenticated()) {
            throw new RuntimeException("User not authenticated");
        }

        Object principal = auth.getPrincipal();

        if (!(principal instanceof UserPrincipal userPrincipal)) {
            throw new RuntimeException("Invalid principal type: " + principal);
        }

        return userRepository.getReferenceById(userPrincipal.getId());
    }

    public List<UserRoomResponse> getAuthenticatedUserRooms() {

        User user = getAuthenticatedUser();

        return participantRepository.findAllByUserId(user.getId()).stream()
                .map(participant -> {
                    Room room = participant.getRoom();

                    return new UserRoomResponse(
                            room.getId(),
                            room.getName(),
                            room.getDescription(),
                            participant.getRole().name(),
                            room.getStatus().name(),   // ✅ status
                            room.getJoinCode()         // ✅ join code
                    );
                })
                .toList();
    }

    @Transactional
    public Room createRoom(String name, String description) {
        User owner = getAuthenticatedUser();

        Room room = Room.builder()
                .name(name)
                .description(description)
                .owner(owner)
                .joinCode(UUID.randomUUID().toString().substring(0, 8))
                .status(Room.RoomStatus.ACTIVE)
                .build();

        Room savedRoom = roomRepository.save(room);

        RoomParticipantId id = new RoomParticipantId();
        id.setRoomId(savedRoom.getId());
        id.setUserId(owner.getId());

        RoomParticipant participant = RoomParticipant.builder()
                .id(id)
                .room(savedRoom)
                .user(owner)
                .role(RoomParticipant.Role.ADMIN)
                .build();

        participantRepository.save(participant);

        return savedRoom;
    }

    @Transactional
    public String joinRoom(String joinCode) {
        User user = getAuthenticatedUser();

        // 1. Check if room exists
        Room room = roomRepository.findByJoinCode(joinCode)
                .orElse(null);
        if (room == null) return "Error: Invalid Room Code!";

        // 2. Check if paused/ended
        if (room.getStatus() == Room.RoomStatus.ENDED) {
            return "Error: This room is currently paused or ended.";
        }

        // 3. Check if already joined
        if (participantRepository.existsByRoomAndUser(room, user)) {
            return "Already joined: You are already a member of this room.";
        }

        // 4. Success path
        RoomParticipantId id = new RoomParticipantId();
        id.setRoomId(room.getId());
        id.setUserId(user.getId());

        RoomParticipant participant = RoomParticipant.builder()
                .id(id)
                .room(room)
                .user(user)
                .role(RoomParticipant.Role.ADMIN)
                .build();

        participantRepository.save(participant);

        return "Success: " + room.getName();
    }

    @Transactional
    public void promoteToContributor(Long roomId, Long targetUserId) {
        User admin = getAuthenticatedUser();
        Room room = roomRepository.findById(roomId).orElseThrow();
        if (!room.getOwner().getId().equals(admin.getId())) throw new RuntimeException("Unauthorized");

        RoomParticipant p = participantRepository.findByRoomAndUserId(room, targetUserId)
                .orElseThrow(() -> new RuntimeException("User not in room"));
        p.setRole(RoomParticipant.Role.CONTRIBUTOR);
        participantRepository.save(p);
    }

    @Transactional
    public Room endRoom(Long roomId) {
        User user = getAuthenticatedUser();
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        if (!room.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        if (room.getStatus() == Room.RoomStatus.ENDED) {
            return room; // already ended, avoid unnecessary update
        }

        room.setStatus(Room.RoomStatus.ENDED);
        room.setEndedAt(LocalDateTime.now());
        roomRepository.save(room);

        // 🔥 Notify all clients in real-time
        messagingTemplate.convertAndSend(
                "/topic/rooms/" + roomId,
                new RoomStatusMessage("ENDED", room.getOwner().getId())
        );

        return room;
    }

    @Transactional
    public Room resumeRoom(Long roomId) {
        User user = getAuthenticatedUser();
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        if (!room.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Unauthorized");
        }

        if (room.getStatus() == Room.RoomStatus.ACTIVE) {
            return room; // already active
        }

        room.setStatus(Room.RoomStatus.ACTIVE);
        room.setEndedAt(null);
        roomRepository.save(room);

        // 🔥 Notify all clients in real-time
        messagingTemplate.convertAndSend(
                "/topic/rooms/" + roomId,
                new RoomStatusMessage("ACTIVE", room.getOwner().getId())
        );

        return room;
    }

    public RoomDto getRoomDto(Long roomId) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        return new RoomDto(
                room.getId(),
                room.getOwner().getId(),
                room.getStatus().name(),
                room.getName()
        );
    }
}