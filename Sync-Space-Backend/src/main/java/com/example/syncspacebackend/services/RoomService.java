package com.example.syncspacebackend.services;

import com.example.syncspacebackend.models.*;
import com.example.syncspacebackend.repositories.*;
import com.example.syncspacebackend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomParticipantRepository participantRepository;
    private final UserRepository userRepository;

    /**
     * Internal helper to extract the User from the Security Context
     */
    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            throw new RuntimeException("User not authenticated");
        }

        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        // getReferenceById is efficient as it doesn't hit the DB if you only need the ID for FKs
        return userRepository.getReferenceById(principal.getId());
    }

    @Transactional
    public Room createRoom(String name, String description) {
        User owner = getAuthenticatedUser();

        Room room = Room.builder()
                .name(name)
                .description(description)
                .owner(owner)
                .joinCode(generateJoinToken())
                .status(Room.RoomStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();

        Room savedRoom = roomRepository.save(room);

        // Auto-assign creator as ADMIN
        RoomParticipant admin = RoomParticipant.builder()
                .room(savedRoom)
                .user(owner)
                .role(RoomParticipant.Role.ADMIN)
                .build();
        participantRepository.save(admin);

        return savedRoom;
    }

    private String generateJoinToken() {
        return UUID.randomUUID().toString().substring(0, 8);
    }

    @Transactional
    public String joinRoom(String joinCode) {
        User user = getAuthenticatedUser();

        Room room = roomRepository.findByJoinCode(joinCode)
                .orElseThrow(() -> new RuntimeException("Invalid Room Code!"));

        if (room.getStatus() == Room.RoomStatus.ENDED) {
            throw new RuntimeException("Cannot join an ended room");
        }

        if (participantRepository.existsByRoomAndUser(room, user)) {
            return "User already in room: " + room.getName();
        }

        RoomParticipant member = RoomParticipant.builder()
                .room(room)
                .user(user)
                .role(RoomParticipant.Role.MEMBER)
                .build();
        participantRepository.save(member);

        return room.getName();
    }

    @Transactional
    public void promoteToContributor(Long roomId, Long targetUserId) {
        User adminUser = getAuthenticatedUser();

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        // Only the owner (Admin) can promote others
        if (!room.getOwner().getId().equals(adminUser.getId())) {
            throw new RuntimeException("Only the owner can promote members");
        }

        RoomParticipant participant = participantRepository.findByRoomAndUserId(room, targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user is not in this room"));

        participant.setRole(RoomParticipant.Role.CONTRIBUTOR);
        participantRepository.save(participant);
    }

    @Transactional
    public Room endRoom(Long roomId) {
        User user = getAuthenticatedUser();

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        if (!room.getOwner().getId().equals(user.getId())) {
            throw new RuntimeException("Only the owner can end the room");
        }

        room.setStatus(Room.RoomStatus.ENDED);
        room.setEndedAt(LocalDateTime.now());
        return roomRepository.save(room);
    }

    @Transactional
    public Room resumeRoom(Long roomId) {
        User user = getAuthenticatedUser();

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        // Check if the user trying to resume has access to this room
        if (!participantRepository.existsByRoomAndUser(room, user)) {
            throw new RuntimeException("Access denied: You are not a member of this room");
        }

        if (room.getStatus() == Room.RoomStatus.ENDED) {
            room.setStatus(Room.RoomStatus.ACTIVE);
            room.setEndedAt(null);
            roomRepository.save(room);
        }

        return room;
    }
}