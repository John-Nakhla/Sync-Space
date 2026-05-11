package com.example.syncspacebackend.repositories;

import com.example.syncspacebackend.models.RoomWhiteboardVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RoomWhiteboardVersionRepository extends JpaRepository<RoomWhiteboardVersion, Long> {

    /**
     * Atomically increment the version counter for a room and return the new value.
     *
     * FIX: Replaces System.currentTimeMillis() in WhiteboardPersistenceService.
     *
     * The UPDATE … RETURNING is atomic at the DB level, so even if 100 clients
     * save a stroke in the same millisecond, each gets a unique, ordered version
     * number. No two WhiteboardUpdate rows for the same room will share a version.
     *
     * Note: This is a native query because JPQL does not support RETURNING.
     * Works on PostgreSQL. For MySQL, use SELECT … FOR UPDATE instead.
     *
     * Prerequisites:
     *   - A row must exist in room_whiteboard_version for every room.
     *   - Insert the row when the room is created:
     *       INSERT INTO room_whiteboard_version (room_id, current_version) VALUES (?, 0)
     */
    @Modifying
    @Query(
        value = """
            UPDATE room_whiteboard_version
               SET current_version = current_version + 1
             WHERE room_id = :roomId
            RETURNING current_version
            """,
        nativeQuery = true
    )
    Long incrementAndGet(@Param("roomId") Long roomId);

    /**
     * Read the current version without incrementing.
     * Used when saving a snapshot (we tag the snapshot with the current version,
     * not a new incremented one, because the snapshot represents existing state).
     */
    @Query(
        value = "SELECT current_version FROM room_whiteboard_version WHERE room_id = :roomId",
        nativeQuery = true
    )
    Long getCurrentVersion(@Param("roomId") Long roomId);
}