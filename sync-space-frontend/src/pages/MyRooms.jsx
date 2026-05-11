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

  const token = () => localStorage.getItem('token');

  const fetchRooms = async (silent = false) => {
    try {
      if (!token()) { navigate('/login'); return; }
      if (!silent) setLoading(true);
      const res = await axios.get('http://localhost:8080/api/rooms/my-rooms', {
        headers: { Authorization: `Bearer ${token()}` }
      });
      setRooms(res.data);
    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      }
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    fetchRooms(false);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(
        'http://localhost:8080/api/rooms/create',
        { name: newRoomName, description: newRoomDesc },
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setCreatedRoom(res.data);
      setNewRoomName('');
      setNewRoomDesc('');
      fetchRooms(true);
    } catch {
      alert('Failed to create room.');
    }
  };

  const handleJoin = async (e) => {
    e.preventDefault();
    try {
      await axios.post(
        `http://localhost:8080/api/rooms/join/${joinCode.trim().toUpperCase()}`,
        {},
        { headers: { Authorization: `Bearer ${token()}` } }
      );
      setJoinCode('');
      setActiveAction('none');
      fetchRooms(true);
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

      {/* ── Header ── */}
      <div className="dashboard-header">
        <h1 className="rooms-title">Workspace</h1>
        <div className="action-buttons">
          <button
            className={`action-btn ${activeAction === 'create' ? 'active' : ''}`}
            onClick={() => { setActiveAction(activeAction === 'create' ? 'none' : 'create'); setCreatedRoom(null); }}
          >
            ➕ Create Room
          </button>
          <button
            className={`action-btn ${activeAction === 'join' ? 'active' : ''}`}
            onClick={() => setActiveAction(activeAction === 'join' ? 'none' : 'join')}
          >
            🔍 Join Room
          </button>
        </div>
      </div>

      {/* ── Create / Join panel ── */}
      <div className={`dropdown-container ${activeAction !== 'none' ? 'open' : ''}`}>

        {activeAction === 'create' && !createdRoom && (
          <form className="action-form" onSubmit={handleCreate}>
            <h3>Create a New Space</h3>
            <div className="input-group">
              <input
                type="text" placeholder="Room Name" required
                value={newRoomName} onChange={(e) => setNewRoomName(e.target.value)}
              />
              <input
                type="text" placeholder="Description (optional)"
                value={newRoomDesc} onChange={(e) => setNewRoomDesc(e.target.value)}
              />
              <button type="submit" className="submit-btn">Create</button>
            </div>
          </form>
        )}

        {activeAction === 'create' && createdRoom && (
          <div className="action-form" style={{ textAlign: 'center' }}>
            <h3>🎉 Room Created!</h3>
            <p>Share this code so members can join:</p>
            <div className="code-display">
              <span className="join-code-big">{createdRoom.joinCode}</span>
              <button className="copy-btn" onClick={() => copyCode(createdRoom.joinCode)}>📋 Copy</button>
            </div>
            <button
              className="submit-btn"
              onClick={() => navigate(`/room/${createdRoom.id}`, { state: { role: 'ADMIN' } })}
            >
              Enter Room →
            </button>
          </div>
        )}

        {activeAction === 'join' && (
          <form className="action-form" onSubmit={handleJoin}>
            <h3>Join an Existing Space</h3>
            <div className="input-group">
              <input
                type="text" placeholder="Enter 8-character code" required
                value={joinCode} onChange={(e) => setJoinCode(e.target.value)}
                style={{ textTransform: 'uppercase' }}
              />
              <button type="submit" className="submit-btn">Join</button>
            </div>
          </form>
        )}
      </div>

      {/* ── Room grid ── */}
      <div className="rooms-grid">
        {rooms.length === 0 && (
          <div className="empty-state">No rooms yet. Create one or join with a code.</div>
        )}

        {rooms.map((room) => (
          <div key={room.roomId} className={`room-card status-border-${room.status.toLowerCase()}`}>
            <div className="room-info">
              <h2>{room.roomName}</h2>
              {/* Admin sees the join code on the card */}
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

              {room.status === 'ACTIVE' && (
                <button
                  className="enter-button"
                  onClick={() => navigate(`/room/${room.roomId}`, { state: { role: room.role } })}
                >
                  Enter Room
                </button>
              )}

              {room.status === 'INACTIVE' && (
                <button className="disabled-button" disabled>Closed</button>
              )}
            </div>
          </div>
        ))}
      </div>

    </div>
  );
};

export default MyRooms;