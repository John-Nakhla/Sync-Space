package com.example.syncspacebackend.services;

import com.example.syncspacebackend.dtos.WhiteboardStateResponse;
import com.example.syncspacebackend.models.Room;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.models.WhiteboardSnapshot;
import com.example.syncspacebackend.models.WhiteboardUpdate;
import com.example.syncspacebackend.repositories.RoomParticipantRepository;
import com.example.syncspacebackend.repositories.RoomRepository;
import com.example.syncspacebackend.repositories.WhiteboardSnapshotRepository;
import com.example.syncspacebackend.repositories.WhiteboardUpdateRepository;
import com.example.syncspacebackend.repositories.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final UserRepository userRepository;
    private final WhiteboardPersistenceService persistenceService;

    // ── Get whiteboard state on join ──────────────────────────────────────────
    public WhiteboardStateResponse getWhiteboardState(Long roomId, Long userId) {

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        roomParticipantRepository.findByUserIdAndRoomId(userId, roomId)
                .orElseThrow(() -> new RuntimeException(
                        "User " + userId + " is not a participant of room " + roomId));

        Optional<WhiteboardSnapshot> latestSnapshot =
                snapshotRepository.findLatestByRoomId(roomId);

        long snapshotVersion = latestSnapshot
                .map(WhiteboardSnapshot::getVersion)
                .orElse(0L);

        String snapshotData = latestSnapshot
                .map(s -> Base64.getEncoder().encodeToString(s.getSnapshotData()))
                .orElse(null);

        List<WhiteboardUpdate> deltas =
                updateRepository.findDeltaUpdates(roomId, snapshotVersion);

        List<String> deltaUpdates = deltas.stream()
                .map(u -> Base64.getEncoder().encodeToString(u.getUpdateData()))
                .toList();

        long currentVersion = deltas.isEmpty()
                ? snapshotVersion
                : deltas.getLast().getVersion();

        boolean readOnly = room.getStatus() == Room.RoomStatus.ENDED;

        return WhiteboardStateResponse.builder()
                .version(currentVersion)
                .snapshotData(snapshotData)
                .deltaUpdates(deltaUpdates)
                .readOnly(readOnly)
                .build();
    }

    // ── Save whiteboard update ─────────────────────────────────────────────────
    @Transactional
    public void saveWhiteboardUpdate(Long roomId, Long userId, byte[] updateData) {

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        roomParticipantRepository.findByUserIdAndRoomId(userId, roomId)
                .orElseThrow(() -> new RuntimeException(
                        "User " + userId + " is not a participant of room " + roomId));

        if (room.getStatus() == Room.RoomStatus.ENDED) {
            throw new RuntimeException("Cannot update whiteboard in an ended room");
        }

        User user = userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found: " + userId));

        persistenceService.saveUpdate(room, user, updateData);
    }

    // ── Save whiteboard snapshot ───────────────────────────────────────────────
    //
    // NEW: Accepts a full Yjs state blob from the client and persists it as a
    // WhiteboardSnapshot, then deletes all now-redundant delta updates.
    //
    // The client should call this every ~100 strokes to keep the delta list
    // small and join time fast.
    //
    // This avoids needing a server-side Yjs library — the client already has
    // the merged state and just sends it as a binary blob.

    @Transactional
    public void saveWhiteboardSnapshot(Long roomId, Long userId, byte[] snapshotData) {

        Room room = roomRepository.findById(roomId)
                .orElseThrow(() -> new RuntimeException("Room not found: " + roomId));

        roomParticipantRepository.findByUserIdAndRoomId(userId, roomId)
                .orElseThrow(() -> new RuntimeException(
                        "User " + userId + " is not a participant of room " + roomId));

        if (room.getStatus() == Room.RoomStatus.ENDED) {
            throw new RuntimeException("Cannot snapshot whiteboard in an ended room");
        }

        persistenceService.saveSnapshot(room, snapshotData);
    }
}