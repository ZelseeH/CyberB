// AdminPanel.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser, getTimeRemaining, getSystemSettings } from '../services/api';
import UserManagement from './UserManagement';
import PasswordSettings from './PasswordSettings';
import SystemSettings from './SystemSettings';
import ChangePassword from './ChangePassword';
import Logs from './Logs';
import { toast } from 'react-toastify';

const AdminPanel = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('users');
    const [timeRemaining, setTimeRemaining] = useState(900);
    const [idleTimeout, setIdleTimeout] = useState(15 * 60 * 1000); // default 15 min
    const [idleTimer, setIdleTimer] = useState(null);

    useEffect(() => {
        const user = getCurrentUser();
        if (!user || user.is_admin !== 1) {
            navigate('/login');
            return;
        }
        setCurrentUser(user);

        fetchSystemSettings();

        const tokenTimer = setInterval(() => {
            const remaining = getTimeRemaining();
            setTimeRemaining(remaining);

            if (remaining <= 0) {
                handleLogout();
                toast.error('Sesja wygasła. Zaloguj się ponownie.');
            } else if (remaining === 60) {
                toast.warning('Zostało 1 minuta do automatycznego wylogowania!');
            }
        }, 1000);

        // Idle timeout setup
        const resetIdleTimer = () => {
            if (idleTimer) clearTimeout(idleTimer);
            const timer = setTimeout(() => {
                handleLogout();
                toast.error('Wylogowano z powodu nieaktywności.');
            }, idleTimeout);
            setIdleTimer(timer);
        };

        document.addEventListener('mousemove', resetIdleTimer);
        document.addEventListener('keydown', resetIdleTimer);
        document.addEventListener('scroll', resetIdleTimer);
        document.addEventListener('click', resetIdleTimer);

        resetIdleTimer(); // Initial set

        return () => {
            clearInterval(tokenTimer);
            if (idleTimer) clearTimeout(idleTimer);
            document.removeEventListener('mousemove', resetIdleTimer);
            document.removeEventListener('keydown', resetIdleTimer);
            document.removeEventListener('scroll', resetIdleTimer);
            document.removeEventListener('click', resetIdleTimer);
        };
    }, [navigate, idleTimeout]);

    const fetchSystemSettings = async () => {
        try {
            const data = await getSystemSettings();
            setIdleTimeout(data.idle_timeout_minutes * 60 * 1000);
        } catch (error) {
            console.error('Error fetching system settings');
        }
    };

    const handleLogout = async () => {
        try {
            await logout();
            navigate('/login');
            toast.success('Wylogowano pomyślnie');
        } catch (error) {
            console.error('Logout error:', error);
            navigate('/login');
        }
    };

    const formatTime = (seconds) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <div className="admin-panel">
            <header className="admin-header">
                <div className="header-content">
                    <h1>Panel Administratora</h1>
                    <div className="header-info">
                        <span className="user-info">
                            Zalogowany: <strong>{currentUser?.username}</strong> ({currentUser?.full_name || 'Administrator'})
                        </span>
                        <span className="time-remaining">
                            Czas sesji: <strong>{formatTime(timeRemaining)}</strong>
                        </span>
                        <button onClick={handleLogout} className="logout-btn">
                            Wyloguj
                        </button>
                    </div>
                </div>
            </header>

            <div className="admin-content">
                <nav className="admin-nav">
                    <button
                        className={activeTab === 'users' ? 'active' : ''}
                        onClick={() => setActiveTab('users')}
                    >
                        Zarządzanie użytkownikami
                    </button>
                    <button
                        className={activeTab === 'logs' ? 'active' : ''}
                        onClick={() => setActiveTab('logs')}
                    >
                        Logi zdarzeń
                    </button>
                    <button
                        className={activeTab === 'password-settings' ? 'active' : ''}
                        onClick={() => setActiveTab('password-settings')}
                    >
                        Ustawienia haseł
                    </button>
                    <button
                        className={activeTab === 'system-settings' ? 'active' : ''}
                        onClick={() => setActiveTab('system-settings')}
                    >
                        Ustawienia systemowe
                    </button>
                    <button
                        className={activeTab === 'change-password' ? 'active' : ''}
                        onClick={() => setActiveTab('change-password')}
                    >
                        Zmień hasło
                    </button>
                </nav>

                <div className="admin-main">
                    {activeTab === 'users' && <UserManagement />}
                    {activeTab === 'logs' && <Logs />}
                    {activeTab === 'password-settings' && <PasswordSettings />}
                    {activeTab === 'system-settings' && <SystemSettings />}
                    {activeTab === 'change-password' && <ChangePassword currentUser={currentUser} />}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;