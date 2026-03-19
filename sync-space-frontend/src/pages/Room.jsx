import { useParams } from "react-router-dom";

function Room() {
  const { roomId } = useParams();

  return <h1>Room ID: {roomId}</h1>;
}

export default Room;