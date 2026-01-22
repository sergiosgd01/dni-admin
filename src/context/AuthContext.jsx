import { createContext, useState, useContext, useEffect } from 'react';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // Check local storage for session persistence
        const storedUser = localStorage.getItem('dni_admin_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
        setLoading(false);
    }, []);

    const login = (username, password) => {
        // Credentials from environment variables
        const ADMIN_USER = import.meta.env.VITE_ADMIN_USER;
        const ADMIN_PASS = import.meta.env.VITE_ADMIN_PASS;

        if (username === ADMIN_USER && password === ADMIN_PASS) {
            const userData = { username, role: 'admin' };
            setUser(userData);
            localStorage.setItem('dni_admin_user', JSON.stringify(userData));
            return { success: true };
        } else {
            return { success: false, message: 'Credenciales incorrectas' };
        }
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem('dni_admin_user');
    };

    return (
        <AuthContext.Provider value={{ user, login, logout, loading }}>
            {!loading && children}
        </AuthContext.Provider>
    );
};
