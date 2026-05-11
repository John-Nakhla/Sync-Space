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
  //
  // The backend publishes to /topic/room/{roomId}/promotions when a participant
  // is promoted to contributor. Message format:
  //   { userId: number, username: string, newRole: "CONTRIBUTOR" }
  //
  // If this user is the one being promoted, show a toast and enable drawing.
  // For everyone else, update the members list (so the host's UI refreshes).
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
setPromotedMsg("🎉 You've been promoted to contributor! You can now draw.");          setPromoted(true);
          setTimeout(() => setPromoted(false), 5000);
        }
      }
    );

    return () => sub.unsubscribe();
  }, [stompClient, roomId, username]);

  // ── Fetch members list when panel opens ───────────────────────────────────
useEffect(() => {
    if (!showMembers) return;
    api.get(`/api/rooms/${roomId}/members`)      // ✅ CORRECT
      .then(res => setMembers(res.data))
      .catch(err => console.error('Failed to load members', err));
  }, [showMembers, roomId]);

  // ── Promote a member (host only) ──────────────────────────────────────────
// ── Promote a member (host only) ──────────────────────────────────────────
  const promoteUser = useCallback((userId) => {
    // ✅ FIX: Use patch and the correct backend URL
    api.patch(`/api/rooms/${roomId}/promote/${userId}`)
      .catch(err => console.error('Promotion failed', err));
      
    // Optimistic update; the STOMP event will confirm and propagate
    setMembers(prev =>
      prev.map(m => m.id === userId ? { ...m, role: 'CONTRIBUTOR' } : m)
    );
  }, [roomId]);

  // ── Redraw helper ─────────────────────────────────────────────────────────
  //
  // FIX: Use an offscreen canvas for compositing so destination-out (eraser)
  // works correctly on the dark background. Without this, the eraser cuts
  // holes through to transparency, which the canvas background then shows as
  // the background colour rather than erasing the stroke.
  //
  // Approach: draw all strokes onto an offscreen canvas with a white fill base,
  // then blit to the visible canvas. This means eraser = actually removes ink.
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
  useEffect(() => {
    const token   = localStorage.getItem('token');
    const myColor = COLORS[Math.floor(Math.random() * COLORS.length)];

    const ydoc = new Y.Doc();
    ydocRef.current = ydoc;

    const provider = new WebsocketProvider(
      'ws://localhost:1234',
      `room-${roomId}`,
      ydoc,
      { params: { room: roomId, token } }
    );
    providerRef.current = provider;

    provider.on('status', ({ status }) => setConnected(status === 'connected'));
    provider.on('sync', (isSynced) => {
      if (isSynced) {
        redraw();
      }
    });

    const strokes = ydoc.getArray('strokes');
    undoManagerRef.current = new Y.UndoManager(strokes);

    // ── Awareness: live pointers ─────────────────────────────────────────────
    const awareness = provider.awareness;
    awareness.setLocalStateField('user', {
      name:   username || 'Anonymous',
      color:  myColor,
      // Normalized cursor coords (0–1). Null when off-canvas.
      cursor: null,
    });

    awareness.on('change', () => {
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

    // ── Observe strokes array → redraw ────────────────────────────────────────
    strokes.observe(redraw);

    // ── Load persisted state from backend ─────────────────────────────────────
    //
    // The backend returns:
    //   snapshotData  – base64 Yjs state update (the heavy base)
    //   deltaUpdates  – array of base64 delta updates after the snapshot
    //
    // We apply snapshot first, then deltas in order, all in one transaction
    // so awareness and observers only fire once.
    api.get(`/api/rooms/${roomId}/whiteboard/state`)
      .then(res => {
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
        redraw();
      })
      .catch(() => console.log('No previous whiteboard state (new room).'));

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

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      strokes.unobserve(redraw);
      provider.destroy();
      ydoc.destroy();
    };
  }, [roomId]); // username intentionally excluded — handled by separate effect

  // ── 2. Pause / Resume ─────────────────────────────────────────────────────
  //
  // Pause  → disconnect WebSocket provider. Canvas freezes.
  // Resume → reconnect. Yjs automatically syncs all missed updates from the
  //          y-websocket server and fires strokes.observe(redraw) when done,
  //          jumping the canvas forward to the current live state.
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
    // Live preview uses source-over only — eraser preview looks like drawing
    // but the final redraw will use destination-out for persistence. This is
    // intentional: the offscreen compositing in redraw() is the source of truth.
    ctx.globalCompositeOperation = 'source-over';
    ctx.strokeStyle = isEraserRef.current ? '#121216' : colorRef.current;
    ctx.lineWidth   = brushSizeRef.current;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.moveTo(pts[pts.length - 2].x, pts[pts.length - 2].y);
    ctx.lineTo(pts[pts.length - 1].x, pts[pts.length - 1].y);
    ctx.stroke();
  }, [getPos, updateAwarenessCursor]);

  const onMouseUp = useCallback(() => {
    if (!drawing.current || !canDrawRef.current || !ydocRef.current) return;
    drawing.current = false;

    if (currentPath.current.length < 2) {
      currentPath.current = [];
      return;
    }

    // Commit stroke to Yjs as a plain serializable object.
    // The redraw() observer will fire and re-render all strokes correctly
    // via the offscreen compositing approach (eraser works persistently).
    const strokes = ydocRef.current.getArray('strokes');
    strokes.push([{
      points:   currentPath.current,
      color:    colorRef.current,
      width:    brushSizeRef.current,
      isEraser: isEraserRef.current,
    }]);
    currentPath.current = [];

    // ── Persist to backend ────────────────────────────────────────────────────
    // Send the full current Yjs state as a binary update.
    // The backend stores this as a WhiteboardUpdate row.
    const stateVector = Y.encodeStateAsUpdate(ydocRef.current);
    api.post(
      `/api/rooms/${roomId}/whiteboard/update`,
      stateVector,
      { headers: { 'Content-Type': 'application/octet-stream' } }
    ).catch(err => console.error('Failed to persist update:', err));
  }, [roomId]);

  const onMouseLeave = useCallback(() => {
    onMouseUp();
    updateAwarenessCursor(null);
  }, [onMouseUp, updateAwarenessCursor]);

  const handleUndo = () => {
    if (undoManagerRef.current && canDraw) undoManagerRef.current.undo();
  };

  const handleRedo = () => {
    if (undoManagerRef.current && canDraw) undoManagerRef.current.redo();
  };

  const handleClear = () => {
    if (!ydocRef.current || !canDraw) return;
    const strokes = ydocRef.current.getArray('strokes');
    ydocRef.current.transact(() => strokes.delete(0, strokes.length));
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.wrapper}>
      {/* ── Toolbar ─────────────────────────────────────────────────────── */}
      <div style={styles.toolbar}>
        <div style={styles.toolGroup}>
          <span style={{ color: connected ? '#2ed573' : '#ffa502', fontWeight: 600, fontSize: 14 }}>
            {connected ? '🟢 Live' : '🟡 Connecting…'}
          </span>

          {paused && (
            <span style={styles.pausedBanner}>⏸ Paused</span>
          )}

          {!canDraw && !paused && (
            <span style={styles.viewOnlyBanner}>👁 View Only</span>
          )}

          {/* Pause / Resume button — available to everyone */}
          <button style={styles.pauseBtn} onClick={handlePause}>
            {paused ? '▶ Resume' : '⏸ Pause'}
          </button>

          {/* Members panel toggle — shown to host */}
          {isHost && (
            <button
              style={styles.membersBtn}
              onClick={() => setShowMembers(v => !v)}
            >
              👥 Members
            </button>
          )}
        </div>

        {canDraw && (
          <div style={styles.toolGroup}>
            <div style={styles.colorPalette}>
              {COLORS.map(c => (
                <button
                  key={c}
                  style={{
                    ...styles.colorBtn,
                    backgroundColor: c,
                    border: color === c && !isEraser
                      ? '2px solid #fff'
                      : '2px solid transparent',
                    boxShadow: color === c && !isEraser
                      ? '0 0 8px rgba(255,255,255,0.5)'
                      : 'none',
                  }}
                  onClick={() => { setColor(c); setIsEraser(false); }}
                />
              ))}
            </div>

            <div style={styles.divider} />

            <select
              value={brushSize}
              onChange={e => setBrushSize(Number(e.target.value))}
              style={styles.select}
            >
              {BRUSH_SIZES.map(size => (
                <option key={size} value={size}>{size}px</option>
              ))}
            </select>

            <div style={styles.divider} />

            <button
              style={{ ...styles.toolBtn, background: isEraser ? '#555' : 'transparent' }}
              onClick={() => setIsEraser(true)}
              title="Eraser"
            >
              🧹
            </button>

            <div style={styles.divider} />

            <button style={styles.toolBtn} onClick={handleUndo} title="Undo">↩️</button>
            <button style={styles.toolBtn} onClick={handleRedo} title="Redo">↪️</button>

            <div style={styles.divider} />

            <button onClick={handleClear} style={styles.clearBtn}>🗑 Clear</button>
          </div>
        )}
      </div>

      {/* ── Promotion toast ──────────────────────────────────────────────── */}
      {promoted && (
        <div style={styles.promotionToast}>
          {promotedMsg}
        </div>
      )}

      {/* ── Members panel (host only) ─────────────────────────────────────── */}
      {showMembers && (
        <div style={styles.membersPanel}>
          <div style={styles.membersPanelHeader}>
            <span style={{ fontWeight: 600 }}>Room Members</span>
            <button style={styles.closeBtn} onClick={() => setShowMembers(false)}>✕</button>
          </div>
          {members.length === 0 && (
            <p style={{ color: '#a4b0be', fontSize: 13, padding: '8px 0' }}>
              Loading members…
            </p>
          )}
          {members.map(member => (
            <div key={member.id} style={styles.memberRow}>
              <div style={styles.memberInfo}>
                <span style={styles.memberDot} />
                <span style={{ fontSize: 14 }}>{member.username}</span>
                <span style={styles.memberRole}>{member.role}</span>
              </div>
              {/* Show promote button only for viewers who aren't already contributors */}
              {isHost && member.role !== 'CONTRIBUTOR' && member.role !== 'ADMIN' && (
                <button
                  style={styles.promoteBtn}
                  onClick={() => promoteUser(member.id)}
                >
                  Promote
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Canvas area ──────────────────────────────────────────────────── */}
      <div ref={containerRef} style={styles.canvasContainer}>
        {/* Paused overlay */}
        {paused && (
          <div style={styles.pauseOverlay}>
            <div style={styles.pauseOverlayInner}>
              <span style={{ fontSize: 48 }}>⏸</span>
              <p style={{ marginTop: 12, fontSize: 16, color: '#a4b0be' }}>
                Whiteboard paused
              </p>
              <button style={styles.resumeOverlayBtn} onClick={handlePause}>
                ▶ Resume & Sync
              </button>
            </div>
          </div>
        )}

        <canvas
          ref={canvasRef}
          style={{
            ...styles.canvas,
            cursor: canDraw
              ? (isEraser ? 'cell' : 'crosshair')
              : 'default',
            pointerEvents: paused ? 'none' : 'auto',
          }}
          onMouseDown={onMouseDown}
          onMouseMove={onMouseMove}
          onMouseUp={onMouseUp}
          onMouseLeave={onMouseLeave}
        />

        {/* ── Live cursors of other users ─────────────────────────────────
            Positions are stored normalized (0–1). We denormalize here using
            the container dimensions so they are correct on every screen size.
        ─────────────────────────────────────────────────────────────────── */}
        {awarenessUsers.map((user, i) => {
          const container = containerRef.current;
          if (!container || !user.cursor) return null;
          const absX = user.cursor.x * container.clientWidth;
          const absY = user.cursor.y * container.clientHeight;
          return (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: absX,
                top: absY,
                transform: 'translate(-50%, -50%)',
                pointerEvents: 'none',
                zIndex: 10,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
              }}
            >
              <div style={{
                width: 10,
                height: 10,
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