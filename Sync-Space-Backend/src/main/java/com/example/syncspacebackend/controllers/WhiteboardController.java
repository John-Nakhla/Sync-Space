package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.dtos.WhiteboardStateResponse;
import com.example.syncspacebackend.security.UserPrincipal;
import com.example.syncspacebackend.services.WhiteboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class WhiteboardController {

    private final WhiteboardService whiteboardService;

    @GetMapping("/{roomId}/whiteboard/state")
    public ResponseEntity<WhiteboardStateResponse> getWhiteboardState(
            @PathVariable Long roomId,
            @AuthenticationPrincipal UserPrincipal principal // ✅ FIX: Use UserPrincipal
    ) {
        WhiteboardStateResponse state =
                whiteboardService.getWhiteboardState(roomId, principal.getId());
        return ResponseEntity.ok(state);
    }

    // ✅ FIX: Included the POST endpoint to save drawing strokes securely
    @PostMapping(value = "/{roomId}/whiteboard/update", consumes = "application/octet-stream")
    public ResponseEntity<Void> saveWhiteboardUpdate(
            @PathVariable Long roomId,
            @AuthenticationPrincipal UserPrincipal principal, // ✅ FIX: Use UserPrincipal
            @RequestBody byte[] updateData) {
        
        whiteboardService.saveWhiteboardUpdate(roomId, principal.getId(), updateData);
        return ResponseEntity.ok().build();
    }
}