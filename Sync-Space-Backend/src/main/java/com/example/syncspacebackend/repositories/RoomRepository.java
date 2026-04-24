package com.example.syncspacebackend.repositories;

import com.example.syncspacebackend.models.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    
    // NEW: Method to find a room by its join code
    Optional<Room> findByJoinCode(String joinCode);
}