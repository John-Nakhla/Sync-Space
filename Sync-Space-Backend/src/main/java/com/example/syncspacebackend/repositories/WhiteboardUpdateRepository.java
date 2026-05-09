package com.example.syncspacebackend.repositories;

import com.example.syncspacebackend.models.WhiteboardUpdate;
import com.example.syncspacebackend.models.WhiteboardUpdateId;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import java.util.List;

@Repository
public interface WhiteboardUpdateRepository extends JpaRepository<WhiteboardUpdate, WhiteboardUpdateId> {
    // Gets ALL updates for a room, sorted oldest → newest.
    // Finds all updates for a room, ordered by version so Yjs can apply them in the exact right order
    List<WhiteboardUpdate> findByIdRoomIdOrderByIdVersionAsc(Long roomId);

    // Finds only updates that happened AFTER a specific snapshot version
    // Gets only updates after a snapshot version
    List<WhiteboardUpdate> findByIdRoomIdAndIdVersionGreaterThanOrderByIdVersionAsc(Long roomId, Long version);
}