// AdminPanel.js

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser } from '../services/api';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import SessionHeader from './SessionHeader';
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
    const { timeRemaining, updateIdleTimeout } = useSessionTimeout();

    React.useEffect(() => {
        const user = getCurrentUser();
        if (!user || user.is_admin !== 1) {
            navigate('/login');
            return;
        }
        setCurrentUser(user);
    }, [navigate]);

    const handleSettingsUpdated = () => {
        const newTimeoutMs = localStorage.getItem('idleTimeout');
        if (newTimeoutMs) {
            console.log(`🔄 Settings updated in AdminPanel! New timeout: ${parseInt(newTimeoutMs) / 1000 / 60}min`);
            updateIdleTimeout(parseInt(newTimeoutMs));
            toast.info('⏳ Twoja sesja została wydłużona!');
        }
    };

    return (
        <div className="admin-panel">
            <SessionHeader
                title="Panel Administratora"
                username={currentUser?.username}
                fullName={currentUser?.full_name}
                timeRemaining={timeRemaining}
                isAdmin={true}
            />

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
                    {activeTab === 'system-settings' && (
                        <SystemSettings onSettingsUpdated={handleSettingsUpdated} />
                    )}
                    {activeTab === 'change-password' && <ChangePassword currentUser={currentUser} />}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
