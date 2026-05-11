package com.example.syncspacebackend.services;

import com.example.syncspacebackend.models.Room;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.models.WhiteboardSnapshot;
import com.example.syncspacebackend.models.WhiteboardUpdate;
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

    private final WhiteboardUpdateRepository updateRepository;
    private final WhiteboardSnapshotRepository snapshotRepository;

    /**
     * SAVE AN UPDATE: Call this when your WebSocket receives binary data from a user
     *
     * Flow:
     *  1. Get the next version number (safe for concurrent updates)
     *  2. Create and persist the WhiteboardUpdate
     *  3. Optionally trigger snapshot creation when version threshold is reached
     */
    @Transactional
    public void saveUpdate(Room room, User user, byte[] updateData) {
        // Get the next safe version number for this room
        // In production, use a database sequence or distributed counter (Redis/Zookeeper)
        Long nextVersion = getNextVersionNumberForRoom(room.getId());

        WhiteboardUpdate newUpdate = new WhiteboardUpdate(room, user, nextVersion, updateData);
        updateRepository.save(newUpdate);

        // Optional: Trigger snapshot creation every N updates
        // This prevents loading too many deltas on join
        if (nextVersion % 100 == 0) {
            triggerSnapshotCreation(room.getId());
        }
    }

    /**
     * LOAD THE BOARD: Call this when a user first connects to the room
     *
     * Returns the board state combining snapshot + deltas:
     *  - If snapshot exists: snapshot bytes + updates after snapshot version
     *  - If no snapshot: all updates since room creation
     *
     * The client will apply these in order to reconstruct the board state.
     */
    @Transactional(readOnly = true)
    public WhiteboardStateData getFullBoardState(Long roomId) {
        // Step A: Load the latest snapshot
        Optional<WhiteboardSnapshot> latestSnapshot = snapshotRepository.findLatestByRoomId(roomId);

        // Step B: Load delta updates
        List<WhiteboardUpdate> deltaUpdates;
        if (latestSnapshot.isPresent()) {
            // Load only updates AFTER the snapshot version
            long snapshotVersion = latestSnapshot.get().getVersion();
            deltaUpdates = updateRepository.findDeltaUpdates(roomId, snapshotVersion);
        } else {
            // No snapshot exists, load ALL updates since room creation
            deltaUpdates = updateRepository.findByIdRoomIdOrderByIdVersionAsc(roomId);
        }

        // Step C: Encode for transmission (client expects Base64 JSON)
        String snapshotDataBase64 = latestSnapshot
                .map(s -> java.util.Base64.getEncoder().encodeToString(s.getSnapshotData()))
                .orElse(null);

        List<String> deltaUpdatesBase64 = deltaUpdates.stream()
                .map(u -> java.util.Base64.getEncoder().encodeToString(u.getUpdateData()))
                .toList();

        return new WhiteboardStateData(snapshotDataBase64, deltaUpdatesBase64);
    }

    /**
     * Get the next safe version number for this room.
     * In a highly concurrent production app, use a database sequence instead of timestamps.
     */
    private Long getNextVersionNumberForRoom(Long roomId) {
        return System.currentTimeMillis();
    }

    /**
     * Trigger snapshot creation for a room.
     * Call this periodically to prevent the delta list from growing too large.
     */
    private void triggerSnapshotCreation(Long roomId) {
       
        // This should:
        //  1. Fetch the latest snapshot + all deltas
        //  2. Merge them into a single Y.Doc snapshot
        //  3. Save the new snapshot with the current version
        //  4. Optionally clean up old updates (keep recent ones for sync safety)
    }

    /**
     * Data transfer object for whiteboard state
     */
    public static class WhiteboardStateData {
        public final String snapshotData;
        public final List<String> deltaUpdates;

        public WhiteboardStateData(String snapshotData, List<String> deltaUpdates) {
            this.snapshotData = snapshotData;
            this.deltaUpdates = deltaUpdates;
        }
    }
}