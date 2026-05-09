package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.models.*;
import com.example.syncspacebackend.services.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.web.bind.annotation.*;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final SimpMessagingTemplate messaging;

    @GetMapping("/my-rooms")
    public ResponseEntity<List<UserRoomResponse>> getMyRooms() {
        return ResponseEntity.ok(roomService.getAuthenticatedUserRooms());
    }

    @PostMapping("/create")
    public ResponseEntity<Room> createRoom(@RequestBody RoomRequest request) {
        return ResponseEntity.ok(roomService.createRoom(request));
    }

    @PostMapping("/join/{joinCode}")
    public ResponseEntity<Room> joinRoom(@PathVariable String joinCode) {
        return ResponseEntity.ok(roomService.joinRoomByCode(joinCode));
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<Room> getRoom(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomService.getRoomForEntry(roomId));
    }

    @GetMapping("/{roomId}/members")
    public ResponseEntity<List<MemberResponse>> getMembers(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomService.getRoomMembers(roomId));
    }

    @PostMapping("/{roomId}/start")
    public ResponseEntity<Void> startRoom(@PathVariable Long roomId) {
        roomService.startRoomSession(roomId);
        messaging.convertAndSend("/topic/room/" + roomId, (Object) Map.of("type", "START_SIGNAL", "roomId", roomId));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{roomId}/restart")
    public ResponseEntity<Void> restartRoom(@PathVariable Long roomId) {
        roomService.restartRoom(roomId);
        messaging.convertAndSend("/topic/room/" + roomId, (Object) Map.of("type", "RESTART_SIGNAL", "roomId", roomId));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{roomId}/end")
    public ResponseEntity<Void> endRoom(@PathVariable Long roomId) {
        roomService.endRoom(roomId);
        messaging.convertAndSend("/topic/room/" + roomId, (Object) Map.of("type", "END_SIGNAL", "roomId", roomId));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{roomId}/promote/{userId}")
    public ResponseEntity<Void> promoteUser(@PathVariable Long roomId, @PathVariable Long userId) {
        roomService.promoteParticipant(roomId, userId);
        messaging.convertAndSend("/topic/room/" + roomId, (Object) Map.of(
            "type", "ROLE_UPDATED", "roomId", roomId, "userId", userId
        ));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{roomId}/remove/{userId}")
    public ResponseEntity<Void> removeUser(@PathVariable Long roomId, @PathVariable Long userId) {
        roomService.removeParticipant(roomId, userId);
        messaging.convertAndSend("/topic/room/" + roomId, (Object) Map.of(
            "type", "KICK_SIGNAL", "roomId", roomId, "userId", userId
        ));
        return ResponseEntity.ok().build();
    }
}