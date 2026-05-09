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

  // Added 'isSilent' so the loading spinner doesn't flash every 3 seconds
  const fetchRooms = async (isSilent = false) => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/login');
        return;
      }
      if (!isSilent) setLoading(true); 

      const res = await axios.get('http://localhost:8080/api/rooms/my-rooms', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRooms(res.data);
    } catch (err) {
      if (err.response && (err.response.status === 401 || err.response.status === 403)) {
        localStorage.removeItem('token');
        alert('Your session has expired. Please log in again.');
        navigate('/login');
      }
    } finally {
      if (!isSilent) setLoading(false);
    }
  };

  // Auto-refresh the dashboard every 3 seconds so Members see the button unlock instantly
  useEffect(() => {
    fetchRooms(false); // Initial load with spinner
    const interval = setInterval(() => {
      fetchRooms(true); // Silent background check
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        'http://localhost:8080/api/rooms/create',
        { name: newRoomName, description: newRoomDesc },
        { headers: { Authorization: `Bearer ${token}` } }
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
      const token = localStorage.getItem('token');
      await axios.post(
        `http://localhost:8080/api/rooms/join/${joinCode.trim().toUpperCase()}`,
        {}, { headers: { Authorization: `Bearer ${token}` } }
      );
      
      setJoinCode('');
      setActiveAction('none');
      fetchRooms(true);
      alert('Room joined! It is now listed below. You can enter once the Admin starts the session.');
    } catch (err) {
      alert(err.response?.data?.message || 'Invalid code or room is closed.');
    }
  };

  // ONE-CLICK START: If Admin clicks "Start" on dashboard, fire the API immediately
  const handleAdminStart = async (roomId, currentStatus) => {
    try {
      const endpoint = currentStatus === 'ENDED' ? 'restart' : 'start';
      const token = localStorage.getItem('token');
      
      await axios.post(`http://localhost:8080/api/rooms/${roomId}/${endpoint}`, {}, { 
        headers: { Authorization: `Bearer ${token}` } 
      });

      // After starting, push them straight into the room
      navigate(`/room/${roomId}`, { state: { role: 'ADMIN' } });
    } catch (err) {
      alert('Failed to start the room. ' + (err.response?.data?.message || ''));
      // If it fails, navigate to the Lobby anyway so they can try again manually
      navigate(`/room/${roomId}`, { state: { role: 'ADMIN' } });
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

        {activeAction === 'create' && createdRoom && (
          <div className="action-form" style={{ textAlign: 'center' }}>
            <h3>🎉 Room Created!</h3>
            <p>Share this code so members can join:</p>
            <div className="code-display">
              <span className="join-code-big">{createdRoom.joinCode}</span>
              <button className="copy-btn" onClick={() => copyCode(createdRoom.joinCode)}>📋 Copy</button>
            </div>
            {/* Enter Lobby Button for newly created rooms */}
            <button className="submit-btn" style={{ marginTop: '10px' }} onClick={() => navigate(`/room/${createdRoom.id}`, { state: { role: 'ADMIN' } })}>
              Enter Lobby →
            </button>
          </div>
        )}

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

      <div className="rooms-grid">
        {rooms.map((room) => {
          const currentRoomId = room.roomId || room.id; 

          return (
            <div key={currentRoomId} className="room-card">
              <div className="room-info">
                <h2>{room.roomName || room.name}</h2>
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
                
                {/* 1. ADMIN START BUTTON: Instantly calls the API to activate the room */}
                {room.role === 'ADMIN' && (room.status === 'WAITING' || room.status === 'ENDED') ? (
                  <button className="start-button" onClick={() => handleAdminStart(currentRoomId, room.status)}>
                    🚀 Start Session
                  </button>
                ) : room.status === 'ACTIVE' ? (
                  /* 2. MEMBER ENTER BUTTON: Will magically appear when the Admin starts the room thanks to auto-refresh */
                  <button className="enter-button" onClick={() => navigate(`/room/${currentRoomId}`, { state: { role: room.role } })}>
                    Enter Room
                  </button>
                ) : (
                  /* 3. MEMBER WAITING STATE */
                  <button className="disabled-button" disabled title="Waiting for Admin to start">
                    🔒 Waiting...
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default MyRooms;