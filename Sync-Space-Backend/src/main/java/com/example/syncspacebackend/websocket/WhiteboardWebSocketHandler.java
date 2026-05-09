package com.example.syncspacebackend.websocket;
import com.example.syncspacebackend.security.CustomUserDetailsService;
import org.springframework.security.core.userdetails.UserDetails;
import com.example.syncspacebackend.models.Room;
import com.example.syncspacebackend.models.RoomParticipant;
import com.example.syncspacebackend.models.User;
import com.example.syncspacebackend.repositories.RoomParticipantRepository;
import com.example.syncspacebackend.repositories.RoomRepository;
import com.example.syncspacebackend.repositories.UserRepository;
import com.example.syncspacebackend.security.JwtService;
import com.example.syncspacebackend.services.WhiteboardPersistenceService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.*;
import org.springframework.web.socket.handler.BinaryWebSocketHandler;

import java.io.IOException;
import java.util.List;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

// ── YJS Message Protocol (what the bytes mean) ────────────────────────────────
//
// The y-websocket library uses a simple binary protocol.
// Every message starts with a type byte:
//
//   byte[0] = 0 → SYNC message, followed by:
//       byte[1] = 0 → Sync Step 1: client sends its state vector
//                     Server should respond with all updates the client is missing
//       byte[1] = 1 → Sync Step 2: contains a YJS update payload
//       byte[1] = 2 → Update: contains a YJS update payload (live drawing)
//
//   byte[0] = 1 → AWARENESS message (cursor positions, user presence)
//                  Not saved to DB — just forwarded to other sessions
//
// YJS update bytes (the actual drawing data) start at index 2 for sync messages.

@Slf4j
@Component
@RequiredArgsConstructor
public class WhiteboardWebSocketHandler extends BinaryWebSocketHandler {

    private static final byte MESSAGE_SYNC       = 0;
    private static final byte MESSAGE_AWARENESS  = 1;
    private static final byte SYNC_STEP_1        = 0;
    private static final byte SYNC_STEP_2        = 1;
    private static final byte SYNC_UPDATE        = 2;

    private final WhiteboardPersistenceService persistenceService;
    private final WhiteboardSessionRegistry sessionRegistry;
    private final RoomRepository roomRepository;
    private final RoomParticipantRepository participantRepository;
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final CustomUserDetailsService userDetailsService;

    // Stores roomId and User for each session so we don't re-query on every message
    // key = WebSocketSession.getId()  (a random string like "abc123")
    private final Map<String, Long> sessionRoomMap = new ConcurrentHashMap<>();
    private final Map<String, User> sessionUserMap = new ConcurrentHashMap<>();

    // ── CONNECTION OPENED ─────────────────────────────────────────────────────
    // Called once when a browser tab connects to the WebSocket.
    // Validates JWT, checks room membership, sends the full board state.
    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws IOException {

        // ── Step A: Extract roomId from URL ───────────────────────────────────
        String path = session.getUri().getPath();
        Long roomId = Long.parseLong(path.substring(path.lastIndexOf('/') + 1));

        // ── Step B: Extract JWT from query string ─────────────────────────────
        String query = session.getUri().getQuery();
        if (query == null || !query.startsWith("token=")) {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Missing token"));
            return;
        }
        String token = query.substring("token=".length());

        // ── Step C: Validate token ────────────────────────────────────────────
        String username;
        User user;
        try {
            username = jwtService.extractUsername(token);

            // isTokenValid expects UserDetails — load through CustomUserDetailsService
            UserDetails userDetails = userDetailsService.loadUserByUsername(username);
            if (!jwtService.isTokenValid(token, userDetails)) {
                session.close(CloseStatus.POLICY_VIOLATION.withReason("Invalid token"));
                return;
            }

            // Load the actual User entity for saving updates later
            user = userRepository.findByUsername(username)
                    .orElseThrow(() -> new RuntimeException("User not found"));

        } catch (Exception e) {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Invalid token"));
            return;
        }

        // ── Step D: Verify room participation ─────────────────────────────────
        if (!participantRepository.existsByUserIdAndRoomId(user.getId(), roomId)) {
            session.close(CloseStatus.POLICY_VIOLATION.withReason("Not a participant"));
            return;
        }

        // ── Step E: Register session ──────────────────────────────────────────
        sessionRoomMap.put(session.getId(), roomId);
        sessionUserMap.put(session.getId(), user);
        sessionRegistry.addSession(roomId, session);

        log.info("User {} connected to whiteboard room {}", username, roomId);

        // ── Step F: Send full board state ─────────────────────────────────────
        List<byte[]> boardState = persistenceService.getFullBoardState(roomId);
        for (byte[] updateBytes : boardState) {
            session.sendMessage(new BinaryMessage(wrapAsUpdate(updateBytes)));
        }
    }

