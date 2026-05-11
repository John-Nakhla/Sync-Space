package com.example.syncspacebackend.services;

import com.example.syncspacebackend.dtos.PromotionEvent;
import com.example.syncspacebackend.models.RoomParticipant;
import com.example.syncspacebackend.repositories.RoomParticipantRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@RequiredArgsConstructor
public class PromotionService {

    private final RoomParticipantRepository roomParticipantRepository;
    private final SimpMessagingTemplate messagingTemplate;

    @Transactional
    public PromotionEvent promote(Long roomId, Long requesterId, Long targetUserId) {

        // Verify requester is the admin (your enum uses ADMIN, not HOST)
        RoomParticipant requester = roomParticipantRepository
                .findByUserIdAndRoomId(requesterId, roomId)
                .orElseThrow(() -> new RuntimeException("Requester not in room"));

        if (requester.getRole() != RoomParticipant.Role.ADMIN) {
            throw new RuntimeException("Only the admin can promote participants");
        }

        // Promote the target participant
        RoomParticipant target = roomParticipantRepository
                .findByUserIdAndRoomId(targetUserId, roomId)
                .orElseThrow(() -> new RuntimeException("Target user not in room"));

        target.setRole(RoomParticipant.Role.CONTRIBUTOR);
        roomParticipantRepository.save(target);

        // Build the event
        PromotionEvent event = PromotionEvent.builder()
                .userId(targetUserId)
                .username(target.getUser().getUsername())
                .newRole("CONTRIBUTOR")
                .build();

        // Broadcast to all clients in the room — the promoted user's frontend
        // detects their own username and enables drawing without a page reload.
        messagingTemplate.convertAndSend(
                "/topic/room/" + roomId + "/promotions",
                event
        );

        return event;
    }
}