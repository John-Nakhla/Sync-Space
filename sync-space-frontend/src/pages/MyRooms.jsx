import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MyRooms.css';

const MyRooms = () => {
  const [rooms, setRooms]               = useState([]);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState(null);
  const [activeAction, setActiveAction] = useState('none');
  const [newRoomName, setNewRoomName]   = useState('');
  const [newRoomDesc, setNewRoomDesc]   = useState('');
  const [joinCode, setJoinCode]         = useState('');
  const [createdRoom, setCreatedRoom]   = useState(null);

  const navigate = useNavigate();

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get('http://localhost:8080/api/rooms/my-rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(res.data);
    } catch (err) { setError('Failed to load rooms.'); } finally { setLoading(false); }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post('http://localhost:8080/api/rooms/create', 
        { name: newRoomName, description: newRoomDesc }, { headers: { Authorization: `Bearer ${token}` } });
      setCreatedRoom(res.data);
      fetchRooms();
    } catch { alert('Creation failed.'); }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(`http://localhost:8080/api/rooms/join/${joinCode.trim().toUpperCase()}`, {}, 
        { headers: { Authorization: `Bearer ${token}` } });
      navigate(`/room/${res.data.id}`, { state: { role: 'MEMBER' } });
    } catch { alert('Invalid code or room blocked.'); }
  };

  if (loading) return <div className="status-msg">Loading...</div>;

  return (
    <div className="rooms-page">
      <div className="dashboard-header">
        <h1 className="rooms-title">Workspace</h1>
        <div className="action-buttons">
          <button onClick={() => {setActiveAction('create'); setCreatedRoom(null)}}>➕ Create</button>
          <button onClick={() => setActiveAction('join')}>🔍 Join</button>
        </div>
      </div>

      {activeAction === 'create' && !createdRoom && (
        <form onSubmit={handleCreate} className="action-form"><input placeholder="Name" required onChange={e => setNewRoomName(e.target.value)}/><button type="submit">Create</button></form>
      )}

      <div className="rooms-grid">
        {rooms.map((room) => (
          <div key={room.roomId} className="room-card">
            <h2>{room.roomName}</h2>
            <div className="room-footer">
              <span className={`status-badge status-${room.status.toLowerCase()}`}>{room.status}</span>
              {room.role === 'ADMIN' && (room.status === 'WAITING' || room.status === 'ENDED') ? (
                <button className="start-button" onClick={() => navigate(`/room/${room.roomId}`, { state: { role: 'ADMIN' } })}>🚀 Start Session</button>
              ) : room.status === 'ACTIVE' ? (
                <button className="enter-button" onClick={() => navigate(`/room/${room.roomId}`, { state: { role: room.role } })}>Enter Room</button>
              ) : (
                <button className="disabled-button" disabled>🔒 Waiting...</button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyRooms;