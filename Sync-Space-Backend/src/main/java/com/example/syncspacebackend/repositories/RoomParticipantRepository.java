package com.example.syncspacebackend.repositories;

import com.example.syncspacebackend.models.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface RoomParticipantRepository extends JpaRepository<RoomParticipant, RoomParticipantId> {
    List<RoomParticipant> findAllByUserId(Long userId);
    List<RoomParticipant> findAllByRoom(Room room);
    Optional<RoomParticipant> findByRoomAndUser(Room room, User user);
    Optional<RoomParticipant> findByRoomAndUserId(Room room, Long userId);
    boolean existsByRoomAndUser(Room room, User user);
}