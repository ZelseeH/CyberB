import React, { useState, useEffect } from 'react';
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

    // Honeytokens state
    const [honeytokenData, setHoneytokenData] = useState(null);
    const [loadingHoneytokens, setLoadingHoneytokens] = useState(false);

    useEffect(() => {
        const user = getCurrentUser();
        if (!user || user.is_admin !== 1) {
            navigate('/login');
            return;
        }
        setCurrentUser(user);
    }, [navigate]);

    useEffect(() => {
        if (activeTab === 'honeytokens') {
            fetchHoneytokenStatus();
        }
    }, [activeTab]);

    const handleSettingsUpdated = () => {
        const newTimeoutMs = localStorage.getItem('idleTimeout');
        if (newTimeoutMs) {
            console.log(`🔄 Settings updated in AdminPanel! New timeout: ${parseInt(newTimeoutMs) / 1000 / 60}min`);
            updateIdleTimeout(parseInt(newTimeoutMs));
            toast.info('⏳ Twoja sesja została wydłużona!');
        }
    };

    const fetchHoneytokenStatus = async () => {
        setLoadingHoneytokens(true);
        try {
            const token = localStorage.getItem('token');
            const response = await fetch('http://localhost:5000/api/honeytoken/status', {
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            if (response.ok) {
                const data = await response.json();
                setHoneytokenData(data);
            } else {
                toast.error('Błąd pobierania danych honeytokenów');
            }
        } catch (error) {
            console.error('Error fetching honeytoken status:', error);
            toast.error('Błąd połączenia z serwerem');
        } finally {
            setLoadingHoneytokens(false);
        }
    };

    const testHoneytoken = async (endpoint) => {
        try {
            const response = await fetch(`http://localhost:5000${endpoint}`);
            if (response.ok) {
                toast.success('🍯 Honeytoken aktywowany! Sprawdź email i logi.');
                setTimeout(() => fetchHoneytokenStatus(), 1000);
            }
        } catch (error) {
            console.error('Error testing honeytoken:', error);
            toast.error('Błąd testowania honeytokenu');
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('pl-PL');
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
                        className={activeTab === 'honeytokens' ? 'active' : ''}
                        onClick={() => setActiveTab('honeytokens')}
                        style={{
                            background: activeTab === 'honeytokens' ? 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)' : '',
                            fontWeight: activeTab === 'honeytokens' ? 'bold' : 'normal'
                        }}
                    >
                        🍯 Honeytokens
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

                    {activeTab === 'honeytokens' && (
                        <div className="honeytokens-panel">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                                <h2>🍯 Honeytokens - Monitoring Nieautoryzowanego Dostępu</h2>
                                <button
                                    onClick={fetchHoneytokenStatus}
                                    style={{
                                        padding: '8px 16px',
                                        background: '#3498db',
                                        color: 'white',
                                        border: 'none',
                                        borderRadius: '4px',
                                        cursor: 'pointer'
                                    }}
                                >
                                    🔄 Odśwież
                                </button>
                            </div>

                            {loadingHoneytokens ? (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <p>Ładowanie danych honeytokenów...</p>
                                </div>
                            ) : honeytokenData ? (
                                <>
                                    {/* Statystyki */}
                                    <div style={{
                                        display: 'grid',
                                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                                        gap: '15px',
                                        marginBottom: '25px'
                                    }}>
                                        <div style={{
                                            background: 'linear-gradient(135deg, #e74c3c 0%, #c0392b 100%)',
                                            color: 'white',
                                            padding: '20px',
                                            borderRadius: '8px',
                                            textAlign: 'center'
                                        }}>
                                            <h3 style={{ margin: '0 0 10px 0', fontSize: '2em' }}>
                                                {honeytokenData.total_triggers}
                                            </h3>
                                            <p style={{ margin: 0 }}>Aktywacji Pułapek</p>
                                        </div>
                                        <div style={{
                                            background: 'linear-gradient(135deg, #f39c12 0%, #e67e22 100%)',
                                            color: 'white',
                                            padding: '20px',
                                            borderRadius: '8px',
                                            textAlign: 'center'
                                        }}>
                                            <h3 style={{ margin: '0 0 10px 0', fontSize: '2em' }}>
                                                {honeytokenData.fake_endpoints?.length || 0}
                                            </h3>
                                            <p style={{ margin: 0 }}>Aktywnych Pułapek</p>
                                        </div>
                                    </div>

                                    {/* Konfiguracja Honeytokenów */}
                                    <div style={{
                                        background: '#f8f9fa',
                                        padding: '20px',
                                        borderRadius: '8px',
                                        marginBottom: '25px',
                                        border: '1px solid #dee2e6'
                                    }}>
                                        <h3 style={{ marginTop: 0 }}>📋 Aktywne Pułapki</h3>

                                        <div style={{ marginBottom: '15px' }}>
                                            <strong>🔗 HTTP Token (Canarytokens):</strong>
                                            <div style={{
                                                background: 'white',
                                                padding: '10px',
                                                borderRadius: '4px',
                                                marginTop: '5px',
                                                fontFamily: 'monospace',
                                                fontSize: '0.9em',
                                                wordBreak: 'break-all'
                                            }}>
                                                {honeytokenData.honeytokens.http_token}
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '15px' }}>
                                            <strong>🌐 DNS Token:</strong>
                                            <div style={{
                                                background: 'white',
                                                padding: '10px',
                                                borderRadius: '4px',
                                                marginTop: '5px',
                                                fontFamily: 'monospace',
                                                fontSize: '0.9em'
                                            }}>
                                                {honeytokenData.honeytokens.dns_token}
                                            </div>
                                        </div>

                                        <div style={{ marginBottom: '15px' }}>
                                            <strong>👤 Fake User Account:</strong>
                                            <div style={{
                                                background: 'white',
                                                padding: '10px',
                                                borderRadius: '4px',
                                                marginTop: '5px',
                                                fontFamily: 'monospace',
                                                fontSize: '0.9em'
                                            }}>
                                                Username: <span style={{ color: '#e74c3c', fontWeight: 'bold' }}>
                                                    {honeytokenData.honeytokens.fake_user}
                                                </span>
                                            </div>
                                        </div>

                                        <div>
                                            <strong>📄 Fake File:</strong>
                                            <div style={{
                                                background: 'white',
                                                padding: '10px',
                                                borderRadius: '4px',
                                                marginTop: '5px',
                                                fontFamily: 'monospace',
                                                fontSize: '0.9em'
                                            }}>
                                                {honeytokenData.honeytokens.fake_file}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Fake Endpointy */}
                                    <div style={{
                                        background: '#fff3cd',
                                        padding: '20px',
                                        borderRadius: '8px',
                                        marginBottom: '25px',
                                        border: '1px solid #ffc107'
                                    }}>
                                        <h3 style={{ marginTop: 0 }}>🎯 Fake Endpointy (Pułapki API)</h3>
                                        <p style={{ fontSize: '0.9em', color: '#856404' }}>
                                            Kliknij przycisk "Test" aby symulować atak i sprawdzić działanie honeytokenu
                                        </p>
                                        <div style={{ display: 'grid', gap: '10px' }}>
                                            {honeytokenData.fake_endpoints?.map((endpoint, index) => (
                                                <div key={index} style={{
                                                    display: 'flex',
                                                    justifyContent: 'space-between',
                                                    alignItems: 'center',
                                                    background: 'white',
                                                    padding: '12px',
                                                    borderRadius: '4px',
                                                    border: '1px solid #dee2e6'
                                                }}>
                                                    <code style={{ flex: 1 }}>{endpoint}</code>
                                                    <button
                                                        onClick={() => testHoneytoken(endpoint)}
                                                        style={{
                                                            padding: '6px 12px',
                                                            background: '#e74c3c',
                                                            color: 'white',
                                                            border: 'none',
                                                            borderRadius: '4px',
                                                            cursor: 'pointer',
                                                            fontSize: '0.9em'
                                                        }}
                                                    >
                                                        🧪 Test
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Ostatnie aktywacje */}
                                    <div>
                                        <h3>🚨 Ostatnie Aktywacje Honeytokenów</h3>
                                        {honeytokenData.recent_triggers && honeytokenData.recent_triggers.length > 0 ? (
                                            <div style={{ overflowX: 'auto' }}>
                                                <table style={{
                                                    width: '100%',
                                                    borderCollapse: 'collapse',
                                                    background: 'white',
                                                    boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                                                }}>
                                                    <thead>
                                                        <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #dee2e6' }}>
                                                            <th style={{ padding: '12px', textAlign: 'left' }}>Data</th>
                                                            <th style={{ padding: '12px', textAlign: 'left' }}>Typ</th>
                                                            <th style={{ padding: '12px', textAlign: 'left' }}>Akcja</th>
                                                            <th style={{ padding: '12px', textAlign: 'left' }}>Opis</th>
                                                            <th style={{ padding: '12px', textAlign: 'left' }}>IP</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {honeytokenData.recent_triggers.map((log, index) => (
                                                            <tr key={index} style={{
                                                                borderBottom: '1px solid #dee2e6',
                                                                background: log.username === 'INTRUDER' ? '#fff5f5' : 'white'
                                                            }}>
                                                                <td style={{ padding: '12px', fontSize: '0.9em' }}>
                                                                    {formatDate(log.created_at)}
                                                                </td>
                                                                <td style={{ padding: '12px' }}>
                                                                    <span style={{
                                                                        padding: '4px 8px',
                                                                        borderRadius: '4px',
                                                                        fontSize: '0.85em',
                                                                        fontWeight: 'bold',
                                                                        background: log.username === 'INTRUDER' ? '#e74c3c' : '#f39c12',
                                                                        color: 'white'
                                                                    }}>
                                                                        {log.username}
                                                                    </span>
                                                                </td>
                                                                <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.9em' }}>
                                                                    {log.action_type}
                                                                </td>
                                                                <td style={{ padding: '12px', fontSize: '0.9em' }}>
                                                                    {log.description || '-'}
                                                                </td>
                                                                <td style={{ padding: '12px', fontFamily: 'monospace', fontSize: '0.9em' }}>
                                                                    {log.ip_address || '-'}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        ) : (
                                            <div style={{
                                                background: '#d4edda',
                                                padding: '20px',
                                                borderRadius: '8px',
                                                textAlign: 'center',
                                                color: '#155724'
                                            }}>
                                                <p style={{ margin: 0 }}>
                                                    ✅ Brak aktywacji honeytokenów - system bezpieczny!
                                                </p>
                                            </div>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div style={{ textAlign: 'center', padding: '40px' }}>
                                    <p>Brak danych. Kliknij "Odśwież" aby załadować.</p>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default AdminPanel;
