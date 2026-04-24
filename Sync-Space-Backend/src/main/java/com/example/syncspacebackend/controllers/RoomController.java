package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.models.Room;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.services.RoomService;
import com.example.syncspacebackend.repositories.UserRepository;
import com.example.syncspacebackend.repositories.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final UserRepository userRepository;
    private final RoomRepository roomRepository;

    @PostMapping("/create")
    public ResponseEntity<Room> createRoom(
            @RequestParam String name, 
            @RequestParam(required = false) String description, // NEW
            @RequestParam Long ownerId) {
            
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + ownerId));
        
        Room newRoom = roomService.createRoom(name, description, owner);
        return ResponseEntity.ok(newRoom);
    }

    @PostMapping("/join/{code}")
    public ResponseEntity<String> joinRoomByCode(@PathVariable String code, @RequestParam Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        Room room = roomRepository.findByJoinCode(code)
                .orElseThrow(() -> new RuntimeException("Invalid Room Code!"));

        roomService.joinRoom(room, user);
        return ResponseEntity.ok("Successfully joined the room: " + room.getName());
    }

    @GetMapping("/{roomId}/resume")
    public ResponseEntity<Room> resumeRoom(@PathVariable Long roomId, @RequestParam Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        Room room = roomService.resumeRoom(roomId, user);
        return ResponseEntity.ok(room);
    }

    // NEW ENDPOINT: End or Pause the room
    @PostMapping("/{roomId}/end")
    public ResponseEntity<Room> endRoom(@PathVariable Long roomId, @RequestParam Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        Room room = roomService.endRoom(roomId, user);
        return ResponseEntity.ok(room);
    }
}