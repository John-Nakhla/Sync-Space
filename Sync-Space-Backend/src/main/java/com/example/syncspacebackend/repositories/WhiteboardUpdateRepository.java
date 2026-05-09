package com.example.syncspacebackend.repositories;

import com.example.syncspacebackend.models.WhiteboardUpdate;
import com.example.syncspacebackend.models.WhiteboardUpdateId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface WhiteboardUpdateRepository
        extends JpaRepository<WhiteboardUpdate, WhiteboardUpdateId> {

    // Fetches all updates for a room that came AFTER a given version.
    // Used on join to replay the deltas that are not yet covered by the
    // latest snapshot. Results are ordered ascending so they are applied
    // in the correct sequence on the client Y.Doc.
    //
    // Example: snapshot.version = 200, current = 247
    // → returns updates 201, 202, ... 247 in order
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
}