import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import SharedWhiteboard from '../components/SharedWhiteboard';
import './Room.css';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();

  const [userRole, setUserRole] = useState(location.state?.role || 'MEMBER');
  const [roomStatus, setRoomStatus] = useState('WAITING');
  const [roomDetails, setRoomDetails] = useState({ name: '', joinCode: '' });
  const [members, setMembers] = useState([]);
  const [showCode, setShowCode] = useState(false); // Toggle for Admin to see code inside room

  // Only Admin and Contributors can draw while ACTIVE
  const canDraw = (userRole === 'ADMIN' || userRole === 'CONTRIBUTOR') && roomStatus === 'ACTIVE';

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      // Fetch Room info
      const res = await axios.get(`http://localhost:8080/api/rooms/${roomId}`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setRoomStatus(res.data.status);
      setRoomDetails({ name: res.data.name, joinCode: res.data.joinCode });

      // Fetch Members list
      const mems = await axios.get(`http://localhost:8080/api/rooms/${roomId}/members`, { 
        headers: { Authorization: `Bearer ${token}` } 
      });
      setMembers(mems.data);
    } catch (e) {
      // If blocked (e.g. member trying to enter inactive room directly via URL)
      navigate('/my-rooms');
    }
  };

  useEffect(() => {
    fetchData();

    // WebSocket Connection
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/room/${roomId}`, (msg) => {
          const data = JSON.parse(msg.body);
          if (String(data.roomId) !== String(roomId)) return;

          if (data.type === 'START_SIGNAL') {
            setRoomStatus('ACTIVE'); // Pulls everyone from lobby to workspace
          } else if (data.type === 'RESTART_SIGNAL') {
            setRoomStatus('WAITING');
          } else if (data.type === 'END_SIGNAL') {
            alert('This room was permanently closed by the Admin.');
            navigate('/my-rooms'); // Kicks everyone out
          } else if (data.type === 'ROLE_UPDATED') {
            // Update my own role if I was promoted
            const myId = localStorage.getItem('userId');
            if (String(data.userId) === String(myId)) {
              setUserRole('CONTRIBUTOR');
              alert('🎉 You have been promoted to Contributor! You can now draw.');
            }
            fetchData(); // Refresh list to show new badge
          }
        });
      }
    });

    client.activate();
    return () => client.deactivate();
  }, [roomId, navigate]);

  // Actions
  const handleStart = async () => {
    const endpoint = roomStatus === 'ENDED' ? 'restart' : 'start';
    const token = localStorage.getItem('token');
    await axios.post(`http://localhost:8080/api/rooms/${roomId}/${endpoint}`, {}, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
  };

  const handleCloseAll = async () => {
    if (!window.confirm('Close this room for everyone? This kicks all members out.')) return;
    const token = localStorage.getItem('token');
    await axios.post(`http://localhost:8080/api/rooms/${roomId}/end`, {}, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
  };

  const handlePromote = async (targetUserId) => {
    const token = localStorage.getItem('token');
    await axios.patch(`http://localhost:8080/api/rooms/${roomId}/promote/${targetUserId}`, {}, { 
      headers: { Authorization: `Bearer ${token}` } 
    });
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomDetails.joinCode);
    alert(`Code "${roomDetails.joinCode}" copied!`);
  };

  // ── LOBBY VIEW (Room is WAITING or ENDED) ──
  if (roomStatus === 'WAITING' || roomStatus === 'ENDED') {
    return (
      <div className="lobby-overlay">
        <div className="lobby-card">
          <h2>Lobby: {roomDetails.name}</h2>
          {userRole === 'ADMIN' ? (
            <>
              <p>You are the Admin. The room is currently paused.</p>
              <div className="code-display" style={{ marginBottom: '20px' }}>
                <span className="join-code-big">{roomDetails.joinCode}</span>
                <button className="copy-btn" onClick={copyCode}>📋 Copy Code</button>
              </div>
              <button className="start-btn" onClick={handleStart}>🚀 Start Session</button>
            </>
          ) : (
            <div className="waiting-mode">
              <p>Waiting for the Admin to start the session...</p>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── WORKSPACE VIEW (Room is ACTIVE) ──
  return (
    <div className="workspace">
      {/* SIDEBAR */}
      <div className="sidebar">
        <div className="sidebar-header">
          <h3>{roomDetails.name}</h3>
          <span className={`role-badge ${userRole.toLowerCase()}`}>{userRole}</span>
        </div>

        {/* Admin's View Code Button */}
        {userRole === 'ADMIN' && (
          <div className="sidebar-section">
            <button className="toggle-code-btn" onClick={() => setShowCode(!showCode)}>
              {showCode ? '🙈 Hide Code' : '👁 Show Join Code'}
            </button>
            {showCode && (
              <div className="code-display-small" style={{ marginTop: '10px' }}>
                <span>{roomDetails.joinCode}</span>
                <button className="copy-btn-small" onClick={copyCode}>📋</button>
              </div>
            )}
          </div>
        )}

        <hr className="sidebar-divider" />
        
        {/* Leaving vs Closing */}
        <button className="leave-btn" onClick={() => navigate('/my-rooms')}>🚪 Leave Room</button>
        {userRole === 'ADMIN' && (
          <div className="danger-zone">
            <button className="danger-btn" onClick={handleCloseAll}>🔴 Close Room for All</button>
          </div>
        )}

        <hr className="sidebar-divider" />

        {/* Member List & Promotion */}
        <div className="members-section">
          <h4>👥 Members ({members.length})</h4>
          <ul className="members-list">
            {members.map(member => (
              <li key={member.id} className="member-item">
                <div className="member-row">
                  <span className="member-name">{member.username}</span>
                  <span className={`role-badge-sm ${member.role.toLowerCase()}`}>{member.role}</span>
                </div>
                {/* Promote Button (Only Admin sees it, only works on Members) */}
                {userRole === 'ADMIN' && member.role === 'MEMBER' && (
                  <button className="promote-btn" onClick={() => handlePromote(member.id)}>
                    ⭐ Promote to Contributor
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* WHITEBOARD */}
      <div className="canvas-container">
        <SharedWhiteboard roomId={roomId} canDraw={canDraw} />
      </div>
    </div>
  );
};

export default Room;