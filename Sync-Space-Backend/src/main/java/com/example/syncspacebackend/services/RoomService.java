package com.example.syncspacebackend.services;

import com.example.syncspacebackend.models.*;
import com.example.syncspacebackend.repositories.*;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class RoomService {

    private final RoomRepository roomRepository;
    private final RoomParticipantRepository participantRepository;

    @Transactional
    public Room createRoom(String name, User owner) {
        Room room = Room.builder()
                .name(name)
                .owner(owner)
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



    public Room resumeRoom(Long roomId, User user) {
        // 1. Find the room
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found"));

        // 2. Check if the user is a participant
        if (!participantRepository.existsByRoomAndUser(room, user)) {
            throw new RuntimeException("Access denied: You are not a member of this room");
        }

        return room;
    
}}