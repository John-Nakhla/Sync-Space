import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { jwtDecode } from 'jwt-decode';
import api from '../api/api';
import SharedWhiteboard from '../components/SharedWhiteboard';
import ChatRoom from './ChatRoom';

import './RoomHub.css'; 

const RoomHub = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();

  const [activeView, setActiveView] = useState(null); // null = hub/home
  const [roomDetails, setRoomDetails] = useState({ name: '', joinCode: '' });
  const [members, setMembers] = useState([]);
  const [userRole, setUserRole] = useState('MEMBER');
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // State to track if the code was copied
  const [copied, setCopied] = useState(false);

  const token = localStorage.getItem('token');
  const decoded = token ? jwtDecode(token) : null;
  const currentUserId = decoded?.userId;

  const canDraw = userRole === 'ADMIN' || userRole === 'CONTRIBUTOR';

  // ✅ UPDATED: Added background polling for live member/role updates
  useEffect(() => {
    // 1. Initial data fetch when page loads
    const fetchInitialData = async () => {
      try {
        const [roomRes, membersRes] = await Promise.all([
          api.get(`/api/rooms/${roomId}`),
          api.get(`/api/rooms/${roomId}/members`),
        ]);
        
        setRoomDetails({ name: roomRes.data.name, joinCode: roomRes.data.joinCode });
        setMembers(membersRes.data);
        
        const me = membersRes.data.find(m => String(m.id) === String(currentUserId));
        if (me) setUserRole(me.role);
        
      } catch (err) {
        console.error("ROOM HUB ERROR:", err.response || err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();

    // 2. Background Polling: Fetch updated members every 5 seconds
    const intervalId = setInterval(async () => {
      try {
        const membersRes = await api.get(`/api/rooms/${roomId}/members`);
        setMembers(membersRes.data);
        
        // Also update the role just in case an admin promoted you!
        const me = membersRes.data.find(m => String(m.id) === String(currentUserId));
        if (me) setUserRole(me.role);
      } catch (err) {
        // Silently ignore background errors so it doesn't disrupt the user
      }
    }, 5000); 

    // 3. Cleanup the interval when the user leaves the room
    return () => clearInterval(intervalId);

  }, [roomId, currentUserId]);

  // Function to handle the copy action with visual feedback
  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomDetails.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); // Reset after 2 seconds
    } catch (err) {
      console.error("Failed to copy code: ", err);
      alert("Failed to copy. Your browser might block clipboard access.");
    }
  };

  if (loading) {
    return (
      <div className="rh-loading">
        <div className="rh-spinner" />
      </div>
    );
  }

  // ── Full-screen views ──────────────────────────────────────────────────────
  if (activeView === 'chat') {
    return (
      <div className="rh-fullview">
        <button className="rh-back-pill" onClick={() => setActiveView(null)}>
          ← Back to Room
        </button>
        <ChatRoom embedded />
      </div>
    );
  }

  if (activeView === 'whiteboard') {
    return (
      <div className="rh-fullview">
        <button className="rh-back-pill" onClick={() => setActiveView(null)}>
          ← Back to Room
        </button>
        <SharedWhiteboard roomId={roomId} canDraw={canDraw} />
      </div>
    );
  }

  if (activeView === 'members') {
    return (
      <div className="rh-fullview rh-members-view">
        <div className="rh-members-header">
          <button className="rh-back-pill" onClick={() => setActiveView(null)}>
            ← Back to Room
          </button>
          <h2>Members <span>({members.length})</span></h2>
        </div>
        <div className="rh-members-grid">
          {members.map(m => (
            <div key={m.id} className="rh-member-card">
              <div className="rh-member-avatar">{m.username.charAt(0).toUpperCase()}</div>
              <div className="rh-member-info">
                <span className="rh-member-name">{m.username}</span>
                <span className={`rh-role-badge ${m.role.toLowerCase()}`}>{m.role}</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── Hub landing ────────────────────────────────────────────────────────────
  return (
    <div className="rh-hub">
      {/* Background blobs */}
      <div className="rh-blob rh-blob-1" />
      <div className="rh-blob rh-blob-2" />

      {/* Header */}
      <div className="rh-hub-header">
        <button className="rh-back-pill ghost" onClick={() => navigate('/my-rooms')}>
          ← My Rooms
        </button>
        <div className="rh-hub-title-row">
          <h1 className="rh-hub-title">{roomDetails.name}</h1>
          <span className={`rh-role-badge ${userRole.toLowerCase()}`}>{userRole}</span>
        </div>
        <p className="rh-hub-sub">Choose where you want to go</p>

        {userRole === 'ADMIN' && (
          <div className="rh-code-row">
            <button className="rh-code-toggle" onClick={() => setShowCode(!showCode)}>
              {showCode ? ' Hide Code' : ' Show Join Code'}
            </button>
            {showCode && (
              <div className="rh-code-pill">
                <span>{roomDetails.joinCode}</span>
                <button 
                  onClick={handleCopyCode} 
                  className={copied ? "copied-btn" : ""}
                >
                  {copied ? 'Copied! ✓' : 'Copy'}
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Cards */}
      <div className="rh-cards">
        <button className="rh-card rh-card-chat" onClick={() => setActiveView('chat')}>
          <div className="rh-card-icon">💬</div>
          <div className="rh-card-body">
            <div className="rh-card-title">Chat</div>
            <div className="rh-card-desc">Messages, replies & file sharing — all persisted</div>
          </div>
          <div className="rh-card-arrow">→</div>
        </button>

        <button className="rh-card rh-card-board" onClick={() => setActiveView('whiteboard')}>
          <div className="rh-card-icon">🎨</div>
          <div className="rh-card-body">
            <div className="rh-card-title">Whiteboard</div>
            <div className="rh-card-desc">
              {canDraw ? 'Draw, annotate & brainstorm live' : 'View the live shared canvas'}
            </div>
          </div>
          <div className="rh-card-arrow">→</div>
        </button>

        <button className="rh-card rh-card-members" onClick={() => setActiveView('members')}>
          <div className="rh-card-icon">👥</div>
          <div className="rh-card-body">
            <div className="rh-card-title">Members</div>
            <div className="rh-card-desc">{members.length} people in this room</div>
          </div>
          <div className="rh-card-arrow">→</div>
        </button>
      </div>
    </div>
  );
};

export default RoomHub;