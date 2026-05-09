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

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WhiteboardPersistenceService {

    private final WhiteboardUpdateRepository updateRepo;
    private final WhiteboardSnapshotRepository snapshotRepo;
    private final RoomWhiteboardVersionRepository versionRepo;  // ← fixes the version bug

    // ── Save a single YJS update ──────────────────────────────────────────────
    // Called by the WebSocket handler every time a contributor sends a binary
    // YJS update. Atomically assigns the next version number then persists.
    @Transactional
    public Long saveUpdate(Room room, User user, byte[] updateData) {
        // Atomically increment — two concurrent updates ALWAYS get different numbers
        Long nextVersion = versionRepo.incrementAndGet(room.getId());

        WhiteboardUpdate newUpdate = new WhiteboardUpdate(room, user, nextVersion, updateData);
        updateRepo.save(newUpdate);

        return nextVersion; // returned so the WebSocket handler can broadcast it
    }

    // ── Load full board state for a joining user ──────────────────────────────
    // Returns all byte arrays the client needs to reconstruct the board:
    //   index 0        = snapshot bytes (may be empty array if no snapshot)
    //   index 1..N     = delta update bytes in version order
    //
    // The WebSocket handler sends these to the newly joined client.
    // The client applies them in order: Y.applyUpdate(ydoc, bytes[i])
    @Transactional(readOnly = true)
    public List<byte[]> getFullBoardState(Long roomId) {
        List<byte[]> result = new ArrayList<>();

        // Step A: latest snapshot — if present, add it first
        Optional<WhiteboardSnapshot> latestSnapshot =
                snapshotRepo.findTopByIdRoomIdOrderByIdVersionDesc(roomId);

        long afterVersion = 0L;
        if (latestSnapshot.isPresent()) {
            result.add(latestSnapshot.get().getSnapshotData());
            afterVersion = latestSnapshot.get().getVersion();
        }

        // Step B: all updates after the snapshot (or all updates if no snapshot)
        List<WhiteboardUpdate> deltas =
                updateRepo.findByIdRoomIdAndIdVersionGreaterThanOrderByIdVersionAsc(
                        roomId, afterVersion
                );

        deltas.forEach(u -> result.add(u.getUpdateData()));

        return result; // WebSocket handler iterates and sends each byte[] to client
    }

    // ── Save a snapshot ───────────────────────────────────────────────────────
    // Called by the snapshot scheduler (every 100 updates or on a timer).
    // snapshotData = Y.encodeStateAsUpdate(serverYDoc)
    // currentVersion = the latest version number at the moment of snapshotting
    @Transactional
    public void saveSnapshot(Room room, byte[] snapshotData, Long currentVersion) {
        WhiteboardSnapshot snapshot =
                new WhiteboardSnapshot(room, snapshotData, currentVersion);
        snapshotRepo.save(snapshot);
    }
}