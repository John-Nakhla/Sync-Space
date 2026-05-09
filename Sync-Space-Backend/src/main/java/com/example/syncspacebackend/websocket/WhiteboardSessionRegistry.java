package com.example.syncspacebackend.websocket;

import org.springframework.stereotype.Component;
import org.springframework.web.socket.WebSocketSession;

import java.util.Collections;
import java.util.Map;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

// Keeps track of every open WebSocket session, grouped by roomId.
//
// This is in-memory only — it does NOT go in the database.
// It only answers the question: "which browser tabs are currently
// connected to room 42 right now?"
//
// ConcurrentHashMap + ConcurrentHashMap.newKeySet() are used so that
// multiple updates arriving at the same millisecond from different
// contributors never corrupt the map.

@Component
public class WhiteboardSessionRegistry {

    // roomId → set of all currently connected WebSocket sessions for that room
    private final Map<Long, Set<WebSocketSession>> roomSessions =
            new ConcurrentHashMap<>();

    // Called when a user opens the whiteboard (afterConnectionEstablished)
    public void addSession(Long roomId, WebSocketSession session) {
        roomSessions
                .computeIfAbsent(roomId, id -> ConcurrentHashMap.newKeySet())
                .add(session);
    }

    // Called when a user closes the tab or loses connection (afterConnectionClosed)
    public void removeSession(Long roomId, WebSocketSession session) {
        Set<WebSocketSession> sessions = roomSessions.get(roomId);
        if (sessions != null) {
            sessions.remove(session);
            // Clean up the map entry if the room is now empty
            if (sessions.isEmpty()) {
                roomSessions.remove(roomId);
            }
        }
    }

    // Returns all sessions for a room EXCEPT the sender's own session.
    // Used when broadcasting — you don't send the update back to who sent it.
    public Set<WebSocketSession> getOtherSessions(Long roomId, WebSocketSession sender) {
        Set<WebSocketSession> all = roomSessions.getOrDefault(
                roomId, Collections.emptySet());

        Set<WebSocketSession> others = ConcurrentHashMap.newKeySet();
        for (WebSocketSession s : all) {
            if (!s.getId().equals(sender.getId()) && s.isOpen()) {
                others.add(s);
            }
        }
        return others;
    }
}