package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.dtos.WhiteboardStateResponse;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.services.WhiteboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class WhiteboardController {

    private final WhiteboardService whiteboardService;

    // ── GET /api/rooms/{roomId}/whiteboard/state ──────────────────────────────
    //
    // Called by the frontend immediately when a participant opens the whiteboard.
    // Returns the full board state the client needs to reconstruct the canvas:
    //   - snapshotData   : base64 YJS snapshot (the heavy base state)
    //   - deltaUpdates   : base64 list of updates applied on top of snapshot
    //   - version        : the version this response represents
    //   - readOnly       : true if room is ENDED, frontend disables drawing tools
    //
    // Security: JWT is validated by the filter chain before this runs.
    //           @AuthenticationPrincipal injects the logged-in user automatically.
    //           The service then verifies that user is actually in this room.

    @GetMapping("/{roomId}/whiteboard/state")
    public ResponseEntity<WhiteboardStateResponse> getWhiteboardState(
            @PathVariable Long roomId,
            @AuthenticationPrincipal User currentUser
    ) {
        WhiteboardStateResponse state =
                whiteboardService.getWhiteboardState(roomId, currentUser.getId());
        return ResponseEntity.ok(state);
    }
}