import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import { jwtDecode } from 'jwt-decode';
import api from '../api/api';

const COLORS = ['#ffffff', '#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#9b59b6'];
const BRUSH_SIZES = [2, 4, 8, 12, 20];

const SharedWhiteboard = ({ roomId, canDraw }) => {
  const containerRef = useRef(null);
  const canvasRef = useRef(null);
  
  // Yjs Refs
  const ydocRef = useRef(null);
  const providerRef = useRef(null);
  const undoManagerRef = useRef(null);
  
  // State
  const [connected, setConnected] = useState(false);
  const [color, setColor] = useState(COLORS[0]);
  const [brushSize, setBrushSize] = useState(BRUSH_SIZES[1]);
  const [isEraser, setIsEraser] = useState(false);
  const [awarenessUsers, setAwarenessUsers] = useState([]);
  
  // Drawing Refs
  const drawing = useRef(false);
  const currentPath = useRef([]);
  const canDrawRef = useRef(canDraw);
  const colorRef = useRef(color);
  const brushSizeRef = useRef(brushSize);
  const isEraserRef = useRef(isEraser);

  // Sync refs so event listeners always have the latest state
  useEffect(() => { canDrawRef.current = canDraw; }, [canDraw]);
  useEffect(() => { colorRef.current = color; }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize; }, [brushSize]);
  useEffect(() => { isEraserRef.current = isEraser; }, [isEraser]);

  // ── 1. Initialize Yjs, WebSocket, and Awareness ───────────────────────────
  useEffect(() => {
    const token = localStorage.getItem('token');
    const decoded = token ? jwtDecode(token) : null;
    const username = decoded?.sub || 'Anonymous'; // Adjust based on your token payload
    const myColor = COLORS[Math.floor(Math.random() * COLORS.length)];

    // Create Yjs Doc
    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // Create WebSocket Provider
    const provider = new WebsocketProvider(
      'ws://localhost:1234',
      `room-${roomId}`,
      ydoc,
      { params: { room: roomId, token } }
    );
    providerRef.current = provider;

    // Track Connection Status
    provider.on('status', ({ status }) => setConnected(status === 'connected'));

    // Set up UndoManager for strokes
    const strokes = ydoc.getArray('strokes');
    undoManagerRef.current = new Y.UndoManager(strokes);

    // Set up Awareness (Live Cursors)
    const awareness = provider.awareness;
    awareness.setLocalStateField('user', {
      name: username,
      color: myColor,
      cursor: null // {x, y}
    });

    awareness.on('change', () => {
      // Filter out ourselves and users who haven't moved their cursor
      const users = Array.from(awareness.getStates().values())
        .filter(state => state.user && state.user.cursor && state.user.name !== username)
        .map(state => state.user);
      setAwarenessUsers(users);
    });

    // Handle Redraw on Stroke Changes
    const redraw = () => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      strokes.toArray().forEach(stroke => {
        if (!stroke || !stroke.points || stroke.points.length < 2) return;
        ctx.beginPath();
        // Use destination-out for eraser, source-over for regular drawing
        ctx.globalCompositeOperation = stroke.isEraser ? 'destination-out' : 'source-over';
        ctx.strokeStyle = stroke.isEraser ? 'rgba(0,0,0,1)' : stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        
        ctx.moveTo(stroke.points[0].x, stroke.points[0].y);
        stroke.points.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.stroke();
      });
      
      // Reset composite operation
      ctx.globalCompositeOperation = 'source-over';
    };

    strokes.observe(redraw);

    // Optional: Load persisted state from backend
    // Uncomment this when your backend is ready to send the Yjs binary snapshot
    /*
    api.get(`/api/rooms/${roomId}/whiteboard/state`, { responseType: 'arraybuffer' })
      .then(res => {
        if (res.data && res.data.byteLength > 0) {
          Y.applyUpdate(ydoc, new Uint8Array(res.data));
        }
      }).catch(err => console.error("No previous whiteboard state found."));
    */

    // Resize Canvas to fit container
    const resizeCanvas = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (container && canvas) {
        // Save current content before resize
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = canvas.width;
        tempCanvas.height = canvas.height;
        tempCanvas.getContext('2d').drawImage(canvas, 0, 0);

        canvas.width = container.clientWidth;
        canvas.height = container.clientHeight;

        // Redraw content
        redraw();
      }
    };
    
    window.addEventListener('resize', resizeCanvas);
    // Initial size
    setTimeout(resizeCanvas, 100);

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      strokes.unobserve(redraw);
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId]);

  // ── 2. Mouse Handling & Drawing Logic ─────────────────────────────────────
  const getPos = useCallback((e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    // Scale correctly in case CSS width != actual canvas width
    const scaleX = canvasRef.current.width / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return { 
      x: (e.clientX - rect.left) * scaleX, 
      y: (e.clientY - rect.top) * scaleY 
    };
  }, []);

  const updateAwarenessCursor = (pos) => {
    if (!providerRef.current) return;
    const awareness = providerRef.current.awareness;
    const localState = awareness.getLocalState();
    if (localState && localState.user) {
      awareness.setLocalStateField('user', {
        ...localState.user,
        cursor: pos
      });
    }
  };

  const onMouseDown = (e) => {
    if (!canDrawRef.current || !ydocRef.current) return;
    drawing.current = true;
    const pos = getPos(e);
    currentPath.current = [pos];
    updateAwarenessCursor(pos);
  };

  const onMouseMove = (e) => {
    const pos = getPos(e);
    updateAwarenessCursor(pos); // Always update cursor even if not drawing

    if (!drawing.current || !canDrawRef.current || !ydocRef.current) return;
    
    currentPath.current.push(pos);

    // Draw locally immediately for zero-latency feel
    const ctx = canvasRef.current.getContext('2d');
    const pts = currentPath.current;
    if (pts.length < 2) return;
    
    ctx.beginPath();
    ctx.globalCompositeOperation = isEraserRef.current ? 'destination-out' : 'source-over';
    ctx.strokeStyle = isEraserRef.current ? 'rgba(0,0,0,1)' : colorRef.current;
    ctx.lineWidth = brushSizeRef.current;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  };

  const onMouseUp = () => {
    if (!drawing.current || !canDrawRef.current || !ydocRef.current) return;
    drawing.current = false;

    if (currentPath.current.length < 2) {
      currentPath.current = [];
      return;
    }

    // Push the completed stroke to Yjs
    const strokes = ydocRef.current.getArray('strokes');
    
    // Create a Y.Map to hold the stroke data so UndoManager can track it
    const yStroke = new Y.Map();
    yStroke.set('points', currentPath.current);
    yStroke.set('color', colorRef.current);
    yStroke.set('width', brushSizeRef.current);
    yStroke.set('isEraser', isEraserRef.current);
    
    // We push the map as a JSON object because strokes is a simple array
    strokes.push([yStroke.toJSON()]);
    currentPath.current = [];

    // Optional: Send update to Spring Boot to persist
    /*
    const stateVector = Y.encodeStateAsUpdate(ydocRef.current);
    api.post(`/api/rooms/${roomId}/whiteboard/update`, stateVector, {
        headers: { 'Content-Type': 'application/octet-stream' }
    });
    */
  };

  // Hide cursor when mouse leaves canvas
  const onMouseLeave = () => {
    onMouseUp();
    if (providerRef.current) {
       const awareness = providerRef.current.awareness;
       const localState = awareness.getLocalState();
       if (localState && localState.user) {
         awareness.setLocalStateField('user', { ...localState.user, cursor: null });
       }
    }
  };

  // ── 3. Tool Actions ───────────────────────────────────────────────────────
  const handleUndo = () => {
    if (undoManagerRef.current && canDraw) {
      undoManagerRef.current.undo();
    }
  };

  const handleRedo = () => {
    if (undoManagerRef.current && canDraw) {
      undoManagerRef.current.redo();
    }
  };

  const handleClear = () => {
    if (!ydocRef.current || !canDraw) return;
    const strokes = ydocRef.current.getArray('strokes');
    ydocRef.current.transact(() => strokes.delete(0, strokes.length));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.wrapper}>
      {/* ── Toolbar ── */}
      <div style={styles.toolbar}>
        
        {/* Status & Banner */}
        <div style={styles.toolGroup}>
          <span style={{ color: connected ? '#2ed573' : '#ffa502', fontWeight: 600, fontSize: '14px' }}>
            {connected ? '🟢 Live' : '🟡 Connecting…'}
          </span>
          {!canDraw && (
            <span style={styles.viewOnlyBanner}>
              👁 View Only
            </span>
          )}
        </div>

        {/* Drawing Tools (Only visible if can draw) */}
        {canDraw && (
          <div style={styles.toolGroup}>
            {/* Color Picker */}
            <div style={styles.colorPalette}>
              {COLORS.map(c => (
                <button
                  key={c}
                  style={{
                    ...styles.colorBtn,
                    backgroundColor: c,
                    border: color === c && !isEraser ? '2px solid #fff' : '2px solid transparent',
                    boxShadow: color === c && !isEraser ? '0 0 8px rgba(255,255,255,0.5)' : 'none'
                  }}
                  onClick={() => { setColor(c); setIsEraser(false); }}
                />
              ))}
            </div>

            <div style={styles.divider} />

            {/* Brush Size */}
            <select 
              value={brushSize} 
              onChange={(e) => setBrushSize(Number(e.target.value))}
              style={styles.select}
            >
              {BRUSH_SIZES.map(size => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>

            <div style={styles.divider} />

            {/* Eraser */}
            <button 
              style={{...styles.toolBtn, background: isEraser ? '#555' : 'transparent'}}
              onClick={() => setIsEraser(true)}
              title="Eraser"
            >
              🧹
            </button>

            <div style={styles.divider} />

            {/* Undo / Redo */}
            <button style={styles.toolBtn} onClick={handleUndo} title="Undo">↩️</button>
            <button style={styles.toolBtn} onClick={handleRedo} title="Redo">↪️</button>

            <div style={styles.divider} />

            {/* Clear Board */}
            <button onClick={handleClear} style={styles.clearBtn}>🗑 Clear</button>
          </div>
        )}
      </div>

      {/* ── Canvas Area ── */}
      <div ref={containerRef} style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          style={{ 
            ...styles.canvas, 
            cursor: canDraw ? (isEraser ? 'cell' : 'crosshair') : 'default' 
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        />
        
        {/* Remote Cursors Overlay */}
        {awarenessUsers.map((user, i) => (
          <div
            key={i}
            style={{
              position: 'absolute',
              left: user.cursor.x,
              top: user.cursor.y,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 10,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center'
            }}
          >
            {/* Cursor Dot */}
            <div style={{
              width: 10, height: 10, 
              borderRadius: '50%', 
              backgroundColor: user.color,
              border: '2px solid #fff',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }} />
            {/* User Name Tag */}
            <div style={{
              backgroundColor: user.color,
              color: '#fff',
              padding: '2px 6px',
              borderRadius: 4,
              fontSize: 10,
              fontWeight: 'bold',
              marginTop: 4,
              whiteSpace: 'nowrap',
              boxShadow: '0 2px 4px rgba(0,0,0,0.3)'
            }}>
              {user.name}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Dark Theme Styles ───────────────────────────────────────────────────────
const styles = {
  wrapper: {
    display:       'flex',
    flexDirection: 'column',
    height:        '100%',
    background:    '#1e1e24', // Dark theme matching the hub
    borderRadius:  '12px',
    overflow:      'hidden',
    boxShadow:     '0 10px 30px rgba(0,0,0,0.5)',
  },
  toolbar: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '12px 20px',
    background:     '#2b2b36', // Slightly lighter dark panel
    borderBottom:   '1px solid #3f3f4e',
  },
  toolGroup: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
  },
  viewOnlyBanner: {
    fontSize:        13,
    color:           '#a4b0be',
    fontStyle:       'italic',
    background:      'rgba(255, 255, 255, 0.1)',
    padding:         '4px 10px',
    borderRadius:    '12px',
  },
  colorPalette: {
    display: 'flex',
    gap: '6px',
  },
  colorBtn: {
    width: 24,
    height: 24,
    borderRadius: '50%',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  select: {
    background: '#3f3f4e',
    color: '#fff',
    border: 'none',
    padding: '6px',
    borderRadius: '6px',
    cursor: 'pointer',
    outline: 'none',
  },
  toolBtn: {
    background: 'transparent',
    border: 'none',
    fontSize: '20px',
    cursor: 'pointer',
    padding: '4px',
    borderRadius: '6px',
    transition: 'background 0.2s',
  },
  clearBtn: {
    background:   '#ff4757',
    color:        '#fff',
    border:       'none',
    borderRadius: '6px',
    padding:      '6px 14px',
    cursor:       'pointer',
    fontWeight:   600,
    transition:   'background 0.2s',
  },
  divider: {
    width: '1px',
    height: '24px',
    background: '#4a4a5a',
  },
  canvasContainer: {
    flex:       1,
    position:   'relative',
    overflow:   'hidden',
  },
  canvas: {
    background: '#121216', // Very dark canvas
    display:    'block',
  },
};

export default SharedWhiteboard;