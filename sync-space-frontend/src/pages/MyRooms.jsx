import React, { useEffect, useState } from 'react';
import api from '../api/api';
import { useNavigate } from 'react-router-dom';
import './MyRooms.css';

const MyRooms = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const navigate = useNavigate();

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const response = await api.get('/api/rooms/my-rooms');
                setRooms(response.data);
            } catch (err) {
                setError("Failed to load rooms.");
            } finally {
                setLoading(false);
            }
        };
        fetchRooms();
    }, []);

    const handleEnterRoom = (roomId) => {
        navigate(`/chat/${roomId}`);
    };

    if (loading) return <div className="status-msg">Loading your spaces...</div>;
    if (error) return <div className="status-msg error">{error}</div>;

    return (
        <div className="rooms-page">
            <div className="rooms-container">
                <h1 className="rooms-title">Welcome back to the room</h1>
                <div className="rooms-grid">
                    {rooms.map((room) => (
                        <div key={room.roomId} className="room-card">
                            <div className="room-info">
                                <h2>{room.name}</h2>
                                <p>{room.description}</p>
                                <p>{room.status}</p>
                                <p>{room.joinCode}</p>
                            </div>
                            <div className="room-footer">
                                <span className={`role-badge ${room.role.toLowerCase()}`}>
                                    {room.role}
                                </span>
                                <button 
                                    className="enter-button" 
                                    onClick={() => handleEnterRoom(room.roomId)}
                                >
                                    Enter Room
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default MyRooms;