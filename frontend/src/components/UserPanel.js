import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { logout, getCurrentUser, getTimeRemaining, getUserProfile } from '../services/api';
import ChangePassword from './ChangePassword';
import { toast } from 'react-toastify';

const UserPanel = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [timeRemaining, setTimeRemaining] = useState(900);
    const [activeTab, setActiveTab] = useState('profile');
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) {
            navigate('/login');
            return;
        }

        fetchUserProfile();

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

    const fetchUserProfile = async () => {
        try {
            const profile = await getUserProfile();
            setCurrentUser(profile);

            if (profile.must_change_password === 1) {
                setShowChangePasswordModal(true);
            }
        } catch (error) {
            console.error('Error fetching profile:', error);
            toast.error('Błąd podczas pobierania danych profilu');
        } finally {
            setLoading(false);
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

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('pl-PL');
    };

    if (loading) {
        return <div className="loading">Ładowanie profilu...</div>;
    }

    return (
        <div className="admin-panel">
            <header className="admin-header">
                <div className="header-content">
                    <h1>Panel Użytkownika</h1>
                    <div className="header-info">
                        <span className="user-info">
                            Zalogowany: <strong>{currentUser?.username}</strong>
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
                        className={activeTab === 'profile' ? 'active' : ''}
                        onClick={() => setActiveTab('profile')}
                    >
                        Profil użytkownika
                    </button>
                </nav>

                <div className="admin-main">
                    {activeTab === 'profile' && (
                        <div className="user-profile">
                            <h2>Informacje o koncie</h2>

                            <div className="profile-info-card">
                                <div className="profile-row">
                                    <span className="profile-label">Login:</span>
                                    <span className="profile-value">{currentUser?.username}</span>
                                </div>

                                <div className="profile-row">
                                    <span className="profile-label">Imię i nazwisko:</span>
                                    <span className="profile-value">{currentUser?.full_name || '-'}</span>
                                </div>

                                <div className="profile-row">
                                    <span className="profile-label">Rola:</span>
                                    <span className="profile-value">
                                        {currentUser?.is_admin === 1 ? 'Administrator' : 'Użytkownik'}
                                    </span>
                                </div>

                                <div className="profile-row">
                                    <span className="profile-label">Data utworzenia konta:</span>
                                    <span className="profile-value">{formatDate(currentUser?.created_at)}</span>
                                </div>

                                <div className="profile-row">
                                    <span className="profile-label">Ostatnia zmiana hasła:</span>
                                    <span className="profile-value">{formatDate(currentUser?.last_password_change)}</span>
                                </div>

                                <div className="profile-row">
                                    <span className="profile-label">Ważność hasła:</span>
                                    <span className="profile-value">
                                        {currentUser?.password_expiry_days === 0
                                            ? 'Hasło nie wygasa'
                                            : `${currentUser?.password_expiry_days} dni`}
                                    </span>
                                </div>

                                <div className="profile-row">
                                    <span className="profile-label">Hasło:</span>
                                    <span className="profile-value">
                                        ••••••••••
                                        <button
                                            className="change-password-icon-btn"
                                            onClick={() => setShowChangePasswordModal(true)}
                                            title="Zmień hasło"
                                        >
                                            🔑 Zmień hasło
                                        </button>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {showChangePasswordModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <div className="modal-header">
                            <h3>Zmiana hasła</h3>
                            {currentUser?.must_change_password !== 1 && (
                                <button
                                    className="modal-close-btn"
                                    onClick={() => setShowChangePasswordModal(false)}
                                >
                                    ✕
                                </button>
                            )}
                        </div>

                        {currentUser?.must_change_password === 1 && (
                            <div className="modal-warning">
                                <p><strong>⚠️ Wymagana zmiana hasła</strong></p>
                                <p>Musisz zmienić hasło przy pierwszym logowaniu.</p>
                            </div>
                        )}

                        <ChangePassword
                            currentUser={currentUser}
                            onSuccess={() => {
                                setShowChangePasswordModal(false);
                                fetchUserProfile();
                                toast.success('Profil zaktualizowany');
                            }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserPanel;
