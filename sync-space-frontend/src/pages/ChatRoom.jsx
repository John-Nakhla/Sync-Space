import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    fetchInitialHistory,
    fetchCatchUp,
    createWebSocketClient
} from '../services/chatService';

import {
    fetchRoomInfo,
    pauseRoomAction,
    resumeRoomAction
} from '../services/roomService';

import ChatMessage from '../components/ChatMessage';
import ChatInput from '../components/ChatInput';
import './ChatRoom.css';
import { jwtDecode } from 'jwt-decode';
import axios from 'axios';

const ChatRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [messages, setMessages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [loadingOlder, setLoadingOlder] = useState(false);
    const [hasMore, setHasMore] = useState(true);

    const [stompClient, setStompClient] = useState(null);
    const [replyTo, setReplyTo] = useState(null);
    const [lastSeenId, setLastSeenId] = useState(null);
    const [roomStatus, setRoomStatus] = useState("ACTIVE");
    const [ownerId, setOwnerId] = useState(null);

    const scrollRef = useRef();
    const containerRef = useRef();

    const token = localStorage.getItem('token');
    const decoded = token ? jwtDecode(token) : null;

    const currentUserId = decoded?.userId;
    const currentUser = decoded?.sub || "Guest";

    const isAdmin = ownerId === currentUserId;

    // ================= LOAD INITIAL =================
    useEffect(() => {
        const load = async () => {
            try {
                const res = await fetchInitialHistory(roomId);
                const msgs = res.data.reverse();
                setMessages(msgs);

                if (msgs.length < 20) setHasMore(false);
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        load();
    }, [roomId]);

    // ================= ROOM INFO =================
    useEffect(() => {
        const loadRoomInfo = async () => {
            const data = await fetchRoomInfo(roomId);
            setOwnerId(data.ownerId);
            setRoomStatus(data.status);
        };

        loadRoomInfo();
    }, [roomId]);

    // ================= WEBSOCKET =================
    useEffect(() => {
        const client = createWebSocketClient();

        client.onConnect = () => {

            client.subscribe(`/topic/room.${roomId}`, (payload) => {
                const msg = JSON.parse(payload.body);

                setMessages(prev => {
                    if (prev.some(m => m.id === msg.id)) return prev;
                    return [...prev, msg];
                });
            });

            client.subscribe(`/topic/rooms/${roomId}`, (payload) => {
                const data = JSON.parse(payload.body);
                if (data.status) setRoomStatus(data.status);
            });
        };

        client.activate();
        setStompClient(client);

        return () => client.deactivate();
    }, [roomId]);

    // ================= CATCHUP =================
    useEffect(() => {
        const runCatchUp = async () => {
            if (!lastSeenId) return;

            const res = await fetchCatchUp(roomId, lastSeenId);

            if (res.data.length > 0) {
                setMessages(prev => {
                    const ids = new Set(prev.map(m => m.id));
                    const filtered = res.data.filter(m => !ids.has(m.id));
                    return [...prev, ...filtered];
                });

                setLastSeenId(res.data[res.data.length - 1].redisId);
            }
        };

        runCatchUp();
    }, [roomId]);

    // ================= SCROLL TO BOTTOM =================
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ================= LOAD OLDER (IMPORTANT FIX) =================
    const loadOlderMessages = async () => {
        if (loadingOlder || !hasMore || messages.length === 0) return;

        setLoadingOlder(true);

        const oldest = messages[0];
        const token = localStorage.getItem("token");

        try {
            const res = await axios.get(
                `http://localhost:8080/api/chat/history/${roomId}/more`,
                {
                    params: {
                        before: oldest.createdAt,
                        size: 20
                    },
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const older = res.data;

            if (older.length === 0) {
                setHasMore(false);
                return;
            }

            setMessages(prev => {
                const ids = new Set(prev.map(m => m.id));
                const filtered = older.filter(m => !ids.has(m.id));

                return [...filtered.reverse(), ...prev];
            });

        } catch (err) {
            console.error("Failed to load older messages:", err);
        } finally {
            setLoadingOlder(false);
        }
    };

    // ================= SCROLL DETECT =================
    const handleScroll = () => {
        const top = containerRef.current.scrollTop;

        if (top === 0) {
            loadOlderMessages();
        }
    };

    // ================= SEND =================
    const handlePublish = (message) => {
        if (!stompClient?.connected) return;

        const msg = {
            content: message.content,
            fileUrl: message.fileUrl || null,
            sender: currentUser,
            senderId: currentUserId,
            parentId: replyTo?.id || null,
            createdAt: new Date().toISOString()
        };

        stompClient.publish({
            destination: `/app/chat/${roomId}`,
            body: JSON.stringify(msg),
            headers: { Authorization: `Bearer ${token}` }
        });

        setReplyTo(null);
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div className="chat-container">

            <header className="chat-header">
                <button onClick={() => navigate('/my-rooms')}>Back</button>
                <h2>Room #{roomId}</h2>
            </header>

            <main
                className="messages-area"
                ref={containerRef}
                onScroll={handleScroll}
            >
                {loadingOlder && <div>Loading older messages...</div>}

                {messages.map((msg) => (
                    <ChatMessage
                        key={msg.id}
                        msg={msg}
                        isMine={msg.senderId === currentUserId}
                        parentMsg={messages.find(m => m.id === msg.parentId)}
                        onReply={() => setReplyTo(msg)}
                    />
                ))}

                <div ref={scrollRef} />
            </main>

            <footer className="chat-footer">
                <ChatInput onSendMessage={handlePublish} />
            </footer>

        </div>
    );
};

export default ChatRoom;