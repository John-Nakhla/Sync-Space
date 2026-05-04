import React, { useEffect, useState } from 'react';
import axios from 'axios';
import './MyRooms.css';

const MyRooms = () => {
    const [rooms, setRooms] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

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
                    headers: {
                        // Crucial: Must match the "Bearer " format expected by your JwtFilter
                        'Authorization': `Bearer ${token}` 
                    }
                });
                
                setRooms(response.data);
            } catch (err) {
                console.error("Error fetching rooms:", err);
                setError(err.response?.status === 403 
                    ? "Session expired or unauthorized. Please login again." 
                    : "Failed to load rooms.");
            } finally {
                setLoading(false);
            }
        };

        fetchRooms();
    }, []);

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
                                <h2>{room.roomName}</h2>
                                <p>{room.roomDescription}</p>
                            </div>
                            <div className="room-footer">
                                <span className={`role-badge ${room.role.toLowerCase()}`}>
                                    {room.role}
                                </span>
                                <button className="enter-button">Enter Room</button>
                            </div>
                        </div>
                    ))}
                    {rooms.length === 0 && <p>You haven't joined any rooms yet.</p>}
                </div>
            </div>
        </div>
    );
};

export default MyRooms;