    // ── BINARY MESSAGE RECEIVED ───────────────────────────────────────────────
    // Called every time a contributor draws, moves, or erases something.
    // Also called for awareness messages (cursor position updates).
    @Override
    protected void handleBinaryMessage(WebSocketSession session, BinaryMessage message) {
        Long roomId = sessionRoomMap.get(session.getId());
        User user   = sessionUserMap.get(session.getId());

        if (roomId == null || user == null) return;  // session not properly initialized

        byte[] payload = message.getPayload().array();
        if (payload.length < 2) return;  // too short to be a valid YJS message

        byte messageType = payload[0];
        byte subType     = payload[1];

        if (messageType == MESSAGE_SYNC) {

            if (subType == SYNC_STEP_1) {
                // ── Client sent its state vector ──────────────────────────────
                // It's asking: "what updates do you have that I don't?"
                // We respond by sending ALL stored updates. YJS deduplicates them.
                // (A proper implementation would compute the diff using a server
                // Y.Doc, but sending everything is safe because YJS is a CRDT.)
                List<byte[]> boardState = persistenceService.getFullBoardState(roomId);
                boardState.forEach(updateBytes -> sendSafely(session, wrapAsUpdate(updateBytes)));

            } else if (subType == SYNC_STEP_2 || subType == SYNC_UPDATE) {
                // ── Client sent an actual drawing update ──────────────────────
                // bytes 0 and 1 are protocol headers, the real YJS data starts at index 2
                byte[] yjsUpdateBytes = extractUpdateBytes(payload);

                // Check the user has drawing rights (ADMIN or CONTRIBUTOR only)
                RoomParticipant.Role role = participantRepository
                        .findByUserIdAndRoomId(user.getId(), roomId)
                        .map(RoomParticipant::getRole)
                        .orElse(null);

                if (role == RoomParticipant.Role.MEMBER) {
                    return; // MEMBERS are view-only — silently drop the update
                }

                // Also block drawing if the room is ENDED
                Room room = roomRepository.findById(roomId).orElse(null);
                if (room == null || room.getStatus() == Room.RoomStatus.ENDED) {
                    return;
                }

                // Save to PostgreSQL
                persistenceService.saveUpdate(room, user, yjsUpdateBytes);

                // Broadcast the ORIGINAL full message to all other sessions in the room.
                // We send the full payload (including the [0, 2] header) so the other
                // clients' y-websocket providers understand it correctly.
                sessionRegistry.getOtherSessions(roomId, session)
                        .forEach(other -> sendSafely(other, payload));
            }

        } else if (messageType == MESSAGE_AWARENESS) {
            // ── Awareness message (cursor positions, online presence) ──────────
            // Not saved to DB — just forwarded to everyone else in the room.
            sessionRegistry.getOtherSessions(roomId, session)
                    .forEach(other -> sendSafely(other, payload));
        }
    }

    // ── CONNECTION CLOSED ─────────────────────────────────────────────────────
    // Called when a browser tab closes or the user loses connection.
    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Long roomId = sessionRoomMap.remove(session.getId());
        User user   = sessionUserMap.remove(session.getId());

        if (roomId != null) {
            sessionRegistry.removeSession(roomId, session);
        }
        if (user != null) {
            log.info("User {} disconnected from whiteboard room {}", user.getUsername(), roomId);
        }
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    // Wraps raw YJS update bytes with the [0, 2] sync-update header
    // so y-websocket clients understand the message type.
    private byte[] wrapAsUpdate(byte[] yjsBytes) {
        byte[] wrapped = new byte[yjsBytes.length + 2];
        wrapped[0] = MESSAGE_SYNC;   // 0
        wrapped[1] = SYNC_UPDATE;    // 2
        System.arraycopy(yjsBytes, 0, wrapped, 2, yjsBytes.length);
        return wrapped;
    }

    // Extracts the raw YJS bytes from a received sync message
    // by stripping the 2-byte [messageType, subType] header.
    private byte[] extractUpdateBytes(byte[] payload) {
        byte[] yjsBytes = new byte[payload.length - 2];
        System.arraycopy(payload, 2, yjsBytes, 0, yjsBytes.length);
        return yjsBytes;
    }

    // Sends a binary message without throwing a checked exception.
    // WebSocket sends can fail silently if the client disconnected mid-send.
    private void sendSafely(WebSocketSession session, byte[] bytes) {
        try {
            if (session.isOpen()) {
                session.sendMessage(new BinaryMessage(bytes));
            }
        } catch (IOException e) {
            log.warn("Failed to send message to session {}: {}", session.getId(), e.getMessage());
        }
    }
}