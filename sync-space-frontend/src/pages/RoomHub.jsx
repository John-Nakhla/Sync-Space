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

  const [activeView, setActiveView] = useState(null);
  const [roomDetails, setRoomDetails] = useState({ name: '', joinCode: '' });
  const [members, setMembers] = useState([]);
  const [userRole, setUserRole] = useState('MEMBER');
  const [showCode, setShowCode] = useState(false);
  const [loading, setLoading] = useState(true);
  
  // ✅ FIX 1: Add state to hold the real username
  const [myUsername, setMyUsername] = useState('Anonymous');
  const [copied, setCopied] = useState(false);

  const token = localStorage.getItem('token');
  const decoded = token ? jwtDecode(token) : null;
  const currentUserId = decoded?.userId;

  const canDraw = userRole === 'ADMIN' || userRole === 'CONTRIBUTOR';

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [roomRes, membersRes] = await Promise.all([
          api.get(`/api/rooms/${roomId}`),
          api.get(`/api/rooms/${roomId}/members`),
        ]);
        
        setRoomDetails({ name: roomRes.data.name, joinCode: roomRes.data.joinCode });
        setMembers(membersRes.data);
        
        const me = membersRes.data.find(m => String(m.id) === String(currentUserId));
        if (me) {
            setUserRole(me.role);
            setMyUsername(me.username); // ✅ Extract real username
        }
        
      } catch (err) {
        console.error("ROOM HUB ERROR:", err.response || err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchInitialData();

    const intervalId = setInterval(async () => {
      try {
        const membersRes = await api.get(`/api/rooms/${roomId}/members`);
        setMembers(membersRes.data);
        
        const me = membersRes.data.find(m => String(m.id) === String(currentUserId));
        if (me) {
            setUserRole(me.role);
            setMyUsername(me.username); // ✅ Keep username updated
        }
      } catch (err) {
        // Silently ignore background errors
      }
    }, 5000); 

    return () => clearInterval(intervalId);

  }, [roomId, currentUserId]);

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(roomDetails.joinCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000); 
    } catch (err) {
      console.error("Failed to copy code: ", err);
      alert("Failed to copy. Your browser might block clipboard access.");
    }
  };

  // ✅ FIX 2: Add handlePromote function for the Admin
  const handlePromote = async (targetUserId) => {
    try {
      await api.patch(`/api/rooms/${roomId}/promote/${targetUserId}`);
      // Polling will refresh the list automatically in 5s
    } catch (err) {
      console.error("Promotion failed:", err);
    }
  };

  if (loading) {
    return (
      <div className="rh-loading">
        <div className="rh-spinner" />
      </div>
    );
  }

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
        {/* ✅ FIX 3: Pass isHost and username to the whiteboard */}
        <SharedWhiteboard 
          roomId={roomId} 
          canDraw={canDraw} 
          username={myUsername} 
          isHost={userRole === 'ADMIN'} 
        />
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
                
                {/* ✅ FIX 4: Add Promote Button for Admin */}
                {userRole === 'ADMIN' && m.role === 'MEMBER' && (
                  <button 
                    className="rh-promote-btn" 
                    onClick={() => handlePromote(m.id)}
                    style={{ marginLeft: '10px', fontSize: '12px', padding: '4px 8px', cursor: 'pointer', background: '#1e90ff', color: 'white', border: 'none', borderRadius: '4px' }}
                  >
                    Promote to Contributor
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="rh-hub">
      <div className="rh-blob rh-blob-1" />
      <div className="rh-blob rh-blob-2" />

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