import React, { useEffect, useRef, useState } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';

/**
 * SharedWhiteboard
 * Props:
 *   roomId  — the room's numeric ID
 *   canDraw — boolean, true for ADMIN and CONTRIBUTOR in an ACTIVE room
 */
const SharedWhiteboard = ({ roomId, canDraw }) => {
  const canvasRef    = useRef(null);
  const ydocRef      = useRef(null);
  const providerRef  = useRef(null);
  const drawing      = useRef(false);
  const currentPath  = useRef([]);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    if (!canDraw) return; // read-only users never connect to Yjs

    const token = localStorage.getItem('token');
    const ydoc  = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider(
      `ws://localhost:1234`,       // y-websocket server
      `room-${roomId}`,            // unique doc per room
      ydoc,
      { params: { room: roomId, token } }
    );
    providerRef.current = provider;

    provider.on('status', ({ status }) => setConnected(status === 'connected'));

    // ── Observe shared strokes array and redraw ──────────────────────────────
    const strokes = ydoc.getArray('strokes');

    const redraw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      strokes.toArray().forEach(stroke => {
        if (!stroke.points || stroke.points.length < 2) return;
        ctx.beginPath();
        ctx.strokeStyle = stroke.color || '#000000';
        ctx.lineWidth   = stroke.width || 2;
        ctx.lineCap     = 'round';
        ctx.lineJoin    = 'round';
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      });
    };

    strokes.observe(redraw);
    redraw(); // draw whatever is already persisted in the doc

    return () => {
      strokes.unobserve(redraw);
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId, canDraw]);

  // ── Mouse helpers ────────────────────────────────────────────────────────────

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const onMouseDown = (e) => {
    if (!canDraw || !ydocRef.current) return;
    drawing.current     = true;
    currentPath.current = [getPos(e)];
  };

  const onMouseMove = (e) => {
    if (!drawing.current || !canDraw || !ydocRef.current) return;
    const pos = getPos(e);
    currentPath.current.push(pos);

    // Smooth local preview while drawing
    const ctx = canvasRef.current.getContext('2d');
    const pts  = currentPath.current;
    if (pts.length < 2) return;
    ctx.beginPath();
    ctx.strokeStyle = '#000000';
    ctx.lineWidth   = 2;
    ctx.lineCap     = 'round';
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  };

  const onMouseUp = () => {
    if (!drawing.current || !canDraw || !ydocRef.current) return;
    drawing.current = false;

    if (currentPath.current.length < 2) {
      currentPath.current = [];
      return;
    }

    // Commit stroke to Yjs → synced to all connected clients instantly
    const strokes = ydocRef.current.getArray('strokes');
    strokes.push([{
      points: currentPath.current,
      color:  '#000000',
      width:  2
    }]);
    currentPath.current = [];
  };

  // ── Clear whiteboard (admin/contributor action) ───────────────────────────

  const handleClear = () => {
    if (!ydocRef.current || !canDraw) return;
    const strokes = ydocRef.current.getArray('strokes');
    ydocRef.current.transact(() => {
      strokes.delete(0, strokes.length);
    });
  };

  // ── Render ────────────────────────────────────────────────────────────────

  if (!canDraw) {
    return (
      <div style={styles.blockedWrapper}>
        <div style={styles.blockedBox}>
          <span style={{ fontSize: 40 }}>👁</span>
          <p style={{ marginTop: 12, color: '#555', fontWeight: 500 }}>
            View Only
          </p>
          <p style={{ color: '#888', fontSize: 13 }}>
            Ask the Admin to promote you to Contributor to draw.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      {/* Toolbar */}
      <div style={styles.toolbar}>
        <span style={{ color: connected ? '#27ae60' : '#e67e22', fontWeight: 600 }}>
          {connected ? '🟢 Live' : '🟡 Connecting…'}
        </span>
        <button onClick={handleClear} style={styles.clearBtn}>🗑 Clear Board</button>
      </div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={1400}
        height={800}
        style={styles.canvas}
        onMouseDown={onMouseDown}
        onMouseMove={onMouseMove}
        onMouseUp={onMouseUp}
        onMouseLeave={onMouseUp}
      />
    </div>
  );
};

const styles = {
  wrapper: {
    display:       'flex',
    flexDirection: 'column',
    height:        '100%',
    background:    '#f5f5f5',
  },
  toolbar: {
    display:         'flex',
    alignItems:      'center',
    justifyContent:  'space-between',
    padding:         '8px 16px',
    background:      '#ffffff',
    borderBottom:    '1px solid #e0e0e0',
  },
  clearBtn: {
    background:   '#e74c3c',
    color:        '#fff',
    border:       'none',
    borderRadius: 6,
    padding:      '6px 14px',
    cursor:       'pointer',
    fontWeight:   600,
  },
  canvas: {
    flex:       1,
    cursor:     'crosshair',
    background: '#ffffff',
    display:    'block',
    maxWidth:   '100%',
  },
  blockedWrapper: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    height:         '100%',
    background:     '#fafafa',
  },
  blockedBox: {
    textAlign:    'center',
    padding:      40,
    borderRadius: 12,
    background:   '#fff',
    boxShadow:    '0 2px 12px rgba(0,0,0,0.08)',
  },
};

export default SharedWhiteboard;
