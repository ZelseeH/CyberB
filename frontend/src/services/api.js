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

            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);

export const testConnection = async () => {
    try {
        const response = await axios.get(`${API_BASE_URL}/test`);
        return response.data;
    } catch (error) {
        throw error;
    }
};

export const login = async (data) => {
    try {
        const response = await axios.post(`${API_BASE_URL}/login`, data);

        if (response.data.success) {
            localStorage.setItem('token', response.data.token);
            localStorage.setItem('user', JSON.stringify(response.data.user));
            localStorage.setItem('loginTime', Date.now().toString());
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

        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');

        return { success: true };
    } catch (error) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        throw error.response?.data || error;
    }
};

export const changePassword = async (userId, oldPassword, newPassword) => {
    try {
        const response = await apiClient.post('/change-password', {
            user_id: userId,
            old_password: oldPassword,
            new_password: newPassword,
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

export const isAuthenticated = () => {
    const token = localStorage.getItem('token');
    const loginTime = localStorage.getItem('loginTime');

    if (!token || !loginTime) {
        return false;
    }

    const elapsed = Date.now() - parseInt(loginTime);
    if (elapsed > 900000) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('loginTime');
        return false;
    }

    return true;
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

export const getTimeRemaining = () => {
    const loginTime = localStorage.getItem('loginTime');
    if (!loginTime) return 0;

    const elapsed = Date.now() - parseInt(loginTime);
    const remaining = 900000 - elapsed;

    return remaining > 0 ? Math.floor(remaining / 1000) : 0;
};

export default apiClient;

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