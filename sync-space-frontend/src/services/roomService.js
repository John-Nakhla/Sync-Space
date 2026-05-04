import axios from "axios";

const API_URL = "http://localhost:8080/api/rooms";

// 🔐 Attach token to every request
const getAuthHeader = () => {
  return {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };
};

// ✅ Create Room
export const createRoom = async (roomData) => {
  const response = await axios.post(
    `${API_URL}/create`,
    roomData,
    getAuthHeader()
  );
  return response.data;
};

// ✅ Join Room
export const joinRoom = async (code) => {
  const response = await axios.post(
    `${API_URL}/join/${code}`,
    {},
    getAuthHeader()
  );
  return response.data;
};