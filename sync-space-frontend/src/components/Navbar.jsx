import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import CreateRoomModal from "./modals/CreateRoomModal";
import JoinRoomModal from "./modals/JoinRoomModal";

function Navbar() {
  const navigate = useNavigate();
  const token = localStorage.getItem("token");

  const [showCreate, setShowCreate] = useState(false);
  const [showJoin, setShowJoin] = useState(false);

  const handleLogout = () => {
    localStorage.removeItem("token");
    navigate("/login");
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Syne:wght@600;700&family=DM+Sans:wght@400;500&display=swap');

        .syncspace-nav {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 36px;
          height: 64px;
          background: #0e0e11;
          border-bottom: 1px solid rgba(255,255,255,0.07);
          font-family: 'DM Sans', sans-serif;
          position: sticky;
          top: 0;
          z-index: 100;
          backdrop-filter: blur(12px);
        }

        .syncspace-logo {
          font-family: 'Syne', sans-serif;
          font-size: 1.25rem;
          font-weight: 700;
          color: #fff;
          letter-spacing: -0.02em;
          text-decoration: none;
          display: flex;
          align-items: center;
          gap: 8px;
          user-select: none;
        }

        .syncspace-logo::before {
          content: '';
          display: inline-block;
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: #6ee7b7;
          box-shadow: 0 0 8px #6ee7b7;
        }

        .nav-links {
          display: flex;
          align-items: center;
          gap: 6px;
        }

        .nav-link {
          color: rgba(255,255,255,0.55);
          text-decoration: none;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 6px 14px;
          border-radius: 8px;
          transition: color 0.2s, background 0.2s;
        }

        .nav-link:hover {
          color: #fff;
          background: rgba(255,255,255,0.06);
        }

        .nav-divider {
          width: 1px;
          height: 20px;
          background: rgba(255,255,255,0.1);
          margin: 0 6px;
        }

        /* Create Room — filled accent */
        .btn-create {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: linear-gradient(135deg, #6ee7b7 0%, #3b82f6 100%);
          color: #0e0e11;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 7px 16px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          transition: opacity 0.2s, transform 0.15s, box-shadow 0.2s;
          box-shadow: 0 0 0 0 rgba(110,231,183,0);
          letter-spacing: -0.01em;
        }

        .btn-create:hover {
          opacity: 0.92;
          transform: translateY(-1px);
          box-shadow: 0 4px 20px rgba(110,231,183,0.35);
        }

        .btn-create:active {
          transform: translateY(0);
          opacity: 1;
        }

        .btn-create svg {
          flex-shrink: 0;
        }

        /* Join Room — outlined */
        .btn-join {
          display: inline-flex;
          align-items: center;
          gap: 7px;
          background: transparent;
          color: #a5b4fc;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 600;
          padding: 6px 16px;
          border: 1.5px solid rgba(165,180,252,0.4);
          border-radius: 10px;
          cursor: pointer;
          transition: border-color 0.2s, color 0.2s, background 0.2s, transform 0.15s;
          letter-spacing: -0.01em;
        }

        .btn-join:hover {
          border-color: #a5b4fc;
          color: #c7d2fe;
          background: rgba(165,180,252,0.08);
          transform: translateY(-1px);
        }

        .btn-join:active {
          transform: translateY(0);
        }

        /* Logout */
        .btn-logout {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(239,68,68,0.1);
          color: #f87171;
          font-family: 'DM Sans', sans-serif;
          font-size: 0.875rem;
          font-weight: 500;
          padding: 6px 14px;
          border: 1px solid rgba(239,68,68,0.2);
          border-radius: 8px;
          cursor: pointer;
          transition: background 0.2s, border-color 0.2s, color 0.2s;
        }

        .btn-logout:hover {
          background: rgba(239,68,68,0.18);
          border-color: rgba(239,68,68,0.4);
          color: #fca5a5;
        }
      `}</style>

      <nav className="syncspace-nav">
        <Link to="/" className="syncspace-logo">SyncSpace</Link>

        <div className="nav-links">
          {!token ? (
            <>
              <div className="nav-divider" />
              <Link to="/" className="nav-link">Home</Link>
              <Link to="/login" className="nav-link">Login</Link>
              <Link to="/signup" className="nav-link">Sign up</Link>
            </>
          ) : (
            <>
              <div className="nav-divider" />

              <button className="btn-create" onClick={() => setShowCreate(true)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v12M1 7h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                </svg>
                Create Room
              </button>

              <button className="btn-join" onClick={() => setShowJoin(true)}>
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M9 7H1m0 0 3-3M1 7l3 3M13 1v12" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Join Room
              </button>

              <div className="nav-divider" />

              <Link to="/my-rooms" className="nav-link">My Rooms</Link>

              <button className="btn-logout" onClick={handleLogout}>
                <svg width="13" height="13" viewBox="0 0 13 13" fill="none">
                  <path d="M5 1H2a1 1 0 0 0-1 1v9a1 1 0 0 0 1 1h3M9 9.5l3-3-3-3M12 6.5H5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Logout
              </button>
            </>
          )}
        </div>
      </nav>

      {showCreate && <CreateRoomModal onClose={() => setShowCreate(false)} />}
      {showJoin && <JoinRoomModal onClose={() => setShowJoin(false)} />}
    </>
  );
}

export default Navbar;