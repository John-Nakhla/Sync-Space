import axios from "axios";

const API_URL = "http://localhost:8080/api/rooms";

const getAuthHeader = () => {
  return {
    headers: {
      Authorization: `Bearer ${localStorage.getItem("token")}`,
    },
  };
};

export const createRoom = async (roomData) => {
  const response = await axios.post(`${API_URL}/create`, roomData, getAuthHeader());
  return response.data;
};

export const joinRoom = async (code) => {
  const response = await axios.post(`${API_URL}/join/${code}`, {}, getAuthHeader());
  return response.data;
};

// ✅ Fetch Room Info
export const fetchRoomInfo = async (roomId) => {
    const response = await axios.get(`${API_URL}/${roomId}`, getAuthHeader());
    return response.data;
};

// ✅ Pause Room
export const pauseRoomAction = async (roomId) => {
    const response = await axios.post(`${API_URL}/${roomId}/end`, {}, getAuthHeader());
    return response.data;
};

// ✅ Resume Room
export const resumeRoomAction = async (roomId) => {
    const response = await axios.post(`${API_URL}/${roomId}/resume`, {}, getAuthHeader());
    return response.data;
};