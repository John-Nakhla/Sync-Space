import api from '../api/api';

const API_URL = '/api/auth';

export const login = async (credentials) => {
    const response = await api.post(`${API_URL}/login`, credentials);
    if (response.data.token) {
        localStorage.setItem('token', response.data.token);
    }
    return response.data;
};

export const register = async (userData) => {
    const response = await api.post(`${API_URL}/register`, userData);
    return response.data;
};