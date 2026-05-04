import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { fetchInitialHistory, createWebSocketClient } from '../services/chatService';
import ChatMessage from '../components/ChatMessage';
import './ChatRoom.css';
import ChatInput from '../components/ChatInput';
import { jwtDecode } from 'jwt-decode'; // You'll need to: npm install jwt-decode


const ChatRoom = () => {
    const { roomId } = useParams();
    const navigate = useNavigate();
    const [messages, setMessages] = useState([]);
    const [stompClient, setStompClient] = useState(null);
    const [loading, setLoading] = useState(true);
    const scrollRef = useRef();

    const token = localStorage.getItem('token');

    const decoded = token ? jwtDecode(token) : null;

    const currentUserId = decoded?.userId;
    const currentUser = decoded?.sub || "Guest";

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
            // ✅ Ensure subscription matches your Broker Registry
            client.subscribe(`/topic/room.${roomId}`, (payload) => {
                const newMessage = JSON.parse(payload.body);
                setMessages(prev => [...prev, newMessage]);
            });
        };

        client.onStompError = (frame) => {
            console.error('Broker reported error: ' + frame.headers['message']);
        };

        client.activate();
        setStompClient(client);

        return () => {
            if (client) client.deactivate();
        };
    }, [roomId, navigate]);

    useEffect(() => {
        scrollRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [messages]);

    const handlePublish = (content) => {
        // ✅ FIX: Use 'stompClient' (the state) instead of 'client' (which was out of scope)
        if (stompClient && stompClient.connected) {
            const token = localStorage.getItem('token');

            const messageData = {
                content,
                sender:currentUser,
                senderId: currentUserId,
                timestamp: new Date().toISOString()
            };

            stompClient.publish({
                // ✅ Ensure this matches your Interceptor's extractRoomId logic (/)
                destination: `/app/chat/${roomId}`,
                body: JSON.stringify(messageData),
                headers: { Authorization: `Bearer ${token}` }
            });
        } else {
            console.error("WebSocket not connected.");
        }
    };

    if (loading) return <div className="chat-loading">Connecting to Sync Space...</div>;

    return (
        <div className="chat-container">
            <header className="chat-header">
                <button className="back-button" onClick={() => navigate('/my-rooms')}>← Back</button>
                <h2 className="purple-text">Sync Space #{roomId}</h2>
                <div className="status-indicator">● Live</div>
            </header>

            <main className="messages-area">
                {messages.map((msg, index) => (
                    <ChatMessage
                        key={msg.id || index}
                        msg={msg}
                        isMine={msg.senderId === currentUserId}
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