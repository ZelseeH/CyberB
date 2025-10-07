import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser, getTimeRemaining } from '../services/api';
import ChangePassword from './ChangePassword';
import { toast } from 'react-toastify';

const UserPanel = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(900);

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) {
            navigate('/login');
            return;
        }
        setCurrentUser(user);

        const timer = setInterval(() => {
            const remaining = getTimeRemaining();
            setTimeRemaining(remaining);

            if (remaining <= 0) {
                handleLogout();
                toast.error('Sesja wygasła. Zaloguj się ponownie.');
            } else if (remaining === 60) {
                toast.warning('Zostało 1 minuta do automatycznego wylogowania!');
            }
        }, 1000);

        return () => clearInterval(timer);
    }, [navigate]);

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
                    <h1>Panel Użytkownika</h1>
                    <div className="header-info">
                        <span className="user-info">
                            Zalogowany: <strong>{currentUser?.username}</strong> ({currentUser?.full_name || 'Użytkownik'})
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
                <div className="admin-main">
                    <ChangePassword currentUser={currentUser} />
                </div>
            </div>
        </div>
    );
};

export default UserPanel;
