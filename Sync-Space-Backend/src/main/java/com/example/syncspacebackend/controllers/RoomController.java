package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.models.*;
import com.example.syncspacebackend.services.RoomService;
import com.example.syncspacebackend.services.RoomSessionService;
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

    private final RoomService        roomService;
    private final RoomSessionService roomSessionService;
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
        Room room = roomService.joinRoomByCode(joinCode);
        // Explicitly cast the Map to Object to resolve ambiguity
        messaging.convertAndSend("/topic/room/" + room.getId(),
                (Object) Map.of("type", "MEMBER_JOINED", "roomId", room.getId()));
        return ResponseEntity.ok(room);
    }

    @GetMapping("/{roomId}")
    public ResponseEntity<Room> getRoom(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomService.getRoomForEntry(roomId));
    }

    @GetMapping("/{roomId}/members")
    public ResponseEntity<List<MemberResponse>> getMembers(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomService.getRoomMembers(roomId));
    }

    @PostMapping("/{roomId}/admin-enter")
    public ResponseEntity<Void> adminEnter(@PathVariable Long roomId) {
        roomService.verifyAdmin(roomId);
        roomSessionService.adminEntered(roomId);
        // Cast applied here
        messaging.convertAndSend("/topic/room/" + roomId,
                (Object) Map.of("type", "ADMIN_ENTERED", "roomId", roomId));
        return ResponseEntity.ok().build();
    }

    @PostMapping("/{roomId}/admin-leave")
    public ResponseEntity<Void> adminLeave(@PathVariable Long roomId) {
        roomSessionService.adminLeft(roomId);
        return ResponseEntity.ok().build();
    }

    @GetMapping("/{roomId}/admin-present")
    public ResponseEntity<Map<String, Boolean>> adminPresent(@PathVariable Long roomId) {
        return ResponseEntity.ok(Map.of("adminPresent", roomSessionService.isAdminPresent(roomId)));
    }

    @PostMapping("/{roomId}/close")
    public ResponseEntity<Void> closeRoom(@PathVariable Long roomId) {
        roomService.closeRoom(roomId);
        roomSessionService.adminLeft(roomId);
        // Cast applied here
        messaging.convertAndSend("/topic/room/" + roomId,
                (Object) Map.of("type", "CLOSE_SIGNAL", "roomId", roomId));
        return ResponseEntity.ok().build();
    }

    @PatchMapping("/{roomId}/promote/{userId}")
    public ResponseEntity<Void> promoteUser(@PathVariable Long roomId, @PathVariable Long userId) {
        String username = roomService.promoteParticipant(roomId, userId);
        // Cast applied here
        messaging.convertAndSend("/topic/room/" + roomId,
                (Object) Map.of("type",     "ROLE_UPDATED",
                       "roomId",   roomId,
                       "userId",   userId,
                       "username", username));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{roomId}/remove/{userId}")
    public ResponseEntity<Void> removeUser(@PathVariable Long roomId, @PathVariable Long userId) {
        roomService.removeParticipant(roomId, userId);
        // Cast applied here
        messaging.convertAndSend("/topic/room/" + roomId,
                (Object) Map.of("type", "KICK_SIGNAL", "roomId", roomId, "userId", userId));
        return ResponseEntity.ok().build();
    }

    @DeleteMapping("/{roomId}/leave")
    public ResponseEntity<Void> leaveRoom(@PathVariable Long roomId) {
        RoomService.LeaveResult result = roomService.leaveRoom(roomId);
        // Cast applied here
        messaging.convertAndSend("/topic/room/" + roomId,
                (Object) Map.of("type",     "MEMBER_LEFT",
                       "roomId",   roomId,
                       "userId",   result.userId(),
                       "username", result.username()));
        return ResponseEntity.ok().build();
    }
}