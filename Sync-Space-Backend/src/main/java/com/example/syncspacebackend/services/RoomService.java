package com.example.syncspacebackend.services;

import com.example.syncspacebackend.models.*;
import com.example.syncspacebackend.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomParticipantRepository participantRepository;
    private final UserRepository userRepository; // Added to find users by ID

    @Transactional
    public Room createRoom(String name, String description, User owner) {
        Room room = Room.builder()
                .name(name)
                .description(description)
                .owner(owner)
                .joinCode(generateJoinToken())
                .status(Room.RoomStatus.ACTIVE)
                .createdAt(LocalDateTime.now())
                .build();
        Room savedRoom = roomRepository.save(room);

        // The creator is ALWAYS the ADMIN
        RoomParticipant admin = RoomParticipant.builder()
                .room(savedRoom)
                .user(owner)
                .role(RoomParticipant.Role.ADMIN)
                .build();
        participantRepository.save(admin);

        return savedRoom;
    }

    public String generateJoinToken() {
        return UUID.randomUUID().toString().substring(0, 8); 
    }

    @Transactional
    public String joinRoom(String joinCode, Long userId) {
        // Find room by code (useful for URL/Terminal joins)
        Room room = roomRepository.findByJoinCode(joinCode)
                .orElseThrow(() -> new RuntimeException("Invalid Room Code!"));

        // Find user by ID
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        if (room.getStatus() == Room.RoomStatus.ENDED) {
            throw new RuntimeException("Cannot join an ended room");
        }

        if (participantRepository.existsByRoomAndUser(room, user)) {
            return "User already in room: " + room.getName();
        }

        // Others joining via code/URL are ALWAYS MEMBERs by default
        RoomParticipant member = RoomParticipant.builder()
                .room(room)
                .user(user)
                .role(RoomParticipant.Role.MEMBER)
                .build();
        participantRepository.save(member);
        
        return room.getName();
    }

    // NEW: Promotion Logic
    @Transactional
    public void promoteToContributor(Long roomId, Long targetUserId, User adminUser) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        // Security Check: Is the person promoting actually the owner?
        if (!room.getOwner().getId().equals(adminUser.getId())) {
            throw new RuntimeException("Only the owner can promote members");
        }

        RoomParticipant participant = participantRepository.findByRoomAndUserId(room, targetUserId)
                .orElseThrow(() -> new RuntimeException("Target user is not in this room"));

        participant.setRole(RoomParticipant.Role.CONTRIBUTOR);
        participantRepository.save(participant);
    }

    @Transactional
    public void leaveRoom(Room room, User user) {
        RoomParticipant participant = participantRepository.findByRoomAndUser(room, user)
                .orElseThrow(() -> new RuntimeException("Participant not found"));
        participantRepository.delete(participant);
    }

    @Transactional
    public Room endRoom(Long roomId, User user) {
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
    public Room resumeRoom(Long roomId, User user) {
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

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