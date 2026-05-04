package com.example.syncspacebackend.repositories;

import com.example.syncspacebackend.models.Room;
import com.example.syncspacebackend.models.RoomParticipant;
import com.example.syncspacebackend.models.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface RoomParticipantRepository extends JpaRepository<RoomParticipant, Long> {

    List<Room> findRoomByUserId(Long userId);

    // Returns the participant records (useful if you need role/status info)
    List<RoomParticipant> findAllByUserId(Long userId);

    Optional<RoomParticipant> findByRoomAndUser(Room room, User user);
    
    // NEW: Find participant by Room and the User's ID (Required for Promotion)
    Optional<RoomParticipant> findByRoomAndUserId(Room room, Long userId);
    
    boolean existsByRoomAndUser(Room room, User user);
    boolean existsByUserIdAndRoomId(Long userId, Long roomId);
}