package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.models.RoomRequest;
import com.example.syncspacebackend.models.Room;
import com.example.syncspacebackend.services.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @PostMapping("/create")
    public ResponseEntity<Room> createRoom(@RequestBody RoomRequest request) {
        // Data comes from Body; Identity comes from Token (inside Service)
        return ResponseEntity.ok(roomService.createRoom(request.getName(), request.getDescription()));
    }

    @PostMapping("/join/{code}")
    public ResponseEntity<String> joinRoomByCode(@PathVariable String code) {
        // No userId param needed!
        return ResponseEntity.ok(roomService.joinRoom(code));
    }

    @PatchMapping("/{roomId}/promote/{userId}")
    public ResponseEntity<String> promoteUser(
            @PathVariable Long roomId,
            @PathVariable Long userId) {

        // adminId is handled automatically in the service
        roomService.promoteToContributor(roomId, userId);
        return ResponseEntity.ok("User promoted to CONTRIBUTOR successfully!");
    }

    @PostMapping("/{roomId}/end")
    public ResponseEntity<Room> endRoom(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomService.endRoom(roomId));
    }

    @GetMapping("/{roomId}/resume")
    public ResponseEntity<Room> resumeRoom(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomService.resumeRoom(roomId));
    }
}