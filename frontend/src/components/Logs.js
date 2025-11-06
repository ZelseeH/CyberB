// Logs.js

import React, { useState, useEffect } from 'react';
import apiClient from '../services/api';
import { toast } from 'react-toastify';

const Logs = () => {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(false);
    const [filters, setFilters] = useState({
        username: '',
        action_type: '',
        date_from: '',
        date_to: '',
    });
    const [currentPage, setCurrentPage] = useState(1);
    const logsPerPage = 20;

    useEffect(() => {
        fetchLogs();
    }, []);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get('/logs');
            setLogs(response.data);
        } catch (error) {
            toast.error('Błąd podczas pobierania logów');
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleFilterChange = (field, value) => {
        setFilters({ ...filters, [field]: value });
        setCurrentPage(1);
    };

    const clearFilters = () => {
        setFilters({
            username: '',
            action_type: '',
            date_from: '',
            date_to: '',
        });
        setCurrentPage(1);
    };

    const getFilteredLogs = () => {
        return logs.filter((log) => {
            if (filters.username && !log.username.toLowerCase().includes(filters.username.toLowerCase())) {
                return false;
            }

            if (filters.action_type && log.action_type !== filters.action_type) {
                return false;
            }

            if (filters.date_from) {
                const logDate = new Date(log.created_at);
                const filterDate = new Date(filters.date_from);
                if (logDate < filterDate) {
                    return false;
                }
            }

            if (filters.date_to) {
                const logDate = new Date(log.created_at);
                const filterDate = new Date(filters.date_to);
                filterDate.setHours(23, 59, 59, 999);
                if (logDate > filterDate) {
                    return false;
                }
            }

            return true;
        });
    };

    const filteredLogs = getFilteredLogs();
    const totalPages = Math.ceil(filteredLogs.length / logsPerPage);
    const startIndex = (currentPage - 1) * logsPerPage;
    const endIndex = startIndex + logsPerPage;
    const currentLogs = filteredLogs.slice(startIndex, endIndex);

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('pl-PL', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
        });
    };

    const getActionTypeLabel = (actionType) => {
        const labels = {
            'login_success': 'Logowanie (sukces)',
            'login_failed': 'Logowanie (błąd)',
            'logout': 'Wylogowanie',
            'user_created': 'Utworzenie użytkownika',
            'user_updated': 'Aktualizacja użytkownika',
            'user_deleted': 'Usunięcie użytkownika',
            'user_blocked': 'Zablokowanie użytkownika',
            'user_unblocked': 'Odblokowanie użytkownika',
            'password_changed': 'Zmiana hasła',
            'password_reset': 'Reset hasła',
            'admin_granted': 'Nadanie uprawnień',
            'admin_revoked': 'Odebranie uprawnień',
            'password_settings_updated': 'Zmiana ustawień haseł',
        };
        return labels[actionType] || actionType;
    };

    const getActionTypeClass = (actionType) => {
        if (actionType.includes('failed') || actionType.includes('error')) {
            return 'error';
        }
        if (actionType.includes('success') || actionType.includes('created') || actionType.includes('granted')) {
            return 'success';
        }
        if (actionType.includes('deleted') || actionType.includes('blocked') || actionType.includes('revoked')) {
            return 'warning';
        }
        return 'info';
    };

    const exportLogs = () => {
        const csvContent = [
            ['Data i czas', 'Użytkownik', 'Typ akcji', 'Opis', 'IP'],
            ...filteredLogs.map(log => [
                formatDate(log.created_at),
                log.username,
                getActionTypeLabel(log.action_type),
                log.description || '-',
                log.ip_address || '-'
            ])
        ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

        const blob = new Blob(['\ufeff' + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `logi_${new Date().toISOString().split('T')[0]}.csv`;
        link.click();
        toast.success('Logi wyeksportowane pomyślnie');
    };

    if (loading && logs.length === 0) {
        return <div className="loading">Ładowanie logów...</div>;
    }

    return (
        <div className="user-management">
            <div className="management-header">
                <h2>Logi zdarzeń systemowych</h2>
                <div className="header-actions">
                    <button 
                        onClick={fetchLogs} 
                        className="add-user-btn" 
                        disabled={loading}
                        style={{ marginRight: '10px' }}
                    >
                        {loading ? 'Odświeżanie...' : '🔄 Odśwież'}
                    </button>
                    <button 
                        onClick={exportLogs} 
                        className="add-user-btn" 
                        disabled={filteredLogs.length === 0}
                    >
                        📥 Eksportuj CSV
                    </button>
                </div>
            </div>

            <div className="filters-panel" style={{ 
                background: '#f8f9fa', 
                padding: '20px', 
                borderRadius: '8px', 
                marginBottom: '20px',
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '15px'
            }}>
                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Użytkownik:
                    </label>
                    <input
                        type="text"
                        value={filters.username}
                        onChange={(e) => handleFilterChange('username', e.target.value)}
                        placeholder="Szukaj..."
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Typ akcji:
                    </label>
                    <select
                        value={filters.action_type}
                        onChange={(e) => handleFilterChange('action_type', e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    >
                        <option value="">Wszystkie</option>
                        <option value="login_success">Logowanie (sukces)</option>
                        <option value="login_failed">Logowanie (błąd)</option>
                        <option value="logout">Wylogowanie</option>
                        <option value="user_created">Utworzenie użytkownika</option>
                        <option value="user_updated">Aktualizacja użytkownika</option>
                        <option value="user_deleted">Usunięcie użytkownika</option>
                        <option value="user_blocked">Zablokowanie użytkownika</option>
                        <option value="user_unblocked">Odblokowanie użytkownika</option>
                        <option value="password_changed">Zmiana hasła</option>
                        <option value="password_reset">Reset hasła</option>
                        <option value="admin_granted">Nadanie uprawnień</option>
                        <option value="admin_revoked">Odebranie uprawnień</option>
                    </select>
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Data od:
                    </label>
                    <input
                        type="date"
                        value={filters.date_from}
                        onChange={(e) => handleFilterChange('date_from', e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                </div>

                <div>
                    <label style={{ display: 'block', marginBottom: '5px', fontWeight: '500' }}>
                        Data do:
                    </label>
                    <input
                        type="date"
                        value={filters.date_to}
                        onChange={(e) => handleFilterChange('date_to', e.target.value)}
                        style={{
                            width: '100%',
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            borderRadius: '4px'
                        }}
                    />
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-end' }}>
                    <button 
                        onClick={clearFilters} 
                        style={{
                            padding: '8px 16px',
                            background: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        ✖ Wyczyść filtry
                    </button>
                </div>
            </div>

            <div style={{ 
                marginBottom: '15px', 
                padding: '10px', 
                background: '#e9ecef', 
                borderRadius: '4px',
                display: 'flex',
                justifyContent: 'space-between'
            }}>
                <span>Znaleziono logów: <strong>{filteredLogs.length}</strong></span>
                <span>Łącznie logów: <strong>{logs.length}</strong></span>
            </div>

            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Data i czas</th>
                            <th>Użytkownik</th>
                            <th>Typ akcji</th>
                            <th>Opis</th>
                            <th>Adres IP</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentLogs.length === 0 ? (
                            <tr>
                                <td colSpan="6" style={{ textAlign: 'center', padding: '40px', color: '#6c757d' }}>
                                    {filters.username || filters.action_type || filters.date_from || filters.date_to
                                        ? 'Brak logów spełniających kryteria'
                                        : 'Brak logów w systemie'}
                                </td>
                            </tr>
                        ) : (
                            currentLogs.map((log) => (
                                <tr key={log.id}>
                                    <td>{log.id}</td>
                                    <td>{formatDate(log.created_at)}</td>
                                    <td>
                                        <strong>{log.username}</strong>
                                    </td>
                                    <td>
                                        <span className={`status-badge ${getActionTypeClass(log.action_type)}`}>
                                            {getActionTypeLabel(log.action_type)}
                                        </span>
                                    </td>
                                    <td style={{ maxWidth: '300px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                                        {log.description || '-'}
                                    </td>
                                    <td>{log.ip_address || '-'}</td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>

            {totalPages > 1 && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    gap: '10px',
                    marginTop: '20px',
                    padding: '20px'
                }}>
                    <button
                        onClick={() => setCurrentPage(1)}
                        disabled={currentPage === 1}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            background: currentPage === 1 ? '#f8f9fa' : 'white',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        «
                    </button>
                    <button
                        onClick={() => setCurrentPage(currentPage - 1)}
                        disabled={currentPage === 1}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            background: currentPage === 1 ? '#f8f9fa' : 'white',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        ‹
                    </button>
                    <span style={{ padding: '0 20px', fontWeight: '500' }}>
                        Strona {currentPage} z {totalPages}
                    </span>
                    <button
                        onClick={() => setCurrentPage(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            background: currentPage === totalPages ? '#f8f9fa' : 'white',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        ›
                    </button>
                    <button
                        onClick={() => setCurrentPage(totalPages)}
                        disabled={currentPage === totalPages}
                        style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            background: currentPage === totalPages ? '#f8f9fa' : 'white',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            borderRadius: '4px'
                        }}
                    >
                        »
                    </button>
                </div>
            )}
        </div>
    );
};

export default Logs;