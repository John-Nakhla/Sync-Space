import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchInitialHistory, fetchCatchUp, createWebSocketClient } from '../services/chatService';
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

    const scrollRef = useRef();

    const token = localStorage.getItem('token');
    const decoded = token ? jwtDecode(token) : null;

    const currentUserId = decoded?.userId;
    const currentUser = decoded?.sub || "Guest";

    // ✅ Restore lastSeenId from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`lastSeen_${roomId}`);
        if (saved) setLastSeenId(saved);
    }, [roomId]);

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

        const client = createWebSocketClient();

        client.onConnect = async () => {
            console.log(`Connected to Room ${roomId}`);

            // 🔥 1. CATCH-UP
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
                        if (lastMsg.redisId) {
                            setLastSeenId(lastMsg.redisId);
                        }
                    }
                } catch (err) {
                    console.error("Catch-up failed:", err);
                }
            }

            // 🔥 2. SUBSCRIBE
            client.subscribe(`/topic/room.${roomId}`, (payload) => {
                const newMessage = JSON.parse(payload.body);

                setMessages(prev => {
                    if (prev.some(m => m.id === newMessage.id)) return prev;
                    return [...prev, newMessage];
                });

                if (newMessage.redisId) {
                    setLastSeenId(newMessage.redisId);
                }
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
        if (stompClient && stompClient.connected) {
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

    // ================= FIND PARENT =================
    const findMessageById = (id) => {
        return messages.find(m => m.id === id);
    };

    if (loading) return <div>Connecting...</div>;

    return (
        <div className="chat-container">

            <header className="chat-header">
                <button onClick={() => navigate('/my-rooms')}>← Back</button>
                <h2 className='room_number'>Room #{roomId}</h2>
            </header>

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
                    <div>
                        <strong>{replyTo.sender}</strong>: {replyTo.content}
                    </div>
                    <button onClick={() => setReplyTo(null)}>✕</button>
                </div>
            )}

            <footer className="chat-footer">
                <ChatInput onSendMessage={handlePublish} />
            </footer>

        </div>
    );
};

export default ChatRoom;