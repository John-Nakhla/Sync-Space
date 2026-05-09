package com.example.syncspacebackend.repositories;

import com.example.syncspacebackend.models.RoomWhiteboardVersion;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

@Repository
public interface RoomWhiteboardVersionRepository
        extends JpaRepository<RoomWhiteboardVersion, Long> {

    // Atomically increments the version counter for the room and returns
    // the new value. The database processes this as one indivisible operation
    // so two concurrent updates always get different version numbers.
    //
    // INSERT ... ON CONFLICT handles the first-ever update for a room:
    // if no row exists yet, it creates one starting at version 1.
    @Modifying
    @Query(value = """
            INSERT INTO room_whiteboard_version (room_id, current_version)
            VALUES (:roomId, 1)
            ON CONFLICT (room_id)
            DO UPDATE SET current_version = room_whiteboard_version.current_version + 1
            RETURNING current_version
            """, nativeQuery = true)
    Long incrementAndGet(@Param("roomId") Long roomId);
}