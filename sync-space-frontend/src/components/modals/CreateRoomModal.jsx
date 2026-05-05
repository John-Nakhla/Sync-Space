import { useState } from "react";
import { createRoom } from "../../services/roomService";

function CreateRoomModal({ onClose }) {
  const [roomData, setRoomData] = useState({ name: "", description: "" });
  const [createdRoom, setCreatedRoom] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    const room = await createRoom(roomData);
    setCreatedRoom(room);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>

        <div style={styles.iconBadge}>✦</div>
        <h3 style={styles.title}>
          {!createdRoom ? "Create a room" : "Share the join code"}
        </h3>
        <p style={styles.subtitle}>
          {!createdRoom ? "Set up a new space for your team" : "Anyone with this code can join your room"}
        </p>

        {!createdRoom ? (
          <form onSubmit={handleCreate}>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Room name</label>
              <input
                style={styles.input}
                placeholder="e.g. Design Team"
                onChange={(e) => setRoomData({ ...roomData, name: e.target.value })}
              />
            </div>
            <div style={styles.inputGroup}>
              <label style={styles.label}>Description</label>
              <input
                style={styles.input}
                placeholder="What's this room for?"
                onChange={(e) => setRoomData({ ...roomData, description: e.target.value })}
              />
            </div>
            <button type="submit" style={styles.btnPrimary}>Create room</button>
            <button type="button" onClick={onClose} style={styles.btnGhost}>Cancel</button>
          </form>
        ) : (
          <div>
            <div style={styles.successBadge}>
              <span style={styles.dot} />
              <span style={styles.successText}>Room created successfully</span>
            </div>
            <div style={styles.codeDisplay}>
              <span style={styles.codeText}>{createdRoom.joinCode}</span>
              <button
                style={styles.copyBtn}
                onClick={() => navigator.clipboard.writeText(createdRoom.joinCode)}
              >
                Copy
              </button>
            </div>
            <button onClick={onClose} style={styles.btnPrimary}>Done</button>
          </div>
        )}

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
    background: "#EEEDFE",
    color: "#534AB7",
    display: "flex", alignItems: "center", justifyContent: "center",
    fontSize: "16px", marginBottom: "12px",
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
    background: "#534AB7", color: "#EEEDFE",
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
  successBadge: {
    display: "flex", alignItems: "center", gap: "8px",
    background: "#E1F5EE", borderRadius: "8px",
    padding: "10px 12px", marginBottom: "16px",
  },
  dot: { width: "8px", height: "8px", borderRadius: "50%", background: "#0F6E56", flexShrink: 0 },
  successText: { fontSize: "13px", color: "#0F6E56", fontWeight: 500 },
  codeDisplay: {
    background: "#f4f3ec", borderRadius: "8px",
    padding: "12px 14px", marginBottom: "16px",
    display: "flex", alignItems: "center", justifyContent: "space-between",
  },
  codeText: { fontSize: "20px", fontWeight: 500, letterSpacing: "3px", fontFamily: "monospace" },
  copyBtn: {
    fontSize: "12px", padding: "5px 10px",
    background: "white", border: "1px solid #e5e4e7",
    borderRadius: "6px", cursor: "pointer", color: "#6b6375",
  },
};

export default CreateRoomModal;