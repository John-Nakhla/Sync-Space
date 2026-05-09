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
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface WhiteboardSnapshotRepository
        extends JpaRepository<WhiteboardSnapshot, WhiteboardSnapshotId> {

    // Fetches the most recent snapshot for a room.
    // "Most recent" = the one with the highest version number, meaning
    // it has absorbed the most updates. Used as the base state on join.
    @Query("""
            SELECT s FROM WhiteboardSnapshot s
            WHERE s.room.id = :roomId
            ORDER BY s.id.version DESC
            LIMIT 1
            """)
    Optional<WhiteboardSnapshot> findLatestByRoomId(@Param("roomId") Long roomId);
}