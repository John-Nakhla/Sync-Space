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

    @Transactional
    public Room createRoom(String name, String description, User owner) {
        Room room = Room.builder()
                .name(name)
                .description(description) // NEW
                .owner(owner)
                .joinCode(generateJoinToken(null))
                .status(Room.RoomStatus.ACTIVE) // NEW: Defaults to ACTIVE
                .build();
        Room savedRoom = roomRepository.save(room);

        RoomParticipant admin = RoomParticipant.builder()
                .room(savedRoom)
                .user(owner)
                .role(RoomParticipant.Role.ADMIN)
                .build();
        participantRepository.save(admin);

        return savedRoom;
    }

    public String generateJoinToken(Long roomId) {
        return UUID.randomUUID().toString().substring(0, 8); 
    }

    @Transactional
    public void joinRoom(Room room, User user) {
        if (participantRepository.existsByRoomAndUser(room, user)) {
            throw new RuntimeException("User already in room");
        }
        RoomParticipant member = RoomParticipant.builder()
                .room(room)
                .user(user)
                .role(RoomParticipant.Role.MEMBER)
                .build();
        participantRepository.save(member);
    }

    @Transactional
    public void leaveRoom(Room room, User user) {
        RoomParticipant participant = participantRepository.findByRoomAndUser(room, user)
                .orElseThrow(() -> new RuntimeException("Participant not found"));
        participantRepository.delete(participant);
    }

    // NEW: Method to pause/end a room
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

        // NEW: Reactivate the room if it was ended
        if (room.getStatus() == Room.RoomStatus.ENDED) {
            room.setStatus(Room.RoomStatus.ACTIVE);
            room.setEndedAt(null); // Clear the end time since it's running again
            roomRepository.save(room);
        }

        return room;
    }
}