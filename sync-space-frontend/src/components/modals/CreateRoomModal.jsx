import { useState } from "react";
import { createRoom } from "../../services/roomService";

function CreateRoomModal({ onClose }) {
  const [roomData, setRoomData] = useState({
    name: "",
    description: "",
  });

  const [createdRoom, setCreatedRoom] = useState(null);

  const handleCreate = async (e) => {
    e.preventDefault();
    const room = await createRoom(roomData);
    setCreatedRoom(room);
  };

  return (
    <div style={styles.overlay}>
      <div style={styles.box}>
        <h3>Create Room</h3>

        {!createdRoom ? (
          <form onSubmit={handleCreate}>
            <input
              placeholder="Room Name"
              onChange={(e) =>
                setRoomData({ ...roomData, name: e.target.value })
              }
            />

            <input
              placeholder="Description"
              onChange={(e) =>
                setRoomData({
                  ...roomData,
                  description: e.target.value,
                })
              }
            />

            <button type="submit">Create</button>
          </form>
        ) : (
          <div>
            <h4>Room Created 🎉</h4>

            <p>
              Join Code: <b>{createdRoom.joinCode}</b>
            </p>

            <button
              onClick={() =>
                navigator.clipboard.writeText(createdRoom.joinCode)
              }
            >
              Copy Code
            </button>
          </div>
        )}

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

export default CreateRoomModal;