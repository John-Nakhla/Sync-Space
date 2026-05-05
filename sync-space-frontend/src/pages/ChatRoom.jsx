import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchInitialHistory, createWebSocketClient } from '../services/chatService';
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

    const scrollRef = useRef();

    const token = localStorage.getItem('token');
    const decoded = token ? jwtDecode(token) : null;

    const currentUserId = decoded?.userId;
    const currentUser = decoded?.sub || "Guest";

    // ================= FETCH HISTORY + CONNECT =================
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

        client.onConnect = () => {
            console.log(`Connected to Room ${roomId}`);

            client.subscribe(`/topic/room.${roomId}`, (payload) => {
                const newMessage = JSON.parse(payload.body);
                setMessages(prev => [...prev, newMessage]);
            });
        };

        client.onStompError = (frame) => {
            console.error('Broker error:', frame.headers['message']);
        };

        client.activate();
        setStompClient(client);

        return () => {
            if (client) client.deactivate();
        };
    }, [roomId, navigate]);

    // ================= AUTO SCROLL =================
    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    // ================= SEND MESSAGE =================
    const handlePublish = (content) => {
        if (stompClient && stompClient.connected) {
            const token = localStorage.getItem('token');

            const messageData = {
                content,
                sender: currentUser,
                senderId: currentUserId,
                parentId: replyTo?.id || null, // ✅ reply support
                createdAt: new Date().toISOString()
            };

            stompClient.publish({
                destination: `/app/chat/${roomId}`,
                body: JSON.stringify(messageData),
                headers: { Authorization: `Bearer ${token}` }
            });

            setReplyTo(null); // ✅ clear reply after sending
        } else {
            console.error("WebSocket not connected.");
        }
    };

    // ================= FIND PARENT =================
    const findMessageById = (id) => {
        return messages.find(m => m.id === id);
    };

    if (loading) return <div className="chat-loading">Connecting...</div>;

    return (
        <div className="chat-container">

            {/* HEADER */}
            <header className="chat-header">
                <button onClick={() => navigate('/my-rooms')}>← Back</button>
                <h2>Room #{roomId}</h2>
            </header>

            {/* MESSAGES */}
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

            {/* REPLY PREVIEW */}
            {replyTo && (
                <div className="reply-preview">
                    <div>
                        <strong>{replyTo.sender}</strong>: {replyTo.content}
                    </div>
                    <button onClick={() => setReplyTo(null)}>✕</button>
                </div>
            )}

            {/* INPUT */}
            <footer className="chat-footer">
                <ChatInput onSendMessage={handlePublish} />
            </footer>

        </div>
    );
};

export default ChatRoom;