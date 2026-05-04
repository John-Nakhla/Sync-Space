package com.example.syncspacebackend.services;

import com.example.syncspacebackend.models.UserRoomResponse;
import com.example.syncspacebackend.models.*;
import com.example.syncspacebackend.repositories.*;
import com.example.syncspacebackend.security.UserPrincipal;
import lombok.RequiredArgsConstructor;
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

    private User getAuthenticatedUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || auth.getPrincipal().equals("anonymousUser")) {
            throw new RuntimeException("User not authenticated");
        }
        UserPrincipal principal = (UserPrincipal) auth.getPrincipal();
        return userRepository.getReferenceById(principal.getId());
    }

    @Transactional(readOnly = true)
    public List<UserRoomResponse> getAuthenticatedUserRooms() {
        User user = getAuthenticatedUser();
        return participantRepository.findAllByUserId(user.getId()).stream()
                .map(participant -> new UserRoomResponse(
                        participant.getRoom().getId(),
                        participant.getRoom().getName(),
                        participant.getRoom().getDescription(),
                        participant.getRole()
                ))
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
                .createdAt(LocalDateTime.now())
                .build();

        Room savedRoom = roomRepository.save(room);
        participantRepository.save(RoomParticipant.builder()
                .room(savedRoom).user(owner).role(RoomParticipant.Role.ADMIN).build());
        return savedRoom;
    }

    @Transactional
    public String joinRoom(String joinCode) {
        User user = getAuthenticatedUser();
        Room room = roomRepository.findByJoinCode(joinCode)
                .orElseThrow(() -> new RuntimeException("Invalid Room Code!"));

        if (room.getStatus() == Room.RoomStatus.ENDED) throw new RuntimeException("Room ended");
        if (participantRepository.existsByRoomAndUser(room, user)) return "Already in room";

        participantRepository.save(RoomParticipant.builder()
                .room(room).user(user).role(RoomParticipant.Role.MEMBER).build());
        return room.getName();
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
        Room room = roomRepository.findById(roomId).orElseThrow();
        if (!room.getOwner().getId().equals(user.getId())) throw new RuntimeException("Unauthorized");
        room.setStatus(Room.RoomStatus.ENDED);
        room.setEndedAt(LocalDateTime.now());
        return roomRepository.save(room);
    }

    @Transactional
    public Room resumeRoom(Long roomId) {
        User user = getAuthenticatedUser();
        Room room = roomRepository.findById(roomId).orElseThrow();
        if (!participantRepository.existsByRoomAndUser(room, user)) throw new RuntimeException("Denied");
        if (room.getStatus() == Room.RoomStatus.ENDED) {
            room.setStatus(Room.RoomStatus.ACTIVE);
            room.setEndedAt(null);
            roomRepository.save(room);
        }
        return room;
    }
}