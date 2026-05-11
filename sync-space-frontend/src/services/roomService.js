import api from "../api/api";

const API_URL = "/api/rooms";

export const createRoom = async (roomData) => {
  const response = await api.post(`${API_URL}/create`, roomData);
  return response.data;
};

export const joinRoom = async (code) => {
  const response = await api.post(`${API_URL}/join/${code}`, {});
  return response.data;
};

export const fetchRoomInfo = async (roomId) => {
  const response = await api.get(`${API_URL}/${roomId}`);
  return response.data;
};

export const pauseRoomAction = async (roomId) => {
  const response = await api.post(`${API_URL}/${roomId}/end`, {});
  return response.data;
};

export const resumeRoomAction = async (roomId) => {
  const response = await api.post(`${API_URL}/${roomId}/resume`, {});
  return response.data;
};