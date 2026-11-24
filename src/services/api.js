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

// Campos de un registro que puede enseñar el panel. Todo lo demás se descarta al llegar,
// para que nada de lo que guardaban los registros antiguos (el DNI en claro o cifrado, su huella,
// el texto leído por OCR o las imágenes) llegue a ninguna pantalla aunque el backend lo devuelva
const CAMPOS_DEL_REGISTRO = [
  '_id', 'createdAt', 'updatedAt', 'profileUsed', 'hiddenFields', 'manualCensor', 'manualDetection',
  'hologramReadable', 'homogenityPassed', 'watermarkText', 'deteccion',
];

const limpiarRegistro = (registro) => {
  if (!registro || typeof registro !== 'object') return null;
  return Object.fromEntries(
    CAMPOS_DEL_REGISTRO.filter((campo) => campo in registro).map((campo) => [campo, registro[campo]])
  );
};

// Solo se mandan los filtros que tienen valor
const soloConValor = (filtros) =>
  Object.fromEntries(Object.entries(filtros).filter(([, valor]) => valor !== undefined && valor !== null && valor !== ''));

export const dniService = {
  // Una página del listado, del registro más reciente al más antiguo
  list: async ({ page, limit }, signal) => {
    const { data } = await api.get('/dni', { params: { page, limit }, signal });
    const registros = Array.isArray(data?.data) ? data.data.map(limpiarRegistro).filter(Boolean) : [];
    return { ...data, data: registros };
  },

  getById: async (id, signal) => {
    const { data } = await api.get(`/dni/${encodeURIComponent(id)}`, { signal });
    return limpiarRegistro(data?.data);
  },

  delete: (id) => api.delete(`/dni/${encodeURIComponent(id)}`),

  // Fallos de detección por campo y cara, con filtros opcionales de modelo y fechas (AAAA-MM-DD)
  fieldStats: async ({ modelo, desde, hasta }, signal) => {
    const { data } = await api.get('/dni/stats/campos', { params: soloConValor({ modelo, desde, hasta }), signal });
    return data?.data ?? null;
  },

  // Resumen del uso de la web (BACK-4), con filtros opcionales de fechas (AAAA-MM-DD)
  summary: async ({ desde, hasta }, signal) => {
    const { data } = await api.get('/dni/stats/resumen', { params: soloConValor({ desde, hasta }), signal });
    return data?.data ?? null;
  },

  // Health Check
  health: () => api.get('/health'),
};

/**
 * Mensaje en español para un error de una petición al backend.
 * @param {unknown} error - Error de axios
 * @param {object} [mensajes] - Textos para casos concretos, por código de estado
 */
export const describirError = (error, mensajes = {}) => {
  const status = error?.response?.status;
  if (status && mensajes[status]) return mensajes[status];
  if (!error?.response) return 'No se pudo conectar con el backend. Comprueba la conexión y vuelve a probar.';
  if (status === 429) return 'Demasiadas peticiones seguidas. Espera unos minutos y vuelve a probar.';
  if (status >= 500) return 'El backend ha fallado al responder. Vuelve a probar en un rato.';
  return error.response.data?.message || `El backend respondió con un error (${status}).`;
};

export const esCancelacion = (error) => axios.isCancel(error);

export default api;
