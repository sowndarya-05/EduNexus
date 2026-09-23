import axios from 'axios';

const API = axios.create({ baseURL: import.meta.env?.VITE_API_URL || 'http://localhost:5001/api' });

API.interceptors.request.use((req) => {
    let token = localStorage.getItem('token') || sessionStorage.getItem('token');
    if (token) {
        try {
            token = JSON.parse(token);
        } catch (e) {
            // In case it's a raw string
        }
        req.headers.Authorization = `Bearer ${token}`;
    }
    return req;
});

API.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.removeItem('token');
            sessionStorage.removeItem('user');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export default API;
