import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import api from '../api/api';

const API_BASE = "/api/chat";

export const fetchInitialHistory = (roomId) => {
    return api.get(`${API_BASE}/history/${roomId}`);
};

export const fetchCatchUp = (roomId, lastSeenId) => {
    return api.get(`${API_BASE}/catchup/${roomId}?lastSeenId=${lastSeenId}`);
};

export const createWebSocketClient = () => {
    const token = localStorage.getItem('token');

    return new Client({
        brokerURL: 'ws://localhost:8080/ws-chat',
        webSocketFactory: () => new SockJS('http://localhost:8080/ws-chat'),
        connectHeaders: {
            Authorization: `Bearer ${token}`
        },
        debug: (str) => {
            if (!str.includes("PONG") && !str.includes("PING")) {
                console.log(str);
            }
        },
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
    });
};