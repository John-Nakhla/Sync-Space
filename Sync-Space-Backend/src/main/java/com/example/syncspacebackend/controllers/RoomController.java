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
            @RequestParam(required = false) String description,
            @RequestParam Long ownerId) {
            
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + ownerId));
        
        Room newRoom = roomService.createRoom(name, description, owner);
        return ResponseEntity.ok(newRoom);
    }

    // UPDATED: Now calls roomService.joinRoom with String code and Long userId
    @PostMapping("/join/{code}")
    public ResponseEntity<String> joinRoomByCode(
            @PathVariable String code, 
            @RequestParam Long userId) {
        
        String result = roomService.joinRoom(code, userId);
        return ResponseEntity.ok(result);
    }

    // NEW: The Promotion Endpoint
    @PatchMapping("/{roomId}/promote/{userId}")
    public ResponseEntity<String> promoteUser(
            @PathVariable Long roomId, 
            @PathVariable Long userId, 
            @RequestParam Long adminId) {
            
        User admin = userRepository.findById(adminId)
                .orElseThrow(() -> new RuntimeException("Admin not found"));
        
        roomService.promoteToContributor(roomId, userId, admin);
        return ResponseEntity.ok("User promoted to CONTRIBUTOR successfully!");
    }

    @PostMapping("/{roomId}/end")
    public ResponseEntity<Room> endRoom(
            @PathVariable Long roomId, 
            @RequestParam Long userId) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Room room = roomService.endRoom(roomId, user);
        return ResponseEntity.ok(room);
    }

    @GetMapping("/{roomId}/resume")
    public ResponseEntity<Room> resumeRoom(
            @PathVariable Long roomId, 
            @RequestParam Long userId) {
        
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found"));

        Room room = roomService.resumeRoom(roomId, user);
        return ResponseEntity.ok(room);
    }
}