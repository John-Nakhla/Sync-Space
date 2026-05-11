package com.example.syncspacebackend.services;

import com.example.syncspacebackend.models.Room;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.models.WhiteboardSnapshot;
import com.example.syncspacebackend.models.WhiteboardUpdate;
import com.example.syncspacebackend.repositories.RoomWhiteboardVersionRepository;
import com.example.syncspacebackend.repositories.WhiteboardSnapshotRepository;
import com.example.syncspacebackend.repositories.WhiteboardUpdateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WhiteboardPersistenceService {

    private final WhiteboardUpdateRepository   updateRepository;
    private final WhiteboardSnapshotRepository snapshotRepository;

    // FIX: Inject the version repository to use atomic DB-sequence-based versioning
    // instead of System.currentTimeMillis(), which has a race condition under
    // concurrent saves (two saves in the same millisecond produce the same PK).
    private final RoomWhiteboardVersionRepository versionRepository;

    /**
     * SAVE AN UPDATE
     *
     * Called when the frontend posts a new binary Yjs update.
     *
     * FIX: Version is now obtained via an atomic DB UPDATE … RETURNING query
     * (see RoomWhiteboardVersionRepository) instead of System.currentTimeMillis().
     * This guarantees uniqueness even under high concurrency.
     *
     * Snapshot trigger: every 100 updates we tell the caller to submit a snapshot.
     * The actual snapshot is submitted by the client via the /snapshot endpoint —
     * the server does not merge Yjs documents (no JVM Yjs library required).
     */
    @Transactional
    public void saveUpdate(Room room, User user, byte[] updateData) {
        // Atomically increment and fetch the next version for this room.
        // RoomWhiteboardVersionRepository.incrementAndGet uses a native query:
        //   UPDATE room_whiteboard_version
        //      SET current_version = current_version + 1
        //    WHERE room_id = :roomId
        //   RETURNING current_version
        Long nextVersion = versionRepository.incrementAndGet(room.getId());

        WhiteboardUpdate newUpdate = new WhiteboardUpdate(room, user, nextVersion, updateData);
        updateRepository.save(newUpdate);
    }

    /**
     * SAVE A SNAPSHOT
     *
     * Called when the client posts a full Y.encodeStateAsUpdate blob to the
     * /snapshot endpoint. This compresses all history up to the current version
     * into a single row, and deletes the now-redundant delta rows.
     *
     * The client should call this every ~100 strokes to keep delta lists short.
     *
     * FIX: Implements the previously empty triggerSnapshotCreation().
     */
    @Transactional
    public void saveSnapshot(Room room, byte[] snapshotData) {
        // Get the current version to tag the snapshot with
        Long currentVersion = versionRepository.getCurrentVersion(room.getId());

        // Save the snapshot
        WhiteboardSnapshot snapshot = new WhiteboardSnapshot(room, snapshotData, currentVersion);
        snapshotRepository.save(snapshot);

        // Delete all delta updates that are now covered by this snapshot.
        // Keep updates AFTER the snapshot version for any in-flight clients
        // that haven't caught up yet (safety margin).
        updateRepository.deleteByRoomIdAndVersionLessThanEqual(room.getId(), currentVersion);
    }

    /**
     * LOAD THE BOARD
     *
     * Returns the board state combining snapshot + deltas.
     * Used by WhiteboardService.getWhiteboardState().
     */
    @Transactional(readOnly = true)
    public WhiteboardStateData getFullBoardState(Long roomId) {
        Optional<WhiteboardSnapshot> latestSnapshot = snapshotRepository.findLatestByRoomId(roomId);

        List<WhiteboardUpdate> deltaUpdates;
        if (latestSnapshot.isPresent()) {
            long snapshotVersion = latestSnapshot.get().getVersion();
            deltaUpdates = updateRepository.findDeltaUpdates(roomId, snapshotVersion);
        } else {
            deltaUpdates = updateRepository.findByIdRoomIdOrderByIdVersionAsc(roomId);
        }

        String snapshotDataBase64 = latestSnapshot
                .map(s -> java.util.Base64.getEncoder().encodeToString(s.getSnapshotData()))
                .orElse(null);

        List<String> deltaUpdatesBase64 = deltaUpdates.stream()
                .map(u -> java.util.Base64.getEncoder().encodeToString(u.getUpdateData()))
                .toList();

        return new WhiteboardStateData(snapshotDataBase64, deltaUpdatesBase64);
    }

    public static class WhiteboardStateData {
        public final String snapshotData;
        public final List<String> deltaUpdates;

        public WhiteboardStateData(String snapshotData, List<String> deltaUpdates) {
            this.snapshotData = snapshotData;
            this.deltaUpdates = deltaUpdates;
        }
    }
}