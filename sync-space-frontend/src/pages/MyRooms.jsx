import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom'; // 1. Import useNavigate
import './MyRooms.css';

const MyRooms = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    
    const navigate = useNavigate(); // 2. Initialize navigate

    useEffect(() => {
        const fetchRooms = async () => {
            try {
                const token = localStorage.getItem('token');
                if (!token) {
                    setError("Please log in to view your rooms.");
                    setLoading(false);
                    return;
                }

                const response = await axios.get('http://localhost:8080/api/rooms/my-rooms', {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                setRooms(response.data);
            } catch (err) {
                setError("Failed to load rooms.");
            } finally {
                setLoading(false);
            }
        };
        fetchRooms();
    }, []);

    // 3. Create the navigation handler
    const handleEnterRoom = (roomId) => {
        navigate(`/chat/${roomId}`); // Matches the route pattern you'll set in App.js
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
                                {/* 4. Add the onClick event */}
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