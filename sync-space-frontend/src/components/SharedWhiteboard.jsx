import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as Y from 'yjs';
import { WebsocketProvider } from 'y-websocket';
import api from '../api/api';

const COLORS = ['#ffffff', '#ff4757', '#ffa502', '#2ed573', '#1e90ff', '#9b59b6', '#000000'];
const BRUSH_SIZES = [2, 4, 8, 12, 20];

// ─────────────────────────────────────────────────────────────────────────────
// SharedWhiteboard
//
// Props:
//   roomId   – the room's numeric ID
//   canDraw  – initial draw permission (host may promote viewers in real-time)
//   username – display name shown on live pointer dots
//   isHost   – if true, the Members panel shows Promote buttons
//   stompClient – (optional) connected STOMP client for receiving WS events
//                 Expected to subscribe to /topic/room/{roomId}/promotions
// ─────────────────────────────────────────────────────────────────────────────
const SharedWhiteboard = ({ roomId, canDraw: initialCanDraw, username, isHost, stompClient }) => {
  const containerRef = useRef(null);
  const canvasRef    = useRef(null);

  // Yjs
  const ydocRef         = useRef(null);
  const providerRef     = useRef(null);
  const undoManagerRef  = useRef(null);
  const isMountedRef    = useRef(true); // ✅ FIX: Track mount state

  // UI state
  const [connected,     setConnected]     = useState(false);
  const [color,         setColor]         = useState(COLORS[0]);
  const [brushSize,     setBrushSize]     = useState(BRUSH_SIZES[1]);
  const [isEraser,      setIsEraser]      = useState(false);
  const [paused,        setPaused]        = useState(false);
  const [canDraw,       setCanDraw]       = useState(initialCanDraw);
  const [awarenessUsers,setAwarenessUsers] = useState([]);
  const [showMembers,   setShowMembers]   = useState(false);
  const [members,       setMembers]       = useState([]);   // [{ id, username, role }]
  const [promoted,      setPromoted]      = useState(false); // toast flag
  const [promotedMsg,   setPromotedMsg]   = useState('');

  // Drawing refs (always in sync via useEffect)
  const drawing       = useRef(false);
  const currentPath   = useRef([]);
  const canDrawRef    = useRef(canDraw);
  const colorRef      = useRef(color);
  const brushSizeRef  = useRef(brushSize);
  const isEraserRef   = useRef(isEraser);
  const pausedRef     = useRef(paused);

  useEffect(() => { canDrawRef.current  = canDraw;   }, [canDraw]);
  useEffect(() => { colorRef.current    = color;     }, [color]);
  useEffect(() => { brushSizeRef.current = brushSize;}, [brushSize]);
  useEffect(() => { isEraserRef.current = isEraser;  }, [isEraser]);
  useEffect(() => { pausedRef.current   = paused;    }, [paused]);

  // ── Sync username into awareness whenever it changes ──────────────────────
  useEffect(() => {
    if (!providerRef.current || !username) return;
    const awareness = providerRef.current.awareness;
    const local = awareness.getLocalState();
    if (local?.user) {
      awareness.setLocalStateField('user', { ...local.user, name: username });
    }
  }, [username]);

  // ── Update canDraw if the prop changes from the parent (initial mount) ────
  useEffect(() => { setCanDraw(initialCanDraw); }, [initialCanDraw]);

  // ── Subscribe to STOMP promotion events ───────────────────────────────────
  useEffect(() => {
    if (!stompClient || !roomId) return;

    const sub = stompClient.subscribe(
      `/topic/room/${roomId}/promotions`,
      (message) => {
        const event = JSON.parse(message.body);

        // Update local members list so the panel reflects new role
        setMembers(prev =>
          prev.map(m => m.id === event.userId ? { ...m, role: event.newRole } : m)
        );

        // If THIS user was promoted → enable drawing + show toast
        if (event.username === username) {
          setCanDraw(true);
          setPromotedMsg("🎉 You've been promoted to contributor! You can now draw.");
          setPromoted(true);
          setTimeout(() => setPromoted(false), 5000);
        }
      }
    );

    return () => sub.unsubscribe();
  }, [stompClient, roomId, username]);

  // ── Fetch members list when panel opens ───────────────────────────────────
  useEffect(() => {
    if (!showMembers) return;
    api.get(`/api/rooms/${roomId}/members`)
      .then(res => setMembers(res.data))
      .catch(err => console.error('Failed to load members', err));
  }, [showMembers, roomId]);

  // ── Promote a member (host only) ──────────────────────────────────────────
  const promoteUser = useCallback((userId) => {
    api.patch(`/api/rooms/${roomId}/promote/${userId}`)
      .catch(err => console.error('Promotion failed', err));
      
    // Optimistic update; the STOMP event will confirm and propagate
    setMembers(prev =>
      prev.map(m => m.id === userId ? { ...m, role: 'CONTRIBUTOR' } : m)
    );
  }, [roomId]);

  // ── Redraw helper ─────────────────────────────────────────────────────────
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || !ydocRef.current) return;

    const ctx = canvas.getContext('2d');
    const strokes = ydocRef.current.getArray('strokes');

    // Offscreen canvas for compositing
    const off = document.createElement('canvas');
    off.width  = canvas.width;
    off.height = canvas.height;
    const octx = off.getContext('2d');

    // Fill offscreen with the canvas background so eraser reveals background
    octx.fillStyle = '#121216';
    octx.fillRect(0, 0, off.width, off.height);

    strokes.toArray().forEach(stroke => {
      if (!stroke || !stroke.points || stroke.points.length < 2) return;

      octx.beginPath();
      octx.globalCompositeOperation = stroke.isEraser ? 'destination-out' : 'source-over';
      octx.strokeStyle = stroke.isEraser ? 'rgba(0,0,0,1)' : stroke.color;
      octx.lineWidth   = stroke.width;
      octx.lineCap     = 'round';
      octx.lineJoin    = 'round';

      octx.moveTo(stroke.points[0].x, stroke.points[0].y);
      stroke.points.slice(1).forEach(p => octx.lineTo(p.x, p.y));
      octx.stroke();
    });

    octx.globalCompositeOperation = 'source-over';

    // Blit offscreen → visible
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(off, 0, 0);
  }, []);

  // ── 1. Initialize Yjs, WebSocket, Awareness ───────────────────────────────
  // ✅ FIX: Better WebSocket initialization with proper cleanup
  useEffect(() => {
    isMountedRef.current = true;
    const token   = localStorage.getItem('token');
    if (!token) {
      console.error('❌ No auth token found. Cannot connect to whiteboard.');
      return;
    }

    const myColor = COLORS[Math.floor(Math.random() * COLORS.length)];

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    // ✅ FIX: Use a timeout to prevent race conditions in StrictMode
    const initTimer = setTimeout(() => {
      if (!isMountedRef.current) return;

      try {
        const provider = new WebsocketProvider(
          'ws://localhost:1234',
          `room-${roomId}`,
          ydoc,
          { 
            params: { room: roomId, token },
            resyncInterval: 5000,
            maxBackoffTime: 30000,
          }
        );
        
        if (!isMountedRef.current) {
          provider.disconnect();
          return;
        }

        providerRef.current = provider;

        provider.on('status', ({ status }) => {
          console.log('📡 WebSocket status:', status);
          if (isMountedRef.current) {
            setConnected(status === 'connected');
          }
        });

        provider.on('sync', (isSynced) => {
          if (isSynced && isMountedRef.current) {
            console.log('✅ Whiteboard synced');
            redraw();
          }
        });

        provider.on('connection-error', (error) => {
          console.error('❌ WebSocket connection error:', error);
        });

        const strokes = ydoc.getArray('strokes');
        undoManagerRef.current = new Y.UndoManager(strokes);

        // ── Awareness: live pointers ────────────────────────────────────────
        const awareness = provider.awareness;
        awareness.setLocalStateField('user', {
          name:   username || 'Anonymous',
          color:  myColor,
          cursor: null,
        });

        awareness.on('change', () => {
          if (!isMountedRef.current) return;
          const canvas = canvasRef.current;
          if (!canvas) return;

          const users = Array.from(awareness.getStates().values())
            .filter(state =>
              state.user &&
              state.user.cursor &&
              state.user.name !== (username || 'Anonymous')
            )
            .map(state => state.user);

          setAwarenessUsers(users);
        });

        // ── Observe strokes array → redraw ──────────────────────────────────
        strokes.observe(redraw);
      } catch (error) {
        console.error('❌ Error initializing WebSocket:', error);
      }
    }, 100); // Small delay for StrictMode compatibility

    // ── Load persisted state from backend ─────────────────────────────────────
    api.get(`/api/rooms/${roomId}/whiteboard/state`)
      .then(res => {
        if (!isMountedRef.current) return;
        const { snapshotData, deltaUpdates } = res.data;
        ydoc.transact(() => {
          if (snapshotData) {
            Y.applyUpdate(
              ydoc,
              Uint8Array.from(atob(snapshotData), c => c.charCodeAt(0))
            );
          }
          if (deltaUpdates && deltaUpdates.length > 0) {
            deltaUpdates.forEach(update => {
              Y.applyUpdate(
                ydoc,
                Uint8Array.from(atob(update), c => c.charCodeAt(0))
              );
            });
          }
        }, 'backend-load');
        if (isMountedRef.current) {
          redraw();
        }
      })
      .catch(() => console.log('ℹ️ No previous whiteboard state (new room).'));

    // ── Resize handler ────────────────────────────────────────────────────────
    const resizeCanvas = () => {
      const container = containerRef.current;
      const canvas    = canvasRef.current;
      if (!container || !canvas) return;
      canvas.width  = container.clientWidth;
      canvas.height = container.clientHeight;
      redraw();
    };

    window.addEventListener('resize', resizeCanvas);
    setTimeout(resizeCanvas, 100);

    // ✅ FIX: Proper cleanup
    return () => {
      isMountedRef.current = false;
      clearTimeout(initTimer);
      window.removeEventListener('resize', resizeCanvas);
      
      const strokes = ydoc.getArray('strokes');
      try {
        strokes.unobserve(redraw);
      } catch (e) {
        console.error('Error unobserving strokes:', e);
      }
      
      if (providerRef.current) {
        try {
          providerRef.current.disconnect();
          providerRef.current.destroy();
          console.log('✅ WebSocket provider cleaned up');
        } catch (e) {
          console.error('⚠️ Error destroying provider:', e);
        }
        providerRef.current = null;
      }
      
      try {
        ydoc.destroy();
      } catch (e) {
        console.error('⚠️ Error destroying ydoc:', e);
      }
      ydocRef.current = null;
    };
  }, [roomId]); // username intentionally excluded — handled by separate effect

  // ── 2. Pause / Resume ─────────────────────────────────────────────────────
  const handlePause = () => {
    const provider = providerRef.current;
    if (!provider) return;

    if (!paused) {
      provider.disconnect();
      setPaused(true);
    } else {
      provider.connect();
      setPaused(false);
    }
  };

  // ── 3. Mouse / Drawing logic ──────────────────────────────────────────────

  // Convert mouse event → canvas coordinates (accounts for CSS scaling)
  const getPos = useCallback((e) => {
    const canvas = canvasRef.current;
    const rect   = canvas.getBoundingClientRect();
    const scaleX = canvas.width  / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top)  * scaleY,
    };
  }, []);

  // Normalize pos to 0–1 range for awareness (screen-size agnostic)
  const normalizePos = useCallback((pos) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return { x: pos.x / canvas.width, y: pos.y / canvas.height };
  }, []);

  const updateAwarenessCursor = useCallback((pos) => {
    if (!providerRef.current) return;
    const awareness = providerRef.current.awareness;
    const local = awareness.getLocalState();
    if (local?.user) {
      awareness.setLocalStateField('user', {
        ...local.user,
        cursor: pos ? normalizePos(pos) : null,
      });
    }
  }, [normalizePos]);

  const onMouseDown = useCallback((e) => {
    if (!canDrawRef.current || !ydocRef.current || pausedRef.current) return;
    drawing.current = true;
    const pos = getPos(e);
    currentPath.current = [pos];
    updateAwarenessCursor(pos);
  }, [getPos, updateAwarenessCursor]);

  const onMouseMove = useCallback((e) => {
    if (pausedRef.current) return;
    const pos = getPos(e);
    updateAwarenessCursor(pos);

    if (!drawing.current || !canDrawRef.current || !ydocRef.current) return;

    currentPath.current.push(pos);

    // Live draw on canvas (before Yjs commit) for immediate feedback
    const ctx  = canvasRef.current.getContext('2d');
    const pts  = currentPath.current;
    if (pts.length < 2) return;

    ctx.beginPath();
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = isEraserRef.current ? '#121216' : colorRef.current;
    ctx.lineWidth   = brushSizeRef.current;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }, [getPos, updateAwarenessCursor]);

  // ✅ FIX: Better error handling for persist
  const onMouseUp = useCallback(() => {
    if (!drawing.current || !canDrawRef.current || !ydocRef.current) return;
    drawing.current = false;

    if (currentPath.current.length < 2) {
      currentPath.current = [];
      return;
    }

    // ✅ FIX: Double-check permission before persisting
    if (!canDrawRef.current) {
      console.warn('❌ Permission denied: You do not have permission to draw');
      currentPath.current = [];
      return;
    }

    // Commit stroke to Yjs as a plain serializable object.
    const strokes = ydocRef.current.getArray('strokes');
    strokes.push([{
      points:   currentPath.current,
      color:    colorRef.current,
      width:    brushSizeRef.current,
      isEraser: isEraserRef.current,
    }]);
    currentPath.current = [];

    // ── Persist to backend ────────────────────────────────────────────────────
    // ✅ FIX: Better error handling with specific messages
    const stateVector = Y.encodeStateAsUpdate(ydocRef.current);
    api.post(
      `/api/rooms/${roomId}/whiteboard/update`,
      stateVector,
      { 
        headers: { 'Content-Type': 'application/octet-stream' },
        timeout: 5000, // 5 second timeout
      }
    )
      .then(() => {
        console.log('✅ Whiteboard update persisted successfully');
      })
      .catch(err => {
        if (err.response?.status === 403) {
          console.error('❌ 403 Forbidden: You do not have permission to update this whiteboard.');
          console.error('   Reason: Your role may not have been promoted to CONTRIBUTOR yet.');
          console.error('   Action: Ask the room admin to promote you in the Members panel.');
        } else if (err.response?.status === 401) {
          console.error('❌ 401 Unauthorized: Your session may have expired. Please refresh the page.');
        } else if (err.response?.status === 404) {
          console.error('❌ 404 Not Found: The whiteboard endpoint is not available.');
        } else {
          console.error('❌ Failed to persist whiteboard update:', err.message);
        }
      });
  }, [roomId]);

  const onMouseLeave = useCallback(() => {
    onMouseUp();
    updateAwarenessCursor(null);
  }, [onMouseUp, updateAwarenessCursor]);

  // ── 4. Render ─────────────────────────────────────────────────────────────

  return (
    <div style={styles.wrapper} ref={containerRef}>
      <div style={styles.toolbar}>
        <div style={styles.toolGroup}>
          <span style={{ color: '#a4b0be', fontSize: 13, fontWeight: 500 }}>
            {connected ? '🟢 Connected' : '🔴 Offline'}
          </span>
        </div>

        {!canDraw && (
          <div style={styles.viewOnlyBanner}>
            👁️ View-only mode. Ask the host to promote you.
          </div>
        )}

        {paused && (
          <div style={styles.pausedBanner}>
            ⏸️ Paused — changes won't sync
          </div>
        )}

        <div style={styles.toolGroup}>
          {canDraw && (
            <>
              <div style={styles.colorPalette}>
                {COLORS.map(c => (
                  <button
                    key={c}
                    style={{
                      ...styles.colorBtn,
                      backgroundColor: c,
                      border: color === c ? '2px solid #fff' : '1px solid #666',
                      transform: color === c ? 'scale(1.15)' : 'scale(1)',
                    }}
                    onClick={() => setColor(c)}
                    title={c}
                  />
                ))}
              </div>

              <div style={styles.divider} />

              <select
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                style={styles.select}
              >
                {BRUSH_SIZES.map(s => (
                  <option key={s} value={s}>
                    ✏️ {s}px
                  </option>
                ))}
              </select>

              <button
                style={{
                  ...styles.toolBtn,
                  backgroundColor: isEraser ? '#ff4757' : 'transparent',
                  color: isEraser ? '#fff' : '#a4b0be',
                }}
                onClick={() => setIsEraser(!isEraser)}
                title="Eraser"
              >
                🗑️
              </button>

              <button
                style={{
                  ...styles.toolBtn,
                  backgroundColor: undoManagerRef.current ? '#3f3f4e' : '#2a2a2f',
                  cursor: undoManagerRef.current ? 'pointer' : 'default',
                }}
                onClick={() => {
                  if (undoManagerRef.current) {
                    undoManagerRef.current.undo();
                  }
                }}
                title="Undo (Ctrl+Z)"
              >
                ↶
              </button>

              <div style={styles.divider} />

              <button
                style={styles.clearBtn}
                onClick={() => {
                  if (ydocRef.current && window.confirm('Clear entire whiteboard?')) {
                    const strokes = ydocRef.current.getArray('strokes');
                    strokes.delete(0, strokes.length);
                  }
                }}
              >
                🗑️ Clear All
              </button>
            </>
          )}

          <div style={styles.divider} />

          <button style={styles.pauseBtn} onClick={handlePause}>
            {paused ? '▶️ Resume' : '⏸️ Pause'}
          </button>

          <button
            style={styles.membersBtn}
            onClick={() => setShowMembers(!showMembers)}
          >
            👥 Members
          </button>
        </div>
      </div>

      {promoted && (
        <div style={styles.promotionToast}>
          {promotedMsg}
        </div>
      )}

      <div style={styles.canvasContainer}>
        <canvas
          ref={canvasRef}
          style={styles.canvas}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        />

        {showMembers && (
          <div style={styles.membersPanel}>
            <div style={styles.membersPanelHeader}>
              <span>👥 Members ({members.length})</span>
              <button
                style={styles.closeBtn}
                onClick={() => setShowMembers(false)}
              >
                ✕
              </button>
            </div>
            {members.map(m => (
              <div key={m.id} style={styles.memberRow}>
                <div style={styles.memberInfo}>
                  <span style={styles.memberDot} />
                  <span>{m.username}</span>
                  <span style={styles.memberRole}>{m.role}</span>
                </div>
                {isHost && m.role === 'MEMBER' && (
                  <button
                    style={styles.promoteBtn}
                    onClick={() => promoteUser(m.id)}
                  >
                    Promote
                  </button>
                )}
              </div>
            ))}
          </div>
        )}

        {paused && (
          <div style={styles.pauseOverlay}>
            <div style={styles.pauseOverlayInner}>
              <h2>⏸️ Paused</h2>
              <p>Edits won't sync while paused</p>
              <button
                style={styles.resumeOverlayBtn}
                onClick={handlePause}
              >
                Resume
              </button>
            </div>
          </div>
        )}

        {awarenessUsers.map((user, idx) => {
          if (!user.cursor) return null;
          const x = user.cursor.x * 100;
          const y = user.cursor.y * 100;
          return (
            <div key={idx} style={{
              position: 'absolute',
              left: `${x}%`,
              top: `${y}%`,
              transform: 'translate(-50%, -50%)',
              pointerEvents: 'none',
              zIndex: 10,
            }}>
              <div style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                backgroundColor: user.color,
                border: '2px solid #fff',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }} />
              <div style={{
                backgroundColor: user.color,
                color: '#fff',
                padding: '2px 6px',
                borderRadius: 4,
                fontSize: 10,
                fontWeight: 'bold',
                marginTop: 4,
                whiteSpace: 'nowrap',
                boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
              }}>
                {user.name}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const styles = {
  wrapper: {
    display:       'flex',
    flexDirection: 'column',
    height:        '100%',
    background:    '#1e1e24',
    borderRadius:  '12px',
    overflow:      'hidden',
    boxShadow:     '0 10px 30px rgba(0,0,0,0.5)',
    position:      'relative',
  },
  toolbar: {
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'space-between',
    padding:        '12px 20px',
    background:     '#2b2b36',
    borderBottom:   '1px solid #3f3f4e',
    flexShrink:     0,
    gap:            '12px',
    flexWrap:       'wrap',
  },
  toolGroup: {
    display:    'flex',
    alignItems: 'center',
    gap:        '12px',
    flexWrap:   'wrap',
  },
  viewOnlyBanner: {
    fontSize:     13,
    color:        '#a4b0be',
    fontStyle:    'italic',
    background:   'rgba(255,255,255,0.1)',
    padding:      '4px 10px',
    borderRadius: '12px',
  },
  pausedBanner: {
    fontSize:     13,
    color:        '#ffa502',
    fontWeight:   600,
    background:   'rgba(255,165,0,0.15)',
    padding:      '4px 10px',
    borderRadius: '12px',
  },
  pauseBtn: {
    background:   '#3f3f4e',
    color:        '#fff',
    border:       'none',
    borderRadius: '6px',
    padding:      '6px 14px',
    cursor:       'pointer',
    fontWeight:   500,
    fontSize:     13,
  },
  membersBtn: {
    background:   '#3f3f4e',
    color:        '#fff',
    border:       'none',
    borderRadius: '6px',
    padding:      '6px 14px',
    cursor:       'pointer',
    fontWeight:   500,
    fontSize:     13,
  },
  colorPalette: {
    display: 'flex',
    gap:     '6px',
  },
  colorBtn: {
    width:        24,
    height:       24,
    borderRadius: '50%',
    cursor:       'pointer',
    transition:   'all 0.2s',
    flexShrink:   0,
  },
  select: {
    background:   '#3f3f4e',
    color:        '#fff',
    border:       'none',
    padding:      '6px',
    borderRadius: '6px',
    cursor:       'pointer',
    outline:      'none',
  },
  toolBtn: {
    background:   'transparent',
    border:       'none',
    fontSize:     '20px',
    cursor:       'pointer',
    padding:      '4px',
    borderRadius: '6px',
    transition:   'background 0.2s',
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
    width:      '1px',
    height:     '24px',
    background: '#4a4a5a',
  },
  canvasContainer: {
    flex:     1,
    position: 'relative',
    overflow: 'hidden',
  },
  canvas: {
    background: '#121216',
    display:    'block',
    width:      '100%',
    height:     '100%',
  },
  // Members panel
  membersPanel: {
    position:    'absolute',
    top:         60,
    left:        20,
    background:  '#2b2b36',
    border:      '1px solid #3f3f4e',
    borderRadius: '12px',
    padding:     '16px',
    zIndex:      100,
    minWidth:    280,
    maxHeight:   400,
    overflowY:   'auto',
    boxShadow:   '0 8px 24px rgba(0,0,0,0.4)',
  },
  membersPanelHeader: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    marginBottom:   12,
    color:          '#fff',
    fontSize:       14,
  },
  closeBtn: {
    background:   'transparent',
    border:       'none',
    color:        '#a4b0be',
    cursor:       'pointer',
    fontSize:     16,
    padding:      '2px 6px',
  },
  memberRow: {
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        '8px 0',
    borderBottom:   '1px solid #3f3f4e',
  },
  memberInfo: {
    display:    'flex',
    alignItems: 'center',
    gap:        '8px',
    color:      '#e0e0e0',
  },
  memberDot: {
    width:        8,
    height:       8,
    borderRadius: '50%',
    background:   '#2ed573',
    display:      'inline-block',
  },
  memberRole: {
    fontSize:     11,
    color:        '#a4b0be',
    background:   'rgba(255,255,255,0.08)',
    padding:      '2px 6px',
    borderRadius: '8px',
  },
  promoteBtn: {
    background:   '#1e90ff',
    color:        '#fff',
    border:       'none',
    borderRadius: '6px',
    padding:      '4px 12px',
    cursor:       'pointer',
    fontSize:     12,
    fontWeight:   600,
  },
  // Pause overlay
  pauseOverlay: {
    position:       'absolute',
    inset:          0,
    background:     'rgba(18,18,22,0.75)',
    zIndex:         50,
    display:        'flex',
    alignItems:     'center',
    justifyContent: 'center',
    backdropFilter: 'blur(2px)',
  },
  pauseOverlayInner: {
    textAlign: 'center',
    color:     '#fff',
  },
  resumeOverlayBtn: {
    marginTop:    16,
    background:   '#2ed573',
    color:        '#121216',
    border:       'none',
    borderRadius: '8px',
    padding:      '10px 24px',
    cursor:       'pointer',
    fontWeight:   700,
    fontSize:     15,
  },
  // Promotion toast
  promotionToast: {
    background:     '#2ed573',
    color:          '#121216',
    padding:        '12px 20px',
    fontSize:       14,
    fontWeight:     600,
    textAlign:      'center',
    flexShrink:     0,
    animation:      'none',
    borderBottom:   '1px solid #3f3f4e',
  },
};

export default SharedWhiteboard;