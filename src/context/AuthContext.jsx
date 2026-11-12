import { createContext, useState, useContext } from 'react';
import { authService, tokenStorage } from '../services/api';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

// Reads the user from the stored JWT only to show the session in the UI.
// The real check is always done by the backend on every request.
const getUserFromToken = (token) => {
    if (!token) return null;

    try {
        const payloadPart = token.split('.')[1];
        const base64 = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
        const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
        const payload = JSON.parse(new TextDecoder().decode(bytes));

        if (!payload.exp || payload.exp * 1000 <= Date.now()) {
            return null;
        }

        return { username: payload.sub, role: payload.role };
    } catch {
        return null;
    }
};

const loadInitialUser = () => {
    const user = getUserFromToken(tokenStorage.get());
    if (!user) {
        // Also removes the old "dni_admin_user" key from the client-side login
        tokenStorage.clear();
    }
    return user;
};

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(loadInitialUser);

    const login = async (username, password) => {
        try {
            const response = await authService.login(username, password);
            const token = response.data?.token;
            const userData = getUserFromToken(token);

            if (!userData) {
                return { success: false, message: 'Respuesta de acceso no válida' };
            }

            tokenStorage.set(token);
            setUser(userData);
            return { success: true };
        } catch (error) {
            const status = error.response?.status;

            if (status === 400 || status === 401) {
                return { success: false, message: 'Credenciales incorrectas' };
            }

            return {
                success: false,
                message: error.response?.data?.message || 'No se pudo conectar con el servidor'
            };
        }
    };

    const logout = () => {
        tokenStorage.clear();
        setUser(null);
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading: false }}>
            {children}
        </AuthContext.Provider>
    );
};
