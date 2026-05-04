import { useState } from "react";
import { joinRoom } from "../../services/roomService";

function JoinRoomModal({ onClose }) {
  const [code, setCode] = useState("");

  const handleJoin = async (e) => {
    e.preventDefault();
    await joinRoom(code);
    alert("Joined room!");
    onClose();
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <h3>Join Room</h3>

        <form onSubmit={handleJoin}>
          <input
            placeholder="Enter Room Code"
            onChange={(e) => setCode(e.target.value)}
          />

          <button type="submit">Join</button>
        </form>

        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}

const styles = {
  overlay: {
    position: "fixed",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0,0,0,0.6)",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    background: "white",
    padding: "20px",
    borderRadius: "10px",
    width: "350px",
  },
};

export default JoinRoomModal;