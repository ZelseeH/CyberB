// components/SessionHeader.js

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { logout } from '../services/api';
import { toast } from 'react-toastify';

const SessionHeader = ({ title, username, fullName, timeRemaining, isAdmin, onLogout }) => {
    const navigate = useNavigate();

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    const handleLogoutClick = async () => {
        try {
            await logout();
            toast.success('Wylogowano pomyślnie');
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            navigate('/login');
        }
    };

    return (
        <header className="admin-header">
            <div className="header-content">
                <h1>{title}</h1>
                <div className="header-info">
                    <span className="user-info">
                        Zalogowany: <strong>{username}</strong> {fullName && `(${fullName})`}
                    </span>
                    <span className="time-remaining">
                        Czas sesji: <strong>{formatTime(timeRemaining)}</strong>
                    </span>
                    <button onClick={handleLogoutClick} className="logout-btn">
                        Wyloguj
                    </button>
                </div>
            </div>
        </header>
    );
};

export default SessionHeader;