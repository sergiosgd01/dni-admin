import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export const dniService = {
    // Save DNI (Manual entry if needed)
    save: (data) => api.post('/dni/save', data),

    // Get All DNIs
    getAll: () => api.get('/dni'),

    // Get DNI by ID
    getById: (id) => api.get(`/dni/${id}`),

    // Get History by DNI Number
    getHistory: (dniNumber) => api.get(`/dni/history/${dniNumber}`),

    // Delete DNI
    delete: (id) => api.delete(`/dni/${id}`),

    // Health Check
    health: () => api.get('/health'),
};

export default api;
