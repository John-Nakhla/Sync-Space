import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import axios from 'axios';
import SharedWhiteboard from '../components/SharedWhiteboard';

const Room = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [userRole, setUserRole] = useState(location.state?.role || 'MEMBER');
  const [roomStatus, setRoomStatus] = useState('WAITING');
  const [members, setMembers] = useState([]);

  const canDraw = (userRole === 'ADMIN' || userRole === 'CONTRIBUTOR') && roomStatus === 'ACTIVE';

  const fetchData = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await axios.get(`http://localhost:8080/api/rooms/${roomId}`, { headers: { Authorization: `Bearer ${token}` } });
      setRoomStatus(res.data.status);
      const mems = await axios.get(`http://localhost:8080/api/rooms/${roomId}/members`, { headers: { Authorization: `Bearer ${token}` } });
      setMembers(mems.data);
    } catch (e) { navigate('/my-rooms'); }
  };

  useEffect(() => {
    fetchData();
    const client = new Client({
      webSocketFactory: () => new SockJS('http://localhost:8080/ws'),
      onConnect: () => {
        client.subscribe(`/topic/room/${roomId}`, (msg) => {
          const data = JSON.parse(msg.body);
          if (data.type === 'START_SIGNAL') setRoomStatus('ACTIVE');
          else if (data.type === 'RESTART_SIGNAL') setRoomStatus('WAITING');
          else if (data.type === 'END_SIGNAL') navigate('/my-rooms');
          else if (data.type === 'ROLE_UPDATED') fetchData();
        });
      }
    });
    client.activate();
    return () => client.deactivate();
  }, [roomId]);

  const handleStart = async () => {
    const token = localStorage.getItem('token');
    const url = roomStatus === 'ENDED' ? `/restart` : '/start';
    await axios.post(`http://localhost:8080/api/rooms/${roomId}${url}`, {}, { headers: { Authorization: `Bearer ${token}` } });
  };

  const handleClose = async () => {
    const token = localStorage.getItem('token');
    await axios.post(`http://localhost:8080/api/rooms/${roomId}/end`, {}, { headers: { Authorization: `Bearer ${token}` } });
  };

  const handlePromote = async (uid) => {
    const token = localStorage.getItem('token');
    await axios.patch(`http://localhost:8080/api/rooms/${roomId}/promote/${uid}`, {}, { headers: { Authorization: `Bearer ${token}` } });
  };

  if (roomStatus === 'WAITING' || roomStatus === 'ENDED') {
    return (
      <div className="lobby">
        <h2>Lobby</h2>
        {userRole === 'ADMIN' ? <button onClick={handleStart}>🚀 Start Session</button> : <p>Waiting for Admin...</p>}
      </div>
    );
  }

  return (
    <div className="workspace">
      <div className="sidebar">
        {userRole === 'ADMIN' && <button onClick={handleClose}>🔴 Close Room</button>}
        <ul>{members.map(m => <li key={m.id}>{m.username} ({m.role}) {userRole === 'ADMIN' && m.role === 'MEMBER' && <button onClick={() => handlePromote(m.id)}>Promote</button>}</li>)}</ul>
      </div>
      <SharedWhiteboard roomId={roomId} canDraw={canDraw} />
    </div>
  );
};

export default Room;