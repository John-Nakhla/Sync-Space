import { useState } from "react";
import { joinRoom } from "../../services/roomService";

function JoinRoomModal({ onClose }) {
  const [code, setCode] = useState("");
  const [error, setError] = useState(""); // Track error messages
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const response = await joinRoom(code);

      // We check the string returned from our Java method
      if (response.startsWith("Error:")) {
        setError(response.replace("Error:", "").trim());
      } else if (response.startsWith("Already joined:")) {
        setError("You are already in this room.");
      } else {
        // Success!
        onClose(); 
        window.location.reload(); // Refresh to show new room in list
      }
    } catch (err) {
      setError("Something went wrong. Please check your code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <div style={styles.iconBadge}>⊕</div>
        <h3 style={styles.title}>Join a room</h3>
        <p style={styles.subtitle}>Enter the code shared with you</p>

        <form onSubmit={handleJoin}>
          <div style={styles.inputGroup}>
            <label style={styles.label}>Room code</label>
            <input
              style={{ ...styles.input, letterSpacing: "2px", fontSize: "16px" }}
              placeholder="e.g. XK-9472"
              value={code}
              onChange={(e) => setCode(e.target.value)} // Auto uppercase
              required
            />
          </div>

          {/* Error Message Display */}
          {error && (
            <div style={styles.errorBanner}>
              {error}
            </div>
          )}

          <button 
            type="submit" 
            style={styles.btnPrimary} 
            disabled={loading}
          >
            {loading ? "Joining..." : "Join room"}
          </button>
          <button type="button" onClick={onClose} style={styles.btnGhost}>Cancel</button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed", top: 0, left: 0, right: 0, bottom: 0,
    backgroundColor: "rgba(0,0,0,0.45)",
    display: "flex", justifyContent: "center", alignItems: "center",
    zIndex: 1000,
  },
  box: {
    background: "white",
    padding: "28px 28px 24px",
    borderRadius: "16px",
    width: "360px",
    boxShadow: "0 20px 40px rgba(0,0,0,0.12)",
  },
  iconBadge: {
    width: "36px", height: "36px",
    borderRadius: "8px",
    background: "#E1F5EE",
    color: "#0F6E56",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "18px", marginBottom: "12px",
  },
  title: { fontSize: "16px", fontWeight: 500, margin: "0 0 4px", color: "#08060d" },
  subtitle: { fontSize: "13px", color: "#6b6375", margin: "0 0 20px" },
  inputGroup: { marginBottom: "14px" },
  label: { display: "block", fontSize: "12px", fontWeight: 500, color: "#6b6375", marginBottom: "5px" },
  input: {
    width: "100%", boxSizing: "border-box",
    padding: "9px 12px", fontSize: "14px",
    border: "1px solid #e5e4e7", borderRadius: "8px", outline: "none",
  },
  btnPrimary: {
    width: "100%", padding: "10px",
    background: "#0F6E56", color: "#E1F5EE",
    border: "none", borderRadius: "8px",
    fontSize: "14px", fontWeight: 500, cursor: "pointer",
    marginTop: "4px",
  },
  btnGhost: {
    width: "100%", padding: "9px",
    background: "transparent", color: "#6b6375",
    border: "1px solid #e5e4e7", borderRadius: "8px",
    fontSize: "13px", cursor: "pointer", marginTop: "8px",
  },
};

export default JoinRoomModal;