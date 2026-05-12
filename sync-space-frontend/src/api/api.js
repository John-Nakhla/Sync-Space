import axios from "axios";

const api = axios.create({
    baseURL: "http://localhost:8080",
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("token");
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

api.interceptors.response.use(
    res => res,
    err => {
        if (err.response?.status === 401 || err.response?.status === 403){
            // 🔥 Print the exact error so we can fix it!
            console.error("🚨 BACKEND REJECTED REQUEST:", err.response.status, err.config.url);
            
            // 🛑 COMMENTED OUT SO IT STOPS KICKING YOU
            // localStorage.removeItem("token");
            // window.location.href = "/login";
        }
        return Promise.reject(err);
    }
);

export default api;