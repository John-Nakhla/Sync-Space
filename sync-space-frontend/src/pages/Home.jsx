import { useNavigate } from 'react-router-dom';
import './Home.css';

export default function Home() {
  const navigate = useNavigate();
  const goToSignup = () => navigate('/signup');

  return (
    <>
      {/* HERO */}
      <section className="hero">
        <div className="hero-blob-purple" />
        <div className="hero-blob-orange" />

        <div className="hero-badge">
          <span className="hero-badge-dot" />
          Real-time collaboration, reimagined
        </div>

        <h1 className="hero-title">
          Create a room.<br />
          <em>Start something</em> together.
        </h1>

        <p className="hero-sub">
          Instant rooms for your team. Chat, share files, brainstorm on a shared whiteboard — all in one place, all in real time.
        </p>

        <div className="hero-cta-group">
          <button className="btn-hero" onClick={goToSignup}>Create a room →</button>
          <button className="btn-hero-outline" onClick={goToSignup}>
            <span>🔗</span> Join with a code
          </button>
        </div>

        <div className="hero-stats">
          <div>
            <div className="hero-stat-value">10<span>k+</span></div>
            <div className="hero-stat-label">Rooms created</div>
          </div>
          <div className="hero-stat-divider" />
          <div>
            <div className="hero-stat-value">99<span>%</span></div>
            <div className="hero-stat-label">Uptime guaranteed</div>
          </div>
          <div className="hero-stat-divider" />
          <div>
            <div className="hero-stat-value">&lt;<span>50ms</span></div>
            <div className="hero-stat-label">Message latency</div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="features-section">
        <div className="section" id="features">
          <div className="features-header">
            <div className="section-label">Everything you need</div>
            <h2 className="section-title">Built for the way teams actually work</h2>
            <p className="section-desc">
              From quick chats to deep brainstorm sessions — SyncSpace has the tools to keep everyone on the same page.
            </p>
          </div>

          <div className="features-grid">
            {/* Rooms */}
            <div className="feature-card">
              <div className="feature-icon green">🚪</div>
              <div className="feature-card-title">Create & Join Rooms</div>
              <p className="feature-card-desc">
                Spin up a room in seconds or jump into one with a shared code. Rooms are your team's dedicated space — no setup, no friction.
              </p>
              <div className="feature-tag-row">
                <span className="feature-tag green">Instant access</span>
                <span className="feature-tag green">Shareable codes</span>
              </div>
            </div>

            {/* Chat + files */}
            <div className="feature-card">
              <div className="feature-icon purple">💬</div>
              <div className="feature-card-title">Rich Chat & File Sharing</div>
              <p className="feature-card-desc">
                Send messages, reply to threads, and drop files right into the conversation. Every message and file is persisted — nothing gets lost.
              </p>
              <div className="feature-tag-row">
                <span className="feature-tag purple">Persistent history</span>
                <span className="feature-tag purple">File uploads</span>
                <span className="feature-tag purple">Threaded replies</span>
              </div>
            </div>

            {/* Whiteboard — wide */}
            <div className="feature-card wide board-card">
              <div style={{ display: 'flex', gap: '16px', alignItems: 'flex-start' }}>
                <div className="feature-icon orange">🎨</div>
                <div>
                  <div className="feature-card-title">Shared Whiteboard</div>
                  <p className="feature-card-desc">
                    Admin and promoted contributors can draw, annotate, and brainstorm together on a live canvas. See everyone's cursor in real time.
                  </p>
                  <div className="board-collab-pills">
                    <span className="collab-pill"><span className="collab-dot" style={{ background: '#10b981' }} /> Admin</span>
                    <span className="collab-pill"><span className="collab-dot" style={{ background: '#7c6ff7' }} /> Contributor</span>
                    <span className="collab-pill"><span className="collab-dot" style={{ background: '#fb923c' }} /> Contributor</span>
                  </div>
                </div>
              </div>
              <div className="board-preview">
                {/* Freehand lines */}
                <svg width="100%" height="100%" style={{ position: 'absolute', inset: 0 }}>
                  <path d="M40 60 Q120 20 200 55 Q280 90 340 40" stroke="#10b981" strokeWidth="2" fill="none" opacity="0.4" />
                  <path d="M60 90 Q140 110 220 85 Q300 60 360 95" stroke="#7c6ff7" strokeWidth="2" fill="none" opacity="0.4" />
                  <rect x="260" y="30" width="80" height="40" rx="6" stroke="#fb923c" strokeWidth="1.5" fill="rgba(251,146,60,0.07)" opacity="0.7" />
                  <text x="300" y="54" textAnchor="middle" fill="#fb923c" fontSize="10" opacity="0.7">idea</text>
                </svg>
                <span className="board-cursor c1" />
                <span className="board-cursor c2" />
                <span className="board-cursor c3" />
              </div>
            </div>

            {/* Admin control */}
            <div className="feature-card">
              <div className="feature-icon orange">⚙️</div>
              <div className="feature-card-title">Admin Controls</div>
              <p className="feature-card-desc">
                Toggle rooms between active and ended. Promote members to contributors. Full control over who does what, when.
              </p>
              <div className="feature-tag-row">
                <span className="feature-tag orange">Active / Ended</span>
                <span className="feature-tag orange">Role promotion</span>
              </div>
            </div>

            {/* Persistence */}
            <div className="feature-card">
              <div className="feature-icon green">💾</div>
              <div className="feature-card-title">Persisted Everything</div>
              <p className="feature-card-desc">
                Come back days later and your chat history, shared files, and whiteboard strokes are exactly where you left them.
              </p>
              <div className="feature-tag-row">
                <span className="feature-tag green">Chat history</span>
                <span className="feature-tag green">File storage</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="how-section">
        <div className="section-label">How it works</div>
        <h2 className="section-title">Up and running in <em>under a minute</em></h2>

        <div className="how-grid">
          <div className="how-steps">
            {[
              {
                num: '01',
                title: 'Create or join a room',
                desc: 'Start fresh with a new room or enter a code to hop into an existing one. No account setup required to join.',
              },
              {
                num: '02',
                title: 'Chat, reply & share files',
                desc: 'Send messages, reply to specific ones for context, and drop any file into the chat. History is always there.',
              },
              {
                num: '03',
                title: 'Collaborate on the whiteboard',
                desc: 'The admin and promoted contributors open the shared canvas. Draw, annotate, and think together in real time.',
              },
              {
                num: '04',
                title: 'Admin wraps up',
                desc: 'When the session is done, the admin marks the room as ended. Everything is archived and accessible later.',
              },
            ].map((step) => (
              <div className="how-step" key={step.num}>
                <div className="step-num">{step.num}</div>
                <div>
                  <div className="step-title">{step.title}</div>
                  <p className="step-desc">{step.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Chat mockup */}
          <div className="chat-mockup">
            <div className="mockup-header">
              <div className="mockup-avatar">DS</div>
              <div>
                <div className="mockup-room-name">Design Sprint #12</div>
                <div className="mockup-online">4 online</div>
              </div>
              <div className="mockup-admin-badge">Active</div>
            </div>
            <div className="mockup-body">
              <div className="mockup-msg theirs">
                <div className="mockup-bubble">Hey team, let's kick off 🚀</div>
                <div className="mockup-ts">10:02 AM · Sara</div>
              </div>
              <div className="mockup-msg theirs">
                <div className="mockup-bubble file-bubble">
                  <div className="file-icon">📎</div>
                  <div>
                    <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-primary)' }}>brief_v3.pdf</div>
                    <div style={{ fontSize: '10px', color: 'var(--text-muted)' }}>420 KB</div>
                  </div>
                </div>
                <div className="mockup-ts">10:03 AM · Sara</div>
              </div>
              <div className="mockup-msg mine">
                <div className="reply-indicator">Replying to Sara</div>
                <div className="mockup-bubble">Got it! Jumping on the whiteboard now.</div>
                <div className="mockup-ts">10:04 AM · You</div>
              </div>
              <div className="mockup-msg theirs">
                <div className="mockup-bubble">Canvas is live — come draw 🎨</div>
                <div className="mockup-ts">10:04 AM · Admin</div>
              </div>
            </div>
            <div className="mockup-bar">
              <div className="mockup-input">Reply to the room…</div>
              <button className="mockup-send">Send</button>
            </div>
          </div>
        </div>
      </section>

      {/* ADMIN SECTION */}
      <section className="admin-section" id="admin">
        <div className="admin-inner">
          <div>
            <div className="section-label">Admin controls</div>
            <h2 className="section-title">You're always <em>in charge</em></h2>
            <p className="section-desc">
              As the room creator, you decide when the session runs, who can contribute to the whiteboard, and when to close it up.
            </p>
            <div className="admin-toggle-row">
              <button className="admin-action-btn">▶ Resume room</button>
              <button className="admin-action-btn danger">⏹ End room</button>
            </div>
          </div>

          <div className="admin-cards-stack">
            {[
              { name: 'Design Sprint #12', meta: '6 members · 3 contributors', status: 'active' },
              { name: 'Q3 Planning', meta: '12 members · 1 contributor', status: 'active' },
              { name: 'Onboarding #4', meta: '4 members · ended yesterday', status: 'ended' },
              { name: 'Dev Sync July', meta: '8 members · ended 3 days ago', status: 'ended' },
            ].map((room) => (
              <div className={`admin-room-card ${room.status}`} key={room.name}>
                <div className={`room-status-dot ${room.status}`} />
                <div className="room-card-info">
                  <div className="room-card-name">{room.name}</div>
                  <div className="room-card-meta">{room.meta}</div>
                </div>
                <div className={`room-status-badge ${room.status}`}>
                  {room.status === 'active' ? 'Active' : 'Ended'}
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="cta-section">
        <div className="cta-box">
          <h2 className="cta-title">Ready to build something <em>together?</em></h2>
          <p className="cta-desc">
            Create your first room in seconds. No credit card, no installs — just a link and your team.
          </p>
          <div className="cta-btn-row">
            <button className="btn-hero" onClick={goToSignup}>Create a room →</button>
            <button className="btn-hero-outline" onClick={goToSignup}>Join with a code</button>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="footer">
        <div className="footer-logo">
          <div className="footer-logo-mark">S</div>
          <span>Sync<span style={{ color: 'var(--emerald)' }}>Space</span></span>
        </div>
        <ul className="footer-links">
          <li><a href="#">Features</a></li>
          <li><a href="#">Docs</a></li>
          <li><a href="#">Privacy</a></li>
          <li><a href="#">Terms</a></li>
        </ul>
        <div className="footer-copy">© 2025 SyncSpace. All rights reserved.</div>
      </footer>
    </>
  );
}