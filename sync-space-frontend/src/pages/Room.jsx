import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import SharedWhiteboard from '../components/SharedWhiteboard';
import './Room.css';

const API = 'http://localhost:8080/api/rooms';

const Room = () => {
  const { roomId } = useParams();
  const navigate   = useNavigate();
  const location   = useLocation();

  const [userRole,    setUserRole]    = useState(location.state?.role || 'MEMBER');
  const [roomStatus,  setRoomStatus]  = useState('WAITING');
  const [roomDetails, setRoomDetails] = useState({ name: '', joinCode: '' });
  const [members,     setMembers]     = useState([]);
  const [showCode,    setShowCode]    = useState(false);
  const [activeView,  setActiveView]  = useState('whiteboard');
  const [toast,       setToast]       = useState(null);

  // ── Refs to avoid stale closures inside WebSocket handlers ───────────────
  const navigateRef = useRef(navigate);
  const userRoleRef = useRef(userRole);

  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => { userRoleRef.current = userRole; }, [userRole]);

  // canDraw re-computes automatically whenever userRole or roomStatus changes
  const canDraw = (userRole === 'ADMIN' || userRole === 'CONTRIBUTOR') && roomStatus === 'ACTIVE';

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const authHeaders = () => ({
    headers: { Authorization: `Bearer ${localStorage.getItem('token')}` }
  });

  // ── fetchData: syncs room status, members, AND current user's role ────────
  const fetchData = useCallback(async () => {
    try {
      const token = localStorage.getItem('token');
      const myId  = localStorage.getItem('userId');
      if (!token) { navigate('/login'); return; }

      const [roomRes, membersRes] = await Promise.all([
        axios.get(`${API}/${roomId}`, { headers: { Authorization: `Bearer ${token}` } }),
        axios.get(`${API}/${roomId}/members`, { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      setRoomStatus(roomRes.data.status);
      setRoomDetails({ name: roomRes.data.name, joinCode: roomRes.data.joinCode });
      setMembers(membersRes.data);

      // Always sync current user's role from the members list so promotion
      // works correctly even if the WS userId comparison ever drifts.
      const me = membersRes.data.find(m => String(m.id) === String(myId));
      if (me) setUserRole(me.role);

    } catch (err) {
      if (err.response?.status === 401 || err.response?.status === 403) {
        localStorage.removeItem('token');
        navigate('/login');
      } else {
        navigate('/my-rooms');
      }
    }
  }, [roomId, navigate]);

  // ── FIX 1: Poll every 3 s while in WAITING lobby ─────────────────────────
  // Guarantees members auto-switch to the workspace even if they missed the
  // WebSocket START_SIGNAL (race condition: WS subscribe races with page load).
  useEffect(() => {
    if (roomStatus !== 'WAITING') return;
    const interval = setInterval(fetchData, 3000);
    return () => clearInterval(interval);
  }, [roomStatus, fetchData]);

  // ── Initial load + WebSocket setup ───────────────────────────────────────
  useEffect(() => {
    fetchData();

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/room/${roomId}`, (msg) => {
          const data = JSON.parse(msg.body);
          if (String(data.roomId) !== String(roomId)) return;

          const myId = localStorage.getItem('userId');

          switch (data.type) {

            case 'START_SIGNAL':
              // Instantly switch lobby → workspace for all WS subscribers
              setRoomStatus('ACTIVE');
              showToast('Session is now live!', 'success');
              break;

            case 'RESTART_SIGNAL':
              setRoomStatus('WAITING');
              showToast('Room reset to lobby.', 'info');
              break;

            case 'END_SIGNAL':
              // Admin already confirmed via dialog — redirect silently.
              // Members get an informational alert.
              if (userRoleRef.current === 'ADMIN') {
                navigateRef.current('/my-rooms');
              } else {
                alert('This room has been closed by the Admin.');
                navigateRef.current('/my-rooms');
              }
              break;

            case 'ROLE_UPDATED':
              if (String(data.userId) === String(myId)) {
                // Optimistic instant update — grants draw without waiting for fetchData
                setUserRole('CONTRIBUTOR');
                showToast('You are now a Contributor! You can draw.', 'success');
              }
              // fetchData re-syncs members list AND re-confirms role from backend
              fetchData();
              break;

            case 'KICK_SIGNAL':
              if (String(data.userId) === String(myId)) {
                alert('You have been removed from this room.');
                navigateRef.current('/my-rooms');
              } else {
                fetchData();
              }
              break;

            default:
              break;
          }
        });
      },
    });

    client.activate();
    return () => client.deactivate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── Admin actions ─────────────────────────────────────────────────────────

  const handleStart = async () => {
    try {
      const endpoint = roomStatus === 'ENDED' ? 'restart' : 'start';
      await axios.post(`${API}/${roomId}/${endpoint}`, {}, authHeaders());

      // ── FIX 2: Optimistic local update for the admin ──────────────────────
      // The admin triggered the action so update their own view immediately.
      // The WebSocket START_SIGNAL / RESTART_SIGNAL handles every other client.
      if (endpoint === 'start') {
        setRoomStatus('ACTIVE');           // lobby → workspace instantly for admin
        showToast('Session is now live!', 'success');
      } else {
        setRoomStatus('WAITING');          // workspace → lobby instantly for admin
        showToast('Room reset to lobby.', 'info');
      }
    } catch (err) {
      showToast('Failed to update session. Please try again.', 'warning');
    }
  };

  const handleCloseAll = async () => {
    if (!window.confirm('Close this room for everyone? All members will be redirected.')) return;
    try {
      await axios.post(`${API}/${roomId}/end`, {}, authHeaders());
      // END_SIGNAL WebSocket message redirects everyone including admin
    } catch (err) {
      showToast('Failed to close room.', 'warning');
    }
  };

  const handlePromote = async (targetUserId) => {
    try {
      await axios.patch(`${API}/${roomId}/promote/${targetUserId}`, {}, authHeaders());
      showToast('Member promoted to Contributor.', 'success');
    } catch (err) {
      showToast('Failed to promote member.', 'warning');
    }
  };

  const handleRemove = async (targetUserId, username) => {
    if (!window.confirm(`Remove "${username}" from this room?`)) return;
    try {
      await axios.delete(`${API}/${roomId}/remove/${targetUserId}`, authHeaders());
      showToast(`${username} removed.`, 'warning');
    } catch (err) {
      showToast('Failed to remove member.', 'warning');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomDetails.joinCode);
    showToast(`Code "${roomDetails.joinCode}" copied!`, 'success');
  };

  // ── Lobby / Ended screen ──────────────────────────────────────────────────
  if (roomStatus === 'WAITING' || roomStatus === 'ENDED') {
    return (
      <div className="lobby-overlay">
        {/* Toast is visible inside the lobby too */}
        {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

        <div className="lobby-card">
          <div className="lobby-badge">{roomStatus === 'ENDED' ? 'ENDED' : 'LOBBY'}</div>
          <h2>{roomDetails.name}</h2>

          {userRole === 'ADMIN' ? (
            <>
              <p className="lobby-hint">Share this code so members can join:</p>
              <div className="code-display">
                <span className="join-code-big">{roomDetails.joinCode}</span>
                <button className="copy-btn" onClick={copyCode}>📋 Copy</button>
              </div>
              <button className="start-btn" onClick={handleStart}>
                {roomStatus === 'ENDED' ? '🔄 Restart Session' : '🚀 Start Session'}
              </button>
            </>
          ) : (
            <div className="waiting-mode">
              <div className="spinner" />
              <p>Waiting for the Admin to start the session…</p>
            </div>
          )}

          <button className="lobby-leave-btn" onClick={() => navigate('/my-rooms')}>
            ← Back to My Rooms
          </button>
        </div>
      </div>
    );
  }

  // ── Active workspace ──────────────────────────────────────────────────────
  return (
    <div className="workspace">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      <div className="sidebar">
        <div className="sidebar-header">
          <h3 className="room-title-sidebar" title={roomDetails.name}>{roomDetails.name}</h3>
          <span className={`role-badge ${userRole.toLowerCase()}`}>{userRole}</span>
        </div>

        {userRole === 'ADMIN' && (
          <div className="sidebar-section">
            <button className="toggle-code-btn" onClick={() => setShowCode(!showCode)}>
              {showCode ? '🙈 Hide Code' : '👁 Show Join Code'}
            </button>
            {showCode && (
              <div className="code-display-small">
                <span>{roomDetails.joinCode}</span>
                <button className="copy-btn-small" onClick={copyCode}>📋</button>
              </div>
            )}
          </div>
        )}

        <hr className="sidebar-divider" />

        <div className="view-switcher">
          <button
            className={`view-tab ${activeView === 'whiteboard' ? 'active' : ''}`}
            onClick={() => setActiveView('whiteboard')}
          >
            🖊 Whiteboard
          </button>
          <button
            className={`view-tab ${activeView === 'members' ? 'active' : ''}`}
            onClick={() => setActiveView('members')}
          >
            👥 Members ({members.length})
          </button>
        </div>

        <hr className="sidebar-divider" />

        <button className="leave-btn" onClick={() => navigate('/my-rooms')}>🚪 Leave Room</button>

        {userRole === 'ADMIN' && (
          <div className="danger-zone">
            <p className="danger-label">Admin Controls</p>
            <button className="danger-btn" onClick={handleCloseAll}>🔴 Close Room for All</button>
          </div>
        )}

        <hr className="sidebar-divider" />

        <div className="members-section">
          <h4>👥 Members ({members.length})</h4>
          <ul className="members-list">
            {members.map((member) => (
              <li key={member.id} className="member-item">
                <div className="member-row">
                  <span className="member-name">{member.username}</span>
                  <span className={`role-badge-sm ${member.role.toLowerCase()}`}>{member.role}</span>
                </div>
                {userRole === 'ADMIN' && member.role !== 'ADMIN' && (
                  <div className="member-actions">
                    {member.role === 'MEMBER' && (
                      <button className="promote-btn" onClick={() => handlePromote(member.id)}>
                        ⭐ Make Contributor
                      </button>
                    )}
                    <button className="remove-btn" onClick={() => handleRemove(member.id, member.username)}>
                      ✕ Remove
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="canvas-container">
        {activeView === 'whiteboard' && (
          <SharedWhiteboard roomId={roomId} canDraw={canDraw} />
        )}
        {activeView === 'members' && (
          <div className="members-fullview">
            <h2>Room Members</h2>
            <div className="members-fullgrid">
              {members.map((member) => (
                <div key={member.id} className="member-card">
                  <div className="member-card-avatar">{member.username.charAt(0).toUpperCase()}</div>
                  <div className="member-card-info">
                    <span className="member-card-name">{member.username}</span>
                    <span className={`role-badge-sm ${member.role.toLowerCase()}`}>{member.role}</span>
                  </div>
                  {userRole === 'ADMIN' && member.role !== 'ADMIN' && (
                    <div className="member-card-actions">
                      {member.role === 'MEMBER' && (
                        <button className="promote-btn" onClick={() => handlePromote(member.id)}>
                          ⭐ Make Contributor
                        </button>
                      )}
                      <button className="remove-btn" onClick={() => handleRemove(member.id, member.username)}>
                        ✕ Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Room;