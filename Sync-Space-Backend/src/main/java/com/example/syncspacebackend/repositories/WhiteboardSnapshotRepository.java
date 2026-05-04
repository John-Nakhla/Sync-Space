package com.example.syncspacebackend.repositories;

import com.example.syncspacebackend.models.WhiteboardSnapshot;
import com.example.syncspacebackend.models.WhiteboardSnapshotId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface WhiteboardSnapshotRepository extends JpaRepository<WhiteboardSnapshot, WhiteboardSnapshotId> {
    // Grabs the most recent snapshot for a room to speed up loading
    Optional<WhiteboardSnapshot> findTopByIdRoomIdOrderByIdVersionDesc(Long roomId);
}