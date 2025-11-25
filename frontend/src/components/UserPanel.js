import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getCurrentUser, getUserProfile } from '../services/api';
import { useSessionTimeout } from '../hooks/useSessionTimeout';
import SessionHeader from './SessionHeader';
import ChangePassword from './ChangePassword';
import { toast } from 'react-toastify';

const UserPanel = () => {
    const navigate = useNavigate();
    const [currentUser, setCurrentUser] = useState(null);
    const [activeTab, setActiveTab] = useState('profile');
    const [showChangePasswordModal, setShowChangePasswordModal] = useState(false);
    const [loading, setLoading] = useState(true);
    const { timeRemaining } = useSessionTimeout();

    const [isFullVersion, setIsFullVersion] = useState(false);
    const [unlockKey, setUnlockKey] = useState("");
    const [uploadStatus, setUploadStatus] = useState("");
    const [selectedFile, setSelectedFile] = useState(null);

    useEffect(() => {
        const user = getCurrentUser();
        if (!user) {
            navigate('/login');
            return;
        }

        fetchUserProfile();
        checkLicenseStatus();
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

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('pl-PL');
    };

    const checkLicenseStatus = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/check-license', {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });
            if (response.ok) {
                const data = await response.json();
                setIsFullVersion(data.is_full_version);
            }
        } catch (error) {
            console.error("Błąd sprawdzania licencji:", error);
        }
    };

    const handleUnlock = async () => {
        try {
            const response = await fetch('http://localhost:5000/api/unlock-license', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify({ key: unlockKey })
            });
            const data = await response.json();

            if (data.success) {
                setIsFullVersion(true);
                toast.success(data.message);
                setUnlockKey("");
            } else {
                toast.error(data.message);
            }
        } catch (err) {
            console.error(err);
            toast.error("Błąd komunikacji z serwerem.");
        }
    };

    const handleFileUpload = async () => {
        if (!selectedFile) {
            toast.error("Wybierz plik przed wysłaniem.");
            return;
        }

        const MAX_BYTES = 100 * 1024;
        if (!isFullVersion && selectedFile.size > MAX_BYTES) {
            const sizeKB = (selectedFile.size / 1024).toFixed(2);
            toast.warning(`WERSJA DEMO: Plik ma ${sizeKB} KB (Limit: 100 KB). Odblokuj program.`);
        }

        const formData = new FormData();
        formData.append('file', selectedFile);

        setUploadStatus("Wysyłanie...");

        try {
            const response = await fetch('http://localhost:5000/api/upload-file', {
                method: 'POST',
                credentials: 'include',
                body: formData
            });
            const data = await response.json();

            if (response.ok) {
                setUploadStatus(`Sukces: ${data.message}`);
                toast.success("Plik wgrany pomyślnie!");
                setSelectedFile(null);
                document.getElementById('fileInput').value = "";
            } else {
                if (data.error === "DEMOWARE_LIMIT") {
                    toast.error("Błąd licencji: Plik za duży dla wersji DEMO.");
                } else {
                    toast.error(`Błąd: ${data.message}`);
                }
                setUploadStatus(`Błąd: ${data.message}`);
            }
        } catch (err) {
            console.error(err);
            setUploadStatus("Błąd połączenia.");
            toast.error("Błąd wysyłania pliku.");
        }
    };

    if (loading) {
        return <div className="loading">Ładowanie profilu...</div>;
    }

    return (
        <div className="admin-panel">
            <SessionHeader
                title="Panel Użytkownika"
                username={currentUser?.username}
                fullName={currentUser?.full_name}
                timeRemaining={timeRemaining}
                isAdmin={false}
            />

            <div className="admin-content">
                <nav className="admin-nav">
                    <button
                        className={activeTab === 'profile' ? 'active' : ''}
                        onClick={() => setActiveTab('profile')}
                    >
                        Profil użytkownika
                    </button>
                    <button
                        className={activeTab === 'files' ? 'active' : ''}
                        onClick={() => setActiveTab('files')}
                    >
                        Menedżer Plików
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
                                    <span className="profile-label">Data utworzenia:</span>
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
                                    <span className="profile-label">Zmiana hasła:</span>
                                    <span className="profile-value">
                                        ••••••••••
                                        <button
                                            className="change-password-icon-btn"
                                            onClick={() => setShowChangePasswordModal(true)}
                                            title="Zmień hasło"
                                        >
                                            🔑
                                        </button>
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeTab === 'files' && (
                        <div className="user-profile">
                            <h2>Menedżer Plików</h2>

                            <div className={`profile-info-card license-card ${isFullVersion ? 'full' : 'demo'}`}
                                style={{
                                    borderLeft: isFullVersion ? '5px solid #28a745' : '5px solid #dc3545',
                                    marginBottom: '20px'
                                }}>
                                <h3>
                                    Status Licencji: {' '}
                                    {isFullVersion ?
                                        <span style={{ color: '#28a745', fontWeight: 'bold' }}>PEŁNA WERSJA (PREMIUM)</span> :
                                        <span style={{ color: '#dc3545', fontWeight: 'bold' }}>DEMO (Limit 100 KB)</span>
                                    }
                                </h3>

                                {!isFullVersion && (
                                    <div className="license-unlock-area" style={{ marginTop: '15px', padding: '15px', background: '#f8f9fa', borderRadius: '5px' }}>
                                        <p>
                                            Program jest w wersji DEMO. Aby wgrywać większe pliki, wprowadź klucz.
                                        </p>
                                        <p style={{ fontSize: '0.85em', color: '#6c757d', fontStyle: 'italic' }}>
                                            Podpowiedź: Szyfr Cezara (przesunięcie +3). Hasło wynikowe to STUDENT.<br />
                                            Wpisz zaszyfrowane hasło: <strong>VWXGHQW</strong>
                                        </p>

                                        <div style={{ display: 'flex', gap: '10px', marginTop: '10px' }}>
                                            <input
                                                type="text"
                                                placeholder="Wprowadź klucz licencji..."
                                                value={unlockKey}
                                                onChange={(e) => setUnlockKey(e.target.value)}
                                                className="form-control"
                                                style={{ flex: 1, padding: '8px', border: '1px solid #ced4da', borderRadius: '4px' }}
                                            />
                                            <button
                                                onClick={handleUnlock}
                                                className="btn-primary"
                                                style={{ padding: '8px 20px', background: '#007bff', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                            >
                                                Odblokuj
                                            </button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="profile-info-card">
                                <h3>Wgraj nowy plik</h3>
                                <div style={{ marginTop: '15px' }}>
                                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginBottom: '10px' }}>
                                        <input
                                            id="fileInput"
                                            type="file"
                                            onChange={(e) => setSelectedFile(e.target.files[0])}
                                            style={{ flex: 1 }}
                                        />
                                        <button
                                            onClick={handleFileUpload}
                                            disabled={!selectedFile}
                                            style={{
                                                padding: '8px 20px',
                                                background: selectedFile ? '#28a745' : '#6c757d',
                                                color: 'white',
                                                border: 'none',
                                                borderRadius: '4px',
                                                cursor: selectedFile ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            Wyślij na serwer
                                        </button>
                                    </div>

                                    {selectedFile && (
                                        <div style={{ fontSize: '0.9em', color: '#666', marginBottom: '10px' }}>
                                            Wybrany plik: <strong>{selectedFile.name}</strong> ({(selectedFile.size / 1024).toFixed(2)} KB)
                                        </div>
                                    )}

                                    {uploadStatus && (
                                        <div className={`alert ${uploadStatus.startsWith('Sukces') ? 'alert-success' : 'alert-error'}`}
                                            style={{
                                                padding: '10px',
                                                background: uploadStatus.startsWith('Sukces') ? '#d4edda' : '#f8d7da',
                                                color: uploadStatus.startsWith('Sukces') ? '#155724' : '#721c24',
                                                borderRadius: '4px'
                                            }}>
                                            {uploadStatus}
                                        </div>
                                    )}
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
