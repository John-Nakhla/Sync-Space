package com.example.syncspacebackend.repositories;

import com.example.syncspacebackend.models.Room;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

// This one is already good! No changes needed.
@Repository
public interface RoomRepository extends JpaRepository<Room, Long> {
    Optional<Room> findByJoinCode(String joinCode);
}