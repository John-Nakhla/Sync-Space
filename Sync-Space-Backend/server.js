const http = require('http');
const { WebSocketServer } = require('ws');
const { setupWSConnection } = require('y-websocket/bin/utils');

const PORT = process.env.YJS_PORT || 1234;
const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8080';

const server = http.createServer((req, res) => {
  res.writeHead(200);
  res.end('y-websocket running');
});

const wss = new WebSocketServer({ server });

wss.on('connection', async (ws, req) => {
  const url = new URL(req.url, `http://localhost:${PORT}`);
  const roomId = url.searchParams.get('room');
  const token = url.searchParams.get('token');

  if (!roomId || !token) return ws.close(4001, 'Missing params');

  try {
    const res = await fetch(`${BACKEND_URL}/api/rooms/${roomId}`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    
    if (!res.ok) return ws.close(4003, 'Unauthorized');

    // Hand off to Y-Websocket sync utility
    setupWSConnection(ws, req, { docName: `room-${roomId}` });
  } catch (err) {
    ws.close(4000, 'Auth failed');
  }
});

server.listen(PORT, () => console.log(`✅ YJS Server on :${PORT}`));