package com.example.syncspacebackend.repositories;

import com.example.syncspacebackend.models.WhiteboardUpdate;
import com.example.syncspacebackend.models.WhiteboardUpdateId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Repository
public interface WhiteboardUpdateRepository extends JpaRepository<WhiteboardUpdate, WhiteboardUpdateId> {

    // All updates for a room, ordered by version ascending.
    // Used when no snapshot exists (brand new room — load all deltas).
    List<WhiteboardUpdate> findByIdRoomIdOrderByIdVersionAsc(Long roomId);

    // All updates after a given version (i.e. not yet covered by the snapshot).
    // Results ordered ascending so the client applies them in the correct sequence.
    //
    // Example: snapshot.version = 200, current = 247
    // → returns updates with version 201 … 247 in order
    @Query("""
            SELECT u FROM WhiteboardUpdate u
            WHERE u.room.id = :roomId
            AND u.id.version > :afterVersion
            ORDER BY u.id.version ASC
            """)
    List<WhiteboardUpdate> findDeltaUpdates(
            @Param("roomId") Long roomId,
            @Param("afterVersion") Long afterVersion
    );

    // NEW: Delete all updates covered by a snapshot.
    // Called after a snapshot is saved to prevent unbounded delta growth.
    // Only deletes updates with version ≤ snapshotVersion so any updates
    // that arrived between the snapshot capture and this delete are kept.
    @Modifying
    @Transactional
    @Query("""
            DELETE FROM WhiteboardUpdate u
            WHERE u.room.id = :roomId
            AND u.id.version <= :snapshotVersion
            """)
    void deleteByRoomIdAndVersionLessThanEqual(
            @Param("roomId") Long roomId,
            @Param("snapshotVersion") Long snapshotVersion
    );
}