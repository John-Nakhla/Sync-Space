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
    const [roomName, setRoomName] = useState(null);
    const [togglingStatus, setTogglingStatus] = useState(false);

    const scrollRef = useRef();
    const containerRef = useRef();

    const token = localStorage.getItem('token');
    const decoded = token ? jwtDecode(token) : null;

    const currentUserId = decoded?.userId;
    const currentUser = decoded?.sub || "Guest";

    const isAdmin = ownerId === currentUserId;

    // ✅ FIX 1: backend sends "ENDED" for pause, not "PAUSED"
    const isPaused = roomStatus === "ENDED";

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
            setRoomName(data.name)
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

            // ✅ FIX 2: handles both { status: "ENDED" } and { roomStatus: "ENDED" }
            client.subscribe(`/topic/rooms/${roomId}`, (payload) => {
                const data = JSON.parse(payload.body);
                console.log('[WS] Room status update:', data);
                const incoming = data.status ?? data.roomStatus;
                if (incoming) setRoomStatus(incoming);
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

    // ================= LOAD OLDER =================
    const loadOlderMessages = async () => {
        if (loadingOlder || !hasMore || messages.length === 0) return;
        setLoadingOlder(true);
        const oldest = messages[0];
        const token = localStorage.getItem("token");
        try {
            const res = await axios.get(
                `http://localhost:8080/api/chat/history/${roomId}/more`,
                {
                    params: { before: oldest.createdAt, size: 20 },
                    headers: { Authorization: `Bearer ${token}` }
                }
            );
            const older = res.data;
            if (older.length === 0) { setHasMore(false); return; }
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
        if (containerRef.current.scrollTop === 0) loadOlderMessages();
    };

    // ================= PAUSE / RESUME =================
    const handleToggleStatus = async () => {
        if (togglingStatus) return;
        setTogglingStatus(true);
        try {
            if (isPaused) {
                await resumeRoomAction(roomId);
                // ✅ FIX 3: optimistic update uses the exact value the backend sends
                setRoomStatus("ACTIVE");
            } else {
                await pauseRoomAction(roomId);
                setRoomStatus("ENDED");
            }
        } catch (err) {
            console.error("Failed to toggle room status:", err);
            // ✅ FIX 4: on error, re-fetch real status so UI stays in sync
            const data = await fetchRoomInfo(roomId);
            setRoomStatus(data.status);
        } finally {
            setTogglingStatus(false);
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

                <div className="chat-header-info">
                    <h2 className="chat-header-name">
                         <span className="room_number">{roomName}</span>
                    </h2>
                    <p className="chat-header-status">
                        {isPaused ? "Paused" : "Active"}
                    </p>
                </div>

                {isAdmin && (
                    <div className="admin-controls">
                        <button
                            className={isPaused ? "resume-btn" : "pause-btn"}
                            onClick={handleToggleStatus}
                            disabled={togglingStatus}
                        >
                            {togglingStatus
                                ? "..."
                                : isPaused
                                    ? "▶ Resume"
                                    : "⏸ Pause"
                            }
                        </button>
                    </div>
                )}
            </header>

            {isPaused && (
                <div className="room-paused-banner">
                    This room has been paused by the admin. Messaging is disabled.
                </div>
            )}

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
                <ChatInput
                    onSendMessage={handlePublish}
                    disabled={isPaused}
                />
            </footer>

        </div>
    );
};

export default ChatRoom;