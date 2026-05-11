import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import SharedWhiteboard from '../components/SharedWhiteboard';
import './Room.css';

const API = 'http://localhost:8080/api/rooms';

const Room = () => {
  const { roomId }  = useParams();
  const navigate    = useNavigate();
  const location    = useLocation();

  const [userRole,      setUserRole]      = useState(location.state?.role || 'MEMBER');
  const [roomDetails,   setRoomDetails]   = useState({ name: '', joinCode: '' });
  const [members,       setMembers]       = useState([]);
  const [showCode,      setShowCode]      = useState(false);
  const [activeView,    setActiveView]    = useState('whiteboard');
  const [toast,         setToast]         = useState(null);
  const [closedModal,   setClosedModal]   = useState({ show: false, message: '' });
  const [waitingForAdmin, setWaitingForAdmin] = useState(false);

  const navigateRef = useRef(navigate);
  const userRoleRef = useRef(userRole);
  useEffect(() => { navigateRef.current = navigate; }, [navigate]);
  useEffect(() => { userRoleRef.current = userRole;  }, [userRole]);

  const canDraw = userRole === 'ADMIN' || userRole === 'CONTRIBUTOR';

  const showToast = (msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const authHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  // Refresh room + members (used by WS events)
  const fetchData = useCallback(async () => {
    try {
      const myId = localStorage.getItem('userId');
      const [roomRes, membersRes] = await Promise.all([
        axios.get(`${API}/${roomId}`,         { headers: authHeaders() }),
        axios.get(`${API}/${roomId}/members`, { headers: authHeaders() }),
      ]);
      setRoomDetails({ name: roomRes.data.name, joinCode: roomRes.data.joinCode });
      setMembers(membersRes.data);
      const me = membersRes.data.find(m => String(m.id) === String(myId));
      if (me) {
        setUserRole(me.role);
        userRoleRef.current = me.role;
      }
    } catch { /* handled by init */ }
  }, [roomId]);

  // ── Initial load + WebSocket ──────────────────────────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    const myId  = localStorage.getItem('userId');
    if (!token) { navigate('/login'); return; }

    const init = async () => {
      try {
        const [roomRes, membersRes] = await Promise.all([
          axios.get(`${API}/${roomId}`,         { headers: { Authorization: `Bearer ${token}` } }),
          axios.get(`${API}/${roomId}/members`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);

        setRoomDetails({ name: roomRes.data.name, joinCode: roomRes.data.joinCode });
        setMembers(membersRes.data);

        const me      = membersRes.data.find(m => String(m.id) === String(myId));
        const myRole  = me?.role || location.state?.role || 'MEMBER';
        setUserRole(myRole);
        userRoleRef.current = myRole;

        if (myRole === 'ADMIN') {
          // Tell server admin is here → broadcasts ADMIN_ENTERED to waiting members
          await axios.post(`${API}/${roomId}/admin-enter`, {},
            { headers: { Authorization: `Bearer ${token}` } });
        } else {
          // Check if admin is already in the room
          const presRes = await axios.get(`${API}/${roomId}/admin-present`,
            { headers: { Authorization: `Bearer ${token}` } });
          if (!presRes.data.adminPresent) {
            setWaitingForAdmin(true);
          }
        }
      } catch (err) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          localStorage.removeItem('token');
          navigate('/login');
        } else {
          navigate('/my-rooms');
        }
      }
    };

    init();

    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/room/${roomId}`, (msg) => {
          const data  = JSON.parse(msg.body);
          if (String(data.roomId) !== String(roomId)) return;
          const myId  = localStorage.getItem('userId');

          switch (data.type) {

            // Admin just entered → unblock waiting members
            case 'ADMIN_ENTERED':
              setWaitingForAdmin(false);
              fetchData();
              break;

            // Room closed by admin
            case 'CLOSE_SIGNAL':
              // Admin already navigated away in handleClose — this is for members only
              if (userRoleRef.current !== 'ADMIN') {
                setClosedModal({
                  show: true,
                  message: 'This room has been closed by the admin.',
                });
              }
              break;

            case 'MEMBER_JOINED':
              fetchData();
              break;

            case 'MEMBER_LEFT':
              if (String(data.userId) !== String(myId)) {
                showToast(`${data.username} left the room.`, 'info');
                fetchData();
              }
              break;

            case 'ROLE_UPDATED':
              if (String(data.userId) === String(myId)) {
                setUserRole('CONTRIBUTOR');
                userRoleRef.current = 'CONTRIBUTOR';
                showToast('🎨 You are now a Contributor — you can draw!', 'success');
              } else {
                showToast(`⭐ ${data.username} is now a Contributor and can draw.`, 'success');
              }
              fetchData();
              break;

            case 'KICK_SIGNAL':
              if (String(data.userId) === String(myId)) {
                setClosedModal({ show: true, message: 'You have been removed from this room.' });
              } else {
                fetchData();
              }
              break;

            default: break;
          }
        });
      },
    });

    client.activate();

    return () => {
      // If admin navigates away without closing, mark as absent
      if (userRoleRef.current === 'ADMIN') {
        axios.post(`${API}/${roomId}/admin-leave`, {},
          { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }
        ).catch(() => {});
      }
      client.deactivate();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // ── Actions ───────────────────────────────────────────────────────────────

  const handleLeave = async () => {
    if (userRole === 'ADMIN') {
      await axios.post(`${API}/${roomId}/admin-leave`, {}, { headers: authHeaders() }).catch(() => {});
      navigate('/my-rooms');
      return;
    }
    await axios.delete(`${API}/${roomId}/leave`, { headers: authHeaders() }).catch(() => {});
    navigate('/my-rooms');
  };

  const handleClose = async () => {
    if (!window.confirm('Close this room for everyone? All members will be redirected.')) return;
    try {
      await axios.post(`${API}/${roomId}/close`, {}, { headers: authHeaders() });
      // Admin navigates directly; members get CLOSE_SIGNAL via WebSocket
      navigate('/my-rooms');
    } catch {
      showToast('Failed to close room.', 'warning');
    }
  };

  const handlePromote = async (targetUserId) => {
    try {
      await axios.patch(`${API}/${roomId}/promote/${targetUserId}`, {}, { headers: authHeaders() });
      // Toast comes via WebSocket ROLE_UPDATED
    } catch {
      showToast('Failed to promote member. Check CORS allows PATCH.', 'warning');
    }
  };

  const handleRemove = async (targetUserId, username) => {
    if (!window.confirm(`Remove "${username}" from this room?`)) return;
    try {
      await axios.delete(`${API}/${roomId}/remove/${targetUserId}`, { headers: authHeaders() });
    } catch {
      showToast('Failed to remove member.', 'warning');
    }
  };

  const copyCode = () => {
    navigator.clipboard.writeText(roomDetails.joinCode);
    showToast(`Code "${roomDetails.joinCode}" copied!`, 'success');
  };

  // ── Waiting screen (member waiting for admin) ─────────────────────────────
  if (waitingForAdmin) {
    return (
      <div className="waiting-overlay">
        <div className="waiting-box">
          <div className="waiting-icon">⏳</div>
          <h2>Room Not Started Yet</h2>
          <p>Waiting for the admin to open the room...</p>
          <button className="leave-btn" style={{ marginTop: '1.5rem' }}
            onClick={() => navigate('/my-rooms')}>
            🚪 Go Back
          </button>
        </div>
      </div>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <div className="workspace">
      {toast && <div className={`toast toast-${toast.type}`}>{toast.msg}</div>}

      {/* ── Room Closed / Kicked Modal ── */}
      {closedModal.show && (
        <div className="modal-overlay">
          <div className="modal-box">
            <div className="modal-icon">🔒</div>
            <h2 className="modal-title">Room Closed</h2>
            <p className="modal-message">{closedModal.message}</p>
            <button className="modal-ok-btn"
              onClick={() => { setClosedModal({ show: false, message: '' }); navigate('/my-rooms'); }}>
              OK
            </button>
          </div>
        </div>
      )}

      {/* ── Sidebar ── */}
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
          <button className={`view-tab ${activeView === 'whiteboard' ? 'active' : ''}`}
            onClick={() => setActiveView('whiteboard')}>
            🖊 Whiteboard
          </button>
          <button className={`view-tab ${activeView === 'members' ? 'active' : ''}`}
            onClick={() => setActiveView('members')}>
            👥 Members ({members.length})
          </button>
        </div>

        <hr className="sidebar-divider" />

        <button className="leave-btn" onClick={handleLeave}>🚪 Leave Room</button>

        {userRole === 'ADMIN' && (
          <div className="danger-zone">
            <p className="danger-label">Admin Controls</p>
            <button className="danger-btn" onClick={handleClose}>🔴 Close Room for All</button>
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

      {/* ── Main canvas area ── */}
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