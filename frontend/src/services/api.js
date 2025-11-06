// api.js

import axios from 'axios';

const API_BASE_URL = 'http://127.0.0.1:5000/api';

const apiClient = axios.create({
    baseURL: API_BASE_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

apiClient.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response && error.response.status === 401) {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            localStorage.removeItem('loginTime');
            localStorage.removeItem('tokenExpiry');
            localStorage.removeItem('idleTimeout');
            localStorage.removeItem('lastActivityTime');
            localStorage.removeItem('sessionWarningShown');

            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

// ===== Test =====

export const testConnection = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/test`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

// ===== Login / Logout =====

export const login = async (data) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/login`, data);

        if (response.data.success) {
            const now = Date.now();
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            localStorage.setItem('loginTime', now.toString()); // ✅ Raz!
            localStorage.setItem('tokenExpiry', (now + response.data.expires_in * 1000).toString());

            const idleTimeout = response.data.idle_timeout_minutes || 15;
            localStorage.setItem('idleTimeout', (idleTimeout * 60 * 1000).toString()); // ✅ W milisekundach!
        }

        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};


export const verifyToken = async () => {
    try {
        const response = await apiClient.get('/verify-token');
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const logout = async () => {
    try {
        await apiClient.post('/logout');
    } catch (error) {
        console.error('Logout error:', error);
    } finally {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        localStorage.removeItem('tokenExpiry');
        localStorage.removeItem('idleTimeout');
        localStorage.removeItem('lastActivityTime');
        localStorage.removeItem('sessionWarningShown');
    }
    return { success: true };
};

// ===== Password Management =====

export const changePassword = async (userId, oldPassword, newPassword, recaptchaToken) => {
    try {
        const response = await apiClient.post('/change-password', {
            user_id: userId,
            old_password: oldPassword,
            new_password: newPassword,
            recaptcha_token: recaptchaToken,
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getPasswordSettings = async () => {
    try {
        const response = await apiClient.get('/password-settings');
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const updatePasswordSettings = async (settings) => {
    try {
        const response = await apiClient.put('/password-settings', settings);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

// ===== System Settings =====

export const getSystemSettings = async () => {
    try {
        const response = await apiClient.get('/system-settings');
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const updateSystemSettings = async (settings) => {
    try {
        const response = await apiClient.put('/system-settings', settings);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

// ===== User Management =====

export const getUsers = async () => {
    try {
        const response = await apiClient.get('/users');
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const createUser = async (userData) => {
    try {
        const response = await apiClient.post('/users', userData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const updateUser = async (userId, userData) => {
    try {
        const response = await apiClient.put(`/users/${userId}`, userData);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const blockUser = async (userId, isBlocked) => {
    try {
        const response = await apiClient.put(`/users/${userId}/block`, {
            is_blocked: isBlocked ? 1 : 0,
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const deleteUser = async (userId) => {
    try {
        const response = await apiClient.delete(`/users/${userId}`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const resetUserPassword = async (userId, data) => {
    try {
        const response = await apiClient.put(`/users/${userId}/reset-password`, data);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getUserProfile = async () => {
    try {
        const response = await apiClient.get('/user/profile');
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

// ===== Authentication Helpers - TYLKO LOCALSTORAGE =====

export const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    const tokenExpiry = localStorage.getItem('tokenExpiry');

    if (!token || !tokenExpiry) return false;

    const remaining = parseInt(tokenExpiry) - Date.now();
    return remaining > 0;
};

export const getCurrentUser = () => {
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

export const isAdmin = () => {
    const user = getCurrentUser();
    return user && user.is_admin === 1;
};

// POBIERA CZAS Z LOCALSTORAGE - BEZ ŻADNYCH REQUESTÓW!
export const getTimeRemaining = () => {
    const tokenExpiry = localStorage.getItem('tokenExpiry');
    if (!tokenExpiry) return 0;

    const remaining = parseInt(tokenExpiry) - Date.now();
    return remaining > 0 ? Math.floor(remaining / 1000) : 0;
};

// POBIERA IDLE TIMEOUT Z LOCALSTORAGE - BEZ ŻADNYCH REQUESTÓW!
export const getIdleTimeout = () => {
    const idleTimeout = localStorage.getItem('idleTimeout');
    return idleTimeout ? parseInt(idleTimeout) : 15 * 60 * 1000;
};

// AKTUALIZUJE LAST ACTIVITY - BEZ ŻADNYCH REQUESTÓW!
export const updateActivityTime = () => {
    localStorage.setItem('lastActivityTime', Date.now().toString());
};

// ===== Logs =====

export const getLogs = async () => {
    try {
        const response = await apiClient.get('/logs');
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

// ===== CAPTCHA Functions =====

export const getCaptchaQuestion = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/captcha/question`);
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const verifyCaptcha = async (questionId, answer) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/captcha/verify`, {
            question_id: questionId,
            answer: answer,
        });
        return response.data;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export const getRecaptchaSiteKey = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/recaptcha/site-key`);
        return response.data.site_key;
    } catch (error) {
        throw error.response?.data || error;
    }
};

export default apiClient;