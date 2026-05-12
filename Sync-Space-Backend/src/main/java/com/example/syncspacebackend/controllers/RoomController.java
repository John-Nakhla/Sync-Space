package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.models.RoomDto;
import com.example.syncspacebackend.models.RoomParticipant;
import com.example.syncspacebackend.models.UserRoomResponse;
import com.example.syncspacebackend.models.MemberResponse;
import com.example.syncspacebackend.models.Room;
import com.example.syncspacebackend.models.RoomRequest;
import com.example.syncspacebackend.services.RoomService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;

    @GetMapping("/my-rooms")
    public ResponseEntity<List<UserRoomResponse>> getMyRooms() {
        return ResponseEntity.ok(roomService.getAuthenticatedUserRooms());
    }

    @PostMapping("/create")
    public ResponseEntity<Room> createRoom(@RequestBody RoomRequest request) {
        return ResponseEntity.ok(roomService.createRoom(request.getName(), request.getDescription()));
    }

    @PostMapping("/join/{code}")
    public ResponseEntity<String> joinRoomByCode(@PathVariable String code) {
        return ResponseEntity.ok(roomService.joinRoom(code));
    }

    @PatchMapping("/{roomId}/promote/{userId}")
    public ResponseEntity<String> promoteUser(
            @PathVariable Long roomId,
            @PathVariable Long userId) {
        roomService.promoteToContributor(roomId, userId);
        return ResponseEntity.ok("User promoted to CONTRIBUTOR successfully!");
    }

    @PostMapping("/{roomId}/end")
    public ResponseEntity<Room> endRoom(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomService.endRoom(roomId));
    }

    @PostMapping("/{roomId}/resume")
    public ResponseEntity<Room> resumeRoom(@PathVariable Long roomId) {
        return ResponseEntity.ok(roomService.resumeRoom(roomId));
    }

    @GetMapping("/{roomId}")
    public RoomDto getRoom(@PathVariable Long roomId) {
        return roomService.getRoomDto(roomId);
    }

@GetMapping("/{roomId}/members")
public ResponseEntity<List<MemberResponse>> getRoomMembers(@PathVariable Long roomId) {
    return ResponseEntity.ok(roomService.getRoomMembers(roomId));
}
}