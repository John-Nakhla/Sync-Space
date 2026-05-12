package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.dtos.PromotionEvent;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.services.PromotionService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class PromotionController {

    private final PromotionService promotionService;

    // ── POST /api/rooms/{roomId}/participants/{userId}/promote ────────────────
    //
    // Called when the host clicks "Promote" next to a member in the Members panel.
    //
    // Flow:
    //  1. Verify the requester is the host of the room
    //  2. Update the target participant's role to CONTRIBUTOR in the DB
    //  3. Broadcast a STOMP message to /topic/room/{roomId}/promotions so ALL
    //     connected clients (including the promoted user) receive the event
    //     without any page refresh
    //
    // The promoted user's frontend receives the event, sees their own username,
    // flips canDraw = true, and shows the promotion toast.

    @PostMapping("/{roomId}/participants/{targetUserId}/promote")
    public ResponseEntity<PromotionEvent> promoteParticipant(
            @PathVariable Long roomId,
            @PathVariable Long targetUserId,
            @AuthenticationPrincipal User currentUser
    ) {
        PromotionEvent event = promotionService.promote(roomId, currentUser.getId(), targetUserId);
        return ResponseEntity.ok(event);
    }
}