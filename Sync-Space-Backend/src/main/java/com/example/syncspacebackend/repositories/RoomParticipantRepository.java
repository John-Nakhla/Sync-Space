package com.example.syncspacebackend.repositories;

import com.example.syncspacebackend.models.*;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface RoomParticipantRepository extends JpaRepository<RoomParticipant, RoomParticipantId> {
    List<RoomParticipant> findAllByUserId(Long userId);
    List<RoomParticipant> findAllByRoom(Room room);
}