package com.example.syncspacebackend.repositories;

import com.example.syncspacebackend.models.Room;
import com.example.syncspacebackend.models.RoomParticipant;
import com.example.syncspacebackend.models.User; // Critical Import
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface RoomParticipantRepository extends JpaRepository<RoomParticipant, Long> {
    Optional<RoomParticipant> findByRoomAndUser(Room room, User user);
    boolean existsByRoomAndUser(Room room, User user);
}