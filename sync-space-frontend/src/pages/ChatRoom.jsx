import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchInitialHistory, fetchCatchUp, createWebSocketClient } from '../services/chatService';
// Import the new service methods
import { fetchRoomInfo, pauseRoomAction, resumeRoomAction } from '../services/roomService';
import ChatMessage from '../components/ChatMessage';
import './ChatRoom.css';
import ChatInput from '../components/ChatInput';
import { jwtDecode } from 'jwt-decode';

const ChatRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();

    const [messages, setMessages] = useState([]);
    const [stompClient, setStompClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const [replyTo, setReplyTo] = useState(null);
    const [lastSeenId, setLastSeenId] = useState(null);
    const [roomStatus, setRoomStatus] = useState("ACTIVE");
    const [ownerId, setOwnerId] = useState(null);

    const scrollRef = useRef();

    const token = localStorage.getItem('token');
    const decoded = token ? jwtDecode(token) : null;
    const currentUserId = decoded?.userId;
    const currentUser = decoded?.sub || "Guest";
    const isAdmin = ownerId === currentUserId;

    // ================= RESTORE lastSeenId =================
    useEffect(() => {
        const saved = localStorage.getItem(`lastSeen_${roomId}`);
        if (saved) setLastSeenId(saved);
    }, [roomId]);

    // ================= LOAD ROOM INFO (Using Service) =================
    const loadRoomInfoData = async () => {
        try {
            const data = await fetchRoomInfo(roomId);
            setOwnerId(data.ownerId);
            setRoomStatus(data.status);
        } catch (err) {
            console.error("Failed to load room info", err);
        }
    };

    // ================= FETCH + CONNECT =================
    useEffect(() => {
        const loadHistory = async () => {
            try {
                const res = await fetchInitialHistory(roomId);
                setMessages(res.data.reverse());
            } catch (err) {
                console.error("Failed to load chat history:", err);
                if (err.response?.status === 403) navigate('/login');
            } finally {
                setLoading(false);
            }
        };

        loadHistory();
        loadRoomInfoData(); 

        const client = createWebSocketClient();

        client.onConnect = async () => {
            if (lastSeenId) {
                try {
                    const res = await fetchCatchUp(roomId, lastSeenId);
                    if (res.data.length > 0) {
                        setMessages(prev => {
                            const existingIds = new Set(prev.map(m => m.id));
                            const newMsgs = res.data.filter(m => !existingIds.has(m.id));
                            return [...prev, ...newMsgs];
                        });
                        const lastMsg = res.data[res.data.length - 1];
                        if (lastMsg.redisId) setLastSeenId(lastMsg.redisId);
                    }
                } catch (err) {
                    console.error("Catch-up failed:", err);
                }
            }

            client.subscribe(`/topic/room.${roomId}`, (payload) => {
                const newMessage = JSON.parse(payload.body);
                setMessages(prev => {
                    if (prev.some(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });
                if (newMessage.redisId) setLastSeenId(newMessage.redisId);
            });

            client.subscribe(`/topic/rooms/${roomId}`, (payload) => {
                const data = JSON.parse(payload.body);
                if (data.status) setRoomStatus(data.status);
                if (data.ownerId) setOwnerId(data.ownerId);
            });
        };

        client.activate();
        setStompClient(client);

        return () => {
            if (client) client.deactivate();
        };
    }, [roomId]);

    // ================= SAVE lastSeenId =================
    useEffect(() => {
        if (lastSeenId) {
            localStorage.setItem(`lastSeen_${roomId}`, lastSeenId);
        }
    }, [lastSeenId, roomId]);

    // ================= AUTO SCROLL =================
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ================= SEND =================
    const handlePublish = (content) => {
        if (roomStatus !== "ACTIVE") return;

        if (stompClient?.connected) {
            const messageData = {
                content,
                sender: currentUser,
                senderId: currentUserId,
                parentId: replyTo?.id || null,
                createdAt: new Date().toISOString()
            };

            stompClient.publish({
                destination: `/app/chat/${roomId}`,
                body: JSON.stringify(messageData),
                headers: { Authorization: `Bearer ${token}` }
            });
            setReplyTo(null);
        }
    };

    // ================= ADMIN ACTIONS (Using Service) =================
    const handlePause = async () => {
        try {
            await pauseRoomAction(roomId);
            // Status will be updated via WebSocket subscription
        } catch (err) {
            console.error("Error pausing room", err);
        }
    };

    const handleResume = async () => {
        try {
            await resumeRoomAction(roomId);
            // Status will be updated via WebSocket subscription
        } catch (err) {
            console.error("Error resuming room", err);
        }
    };

    const findMessageById = (id) => messages.find(m => m.id === id);

    if (loading) return <div>Connecting...</div>;

    return (
        <div className="chat-container">
            <header className="chat-header">
                <button onClick={() => navigate('/my-rooms')}>← Back</button>
                <h2 className='room_number'>Room #{roomId}</h2>

                {isAdmin && (
                    <div className="admin-controls">
                        {roomStatus === "ACTIVE" ? (
                            <button className="pause-btn" onClick={handlePause}>⏸ Pause</button>
                        ) : (
                            <button className="resume-btn" onClick={handleResume}>▶ Resume</button>
                        )}
                    </div>
                )}
            </header>

            {roomStatus !== "ACTIVE" && (
                <div className="room-paused-banner">🚫 Room is paused by admin</div>
            )}

            <main className="messages-area">
                {messages.map((msg, index) => (
                    <ChatMessage
                        key={msg.id || index}
                        msg={msg}
                        parentMsg={findMessageById(msg.parentId)}
                        isMine={msg.senderId === currentUserId}
                        onReply={() => setReplyTo(msg)}
                    />
                ))}
                <div ref={scrollRef} />
            </main>

            {replyTo && (
                <div className="reply-preview">
                    <div><strong>{replyTo.sender}</strong>: {replyTo.content}</div>
                    <button onClick={() => setReplyTo(null)}>✕</button>
                </div>
            )}

            <footer className="chat-footer">
                <ChatInput onSendMessage={handlePublish} disabled={roomStatus !== "ACTIVE"} />
            </footer>
        </div>
    );
};

export default ChatRoom;