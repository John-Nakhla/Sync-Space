import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './MyRooms.css';

const MyRooms = () => {
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeAction, setActiveAction] = useState('none');

  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDesc, setNewRoomDesc] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [createdRoom, setCreatedRoom] = useState(null);

  const navigate = useNavigate();

  const fetchRooms = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;
      const res = await axios.get('http://localhost:8080/api/rooms/my-rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(res.data);
    } catch (err) {
      console.error('Failed to load rooms');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchRooms(); }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        'http://localhost:8080/api/rooms/create',
        { name: newRoomName, description: newRoomDesc },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCreatedRoom(res.data); // Stores the room immediately to show the code
      setNewRoomName('');
      setNewRoomDesc('');
      fetchRooms();
    } catch {
      alert('Failed to create room.');
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `http://localhost:8080/api/rooms/join/${joinCode.trim().toUpperCase()}`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      setJoinCode('');
      setActiveAction('none');
      fetchRooms();
      navigate(`/room/${res.data.id}`, { state: { role: 'MEMBER' } });
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid code or room is closed.');
    }
  };

  const copyCode = (code) => {
    navigator.clipboard.writeText(code);
    alert(`Code "${code}" copied!`);
  };

  if (loading) return <div className="status-msg">Loading...</div>;

  return (
    <div className="rooms-page">
      <div className="dashboard-header">
        <h1 className="rooms-title">Workspace</h1>
        <div className="action-buttons">
          <button className={`action-btn ${activeAction === 'create' ? 'active' : ''}`} onClick={() => { setActiveAction('create'); setCreatedRoom(null); }}>
            ➕ Create Room
          </button>
          <button className={`action-btn ${activeAction === 'join' ? 'active' : ''}`} onClick={() => setActiveAction('join')}>
            🔍 Join Room
          </button>
        </div>
      </div>

      <div className={`dropdown-container ${activeAction !== 'none' ? 'open' : ''}`}>
        {/* Create Form */}
        {activeAction === 'create' && !createdRoom && (
          <form className="action-form" onSubmit={handleCreate}>
            <h3>Create a New Space</h3>
            <div className="input-group">
              <input type="text" placeholder="Room Name" required value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)} />
              <input type="text" placeholder="Description" value={newRoomDesc} onChange={(e) => setNewRoomDesc(e.target.value)} />
              <button type="submit" className="submit-btn">Create</button>
            </div>
          </form>
        )}

        {/* Immediate Code Display after Creation */}
        {activeAction === 'create' && createdRoom && (
          <div className="action-form" style={{ textAlign: 'center' }}>
            <h3>🎉 Room Created!</h3>
            <p>Share this code so members can join:</p>
            <div className="code-display">
              <span className="join-code-big">{createdRoom.joinCode}</span>
              <button className="copy-btn" onClick={() => copyCode(createdRoom.joinCode)}>📋 Copy</button>
            </div>
            <button className="submit-btn" style={{ marginTop: '10px' }} onClick={() => navigate(`/room/${createdRoom.id}`, { state: { role: 'ADMIN' } })}>
              Enter Lobby →
            </button>
          </div>
        )}

        {/* Join Form */}
        {activeAction === 'join' && (
          <form className="action-form" onSubmit={handleJoin}>
            <h3>Join an Existing Space</h3>
            <div className="input-group">
              <input type="text" placeholder="Enter 8-char code" required value={joinCode} onChange={(e) => setJoinCode(e.target.value)} style={{ textTransform: 'uppercase' }} />
              <button type="submit" className="submit-btn">Join</button>
            </div>
          </form>
        )}
      </div>

      {/* Rooms Grid */}
      <div className="rooms-grid">
        {rooms.map((room) => (
          <div key={room.roomId} className="room-card">
            <div className="room-info">
              <h2>{room.roomName}</h2>
              {room.role === 'ADMIN' && (
                <div className="card-code-row">
                  <span className="card-code">{room.joinCode}</span>
                  <button className="copy-btn-small" onClick={() => copyCode(room.joinCode)}>📋</button>
                </div>
              )}
            </div>
            <div className="room-footer">
              <span className={`role-badge ${room.role.toLowerCase()}`}>{room.role}</span>
              <span className={`status-badge status-${room.status.toLowerCase()}`}>{room.status}</span>
              
              {/* Conditional Buttons based on Role & Status */}
              {room.role === 'ADMIN' && (room.status === 'WAITING' || room.status === 'ENDED') ? (
                <button className="start-button" onClick={() => navigate(`/room/${room.roomId}`, { state: { role: 'ADMIN' } })}>
                  🚀 Start Session
                </button>
              ) : room.status === 'ACTIVE' ? (
                <button className="enter-button" onClick={() => navigate(`/room/${room.roomId}`, { state: { role: room.role } })}>
                  Enter Room
                </button>
              ) : (
                <button className="disabled-button" disabled title="Waiting for Admin to start">
                  🔒 Waiting...
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default MyRooms;