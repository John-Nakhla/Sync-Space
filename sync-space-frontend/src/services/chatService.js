import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';

// Ensure this matches your Spring Boot server port
const API_BASE = "http://localhost:8080/api/chat";

/**
 * Fetches MongoDB/SQL history for a specific room.
 * Includes the Authorization header to pass through Spring Security.
 */
export const fetchInitialHistory = (roomId) => {
    const token = localStorage.getItem('token');
    return axios.get(`${API_BASE}/history/${roomId}`, {
        headers: {
            Authorization: `Bearer ${token}`
        }
    });
};

export const fetchCatchUp = (roomId, lastSeenId) => {
    const token = localStorage.getItem('token');

    return axios.get(
        `${API_BASE}/catchup/${roomId}?lastSeenId=${lastSeenId}`,
        {
            headers: { Authorization: `Bearer ${token}` }
        }
    );
};

/**
 * Creates a STOMP client with SockJS fallback and JWT authentication.
 */
export const createWebSocketClient = () => {
    const token = localStorage.getItem('token');

    return new Client({
        // The destination for STOMP over WebSocket
        brokerURL: 'ws://localhost:8080/ws-chat', 
        
        // SockJS uses http/https instead of ws/wss
        webSocketFactory: () => new SockJS('http://localhost:8080/ws-chat'),
        
        // This sends the token during the initial CONNECT frame
        connectHeaders: {
            Authorization: `Bearer ${token}` 
        },

        debug: (str) => {
            // Optional: Hide verbose heartbeats to keep the console clean
            if (!str.includes("PONG") && !str.includes("PING")) {
                console.log(str);
            }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
    });
};