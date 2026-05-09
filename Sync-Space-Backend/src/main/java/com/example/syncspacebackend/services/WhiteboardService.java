package com.example.syncspacebackend.services;

import com.example.syncspacebackend.dtos.WhiteboardStateResponse;
import com.example.syncspacebackend.models.Room;
import com.example.syncspacebackend.models.RoomParticipant;
import com.example.syncspacebackend.models.WhiteboardSnapshot;
import com.example.syncspacebackend.models.WhiteboardUpdate;
import com.example.syncspacebackend.repositories.RoomParticipantRepository;
import com.example.syncspacebackend.repositories.RoomRepository;
import com.example.syncspacebackend.repositories.WhiteboardSnapshotRepository;
import com.example.syncspacebackend.repositories.WhiteboardUpdateRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Base64;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
public class WhiteboardService {

    private final RoomRepository roomRepository;
    private final RoomParticipantRepository roomParticipantRepository;
    private final WhiteboardSnapshotRepository snapshotRepository;
    private final WhiteboardUpdateRepository updateRepository;

    // ── Get whiteboard state on join ──────────────────────────────────────────
    //
    // Flow:
    //  1. Verify the room exists
    //  2. Verify the requesting user is actually a participant of this room
    //  3. Load the latest snapshot (may be absent for brand-new rooms)
    //  4. Load all delta updates that came after the snapshot's version
    //  5. Return snapshot + deltas + readOnly flag to the controller
    //
    // The client will:
    //  a. Apply snapshotData to its local Y.Doc  (if present)
    //  b. Apply each deltaUpdate in order        (if any)
    //  c. Lock the canvas if readOnly = true

    public WhiteboardStateResponse getWhiteboardState(Long roomId, Long userId) {

        // ── Step 1: Room must exist ───────────────────────────────────────────
        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        // ── Step 2: User must be a participant ────────────────────────────────
        roomParticipantRepository.findByUserIdAndRoomId(userId, roomId)
                .orElseThrow(() -> new RuntimeException(
                        "User " + userId + " is not a participant of room " + roomId));

        // ── Step 3: Load latest snapshot (may be empty for new rooms) ─────────
        Optional<WhiteboardSnapshot> latestSnapshot =
                snapshotRepository.findLatestByRoomId(roomId);

        // The version the snapshot covers. If no snapshot exists yet, use 0
        // so that the delta query fetches ALL updates from the beginning.
        long snapshotVersion = latestSnapshot
                .map(WhiteboardSnapshot::getVersion)
                .orElse(0L);

        // Encode snapshot bytes to Base64 for JSON transport.
        // Null if no snapshot exists — client handles this case gracefully.
        String snapshotData = latestSnapshot
                .map(s -> Base64.getEncoder().encodeToString(s.getSnapshotData()))
                .orElse(null);

        // ── Step 4: Load delta updates after the snapshot ─────────────────────
        List<WhiteboardUpdate> deltas =
                updateRepository.findDeltaUpdates(roomId, snapshotVersion);

        // Encode each binary update to Base64 — same reason as snapshot above.
        List<String> deltaUpdates = deltas.stream()
                .map(u -> Base64.getEncoder().encodeToString(u.getUpdateData()))
                .toList();

        // The "current version" is the highest version we are returning.
        // If there are deltas, it's the last delta's version.
        // If no deltas, it's the snapshot version.
        // If neither, it's 0 (brand-new room, empty board).
        long currentVersion = deltas.isEmpty()
                ? snapshotVersion
                : deltas.getLast().getVersion();

        // ── Step 5: Determine read-only based on room status ──────────────────
        boolean readOnly = room.getStatus() == Room.RoomStatus.ENDED;

        return WhiteboardStateResponse.builder()
                .version(currentVersion)
                .snapshotData(snapshotData)
                .deltaUpdates(deltaUpdates)
                .readOnly(readOnly)
                .build();
    }
}