package com.example.syncspacebackend.controllers;

import com.example.syncspacebackend.models.Room;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.services.RoomService;
import com.example.syncspacebackend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final UserRepository userRepository;

    @PostMapping("/create")
    public ResponseEntity<Room> createRoom(@RequestParam String name, @RequestParam Long ownerId) {
        User owner = userRepository.findById(ownerId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + ownerId));
        
        Room newRoom = roomService.createRoom(name, owner);
        return ResponseEntity.ok(newRoom);
    }

    @GetMapping("/{roomId}/resume")
    public ResponseEntity<Room> resumeRoom(@PathVariable Long roomId, @RequestParam Long userId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found with ID: " + userId));

        Room room = roomService.resumeRoom(roomId, user);
        return ResponseEntity.ok(room);
    }
}