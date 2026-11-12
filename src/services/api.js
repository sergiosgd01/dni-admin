import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL;
const TOKEN_KEY = 'dni_admin_token';
const LEGACY_USER_KEY = 'dni_admin_user';

// Session token returned by the backend after login
export const tokenStorage = {
  get: () => localStorage.getItem(TOKEN_KEY),
  set: (token) => localStorage.setItem(TOKEN_KEY, token),
  clear: () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(LEGACY_USER_KEY);
  },
};

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Send the session token with every request
api.interceptors.request.use((config) => {
  const token = tokenStorage.get();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// If the backend rejects the token, close the session and go back to the login page
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    const isLoginRequest = error.config?.url?.includes('/auth/login');

    if ((status === 401 || status === 403) && !isLoginRequest) {
      tokenStorage.clear();
      if (window.location.pathname !== '/login') {
        window.location.assign('/login');
      }
    }

    return Promise.reject(error);
  }
);

export const authService = {
  login: (username, password) => api.post('/auth/login', { username, password }),
};

export const dniService = {
  // Save DNI (Manual entry if needed)
  save: (data) => api.post('/dni/save', data),

  // Get All DNIs
  getAll: () => api.get('/dni'),

  // Get DNI by ID
  getById: (id) => api.get(`/dni/${id}`),

  // Get History by DNI Number (Legacy, might be replaced or kept depending on backend, leaving untouched)
  getHistory: (dniNumber) => api.get(`/dni/history/${dniNumber}`),

  // Get Usage Count for a specific DNI Number
  getUsageCount: (dniNumber) => api.post('/dni/usage-count', { dniNumber }),

  // Delete DNI
  delete: (id) => api.delete(`/dni/${id}`),

  // Health Check
  health: () => api.get('/health'),
};

export default api;
