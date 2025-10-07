import { jwtDecode } from 'jwt-decode';

export const saveToken = (token) => {
    localStorage.setItem('token', token);
    localStorage.setItem('loginTime', Date.now().toString());
};

export const getToken = () => {
    return localStorage.getItem('token');
};

export const removeToken = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    localStorage.removeItem('loginTime');
};

export const saveUser = (user) => {
    localStorage.setItem('user', JSON.stringify(user));
};

export const getUser = () => {
    const userStr = localStorage.getItem('user');
    if (userStr) {
        try {
            return JSON.parse(userStr);
        } catch (e) {
            return null;
        }
    }
    return null;
};

export const isTokenExpired = (token) => {
    if (!token) return true;

    try {
        const decoded = jwtDecode(token);
        const currentTime = Date.now() / 1000;
        return decoded.exp < currentTime;
    } catch (e) {
        return true;
    }
};

export const isSessionExpired = () => {
    const loginTime = localStorage.getItem('loginTime');
    if (!loginTime) return true;

    const elapsed = Date.now() - parseInt(loginTime);
    return elapsed > 900000;
};

export const isAuthenticated = () => {
    const token = getToken();

    if (!token) return false;
    if (isTokenExpired(token)) {
        removeToken();
        return false;
    }
    if (isSessionExpired()) {
        removeToken();
        return false;
    }

    return true;
};

export const isAdmin = () => {
    const user = getUser();
    return user && user.is_admin === 1;
};

export const getTimeRemaining = () => {
    const loginTime = localStorage.getItem('loginTime');
    if (!loginTime) return 0;

    const elapsed = Date.now() - parseInt(loginTime);
    const remaining = 900000 - elapsed;

    return remaining > 0 ? Math.floor(remaining / 1000) : 0;
};

export const formatTimeRemaining = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
};

export const getUserFromToken = (token) => {
    if (!token) return null;

    try {
        const decoded = jwtDecode(token);
        return {
            user_id: decoded.user_id,
            username: decoded.username,
            is_admin: decoded.is_admin,
        };
    } catch (e) {
        return null;
    }
};

export const clearAuth = () => {
    removeToken();
};
