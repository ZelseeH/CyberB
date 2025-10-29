// UserManagement.js

import React, { useState, useEffect } from 'react';
import { getUsers, createUser, updateUser, blockUser, deleteUser, resetUserPassword } from '../services/api';
import { toast } from 'react-toastify';

const UserManagement = () => {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAddModal, setShowAddModal] = useState(false);
    const [showEditModal, setShowEditModal] = useState(false);
    const [showResetPasswordModal, setShowResetPasswordModal] = useState(false);
    const [selectedUser, setSelectedUser] = useState(null);
    const [formData, setFormData] = useState({
        username: '',
        full_name: '',
        password_expiry_days: 90,
        is_admin: 0,
        use_one_time_password: false,
        one_time_password: '',
    });
    const [resetPasswordData, setResetPasswordData] = useState({
        userId: null,
        username: '',
        newPassword: 'User123!',
        use_one_time_password: false,
        one_time_password: '',
    });
    const [otpValue, setOtpValue] = useState(null);

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const data = await getUsers();
            setUsers(data);
        } catch (error) {
            toast.error('Błąd podczas pobierania użytkowników');
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleAddUser = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = { ...formData };
            if (!payload.use_one_time_password) {
                delete payload.one_time_password;
            } else if (!payload.one_time_password) {
                toast.error('Hasło jednorazowe jest wymagane');
                setLoading(false);
                return;
            }
            const response = await createUser(payload);
            
            if (response.otp) {
                setOtpValue(response.otp);
                toast.success('Użytkownik został utworzony z hasłem jednorazowym!');
            } else {
                toast.success('Użytkownik został utworzony. Domyślne hasło: User123!');
            }
            
            setShowAddModal(false);
            resetForm();
            fetchUsers();
        } catch (error) {
            if (error.error) {
                toast.error(error.error);
            } else {
                toast.error('Błąd podczas dodawania użytkownika');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleEditUser = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                full_name: formData.full_name,
                password_expiry_days: formData.password_expiry_days,
                use_one_time_password: formData.use_one_time_password,
            };
            if (payload.use_one_time_password) {
                if (!formData.one_time_password) {
                    toast.error('Hasło jednorazowe jest wymagane');
                    setLoading(false);
                    return;
                }
                payload.one_time_password = formData.one_time_password;
            }
            const response = await updateUser(selectedUser.id, payload);
            
            if (response.otp) {
                setOtpValue(response.otp);
                toast.success('Użytkownik zaktualizowany i ustawiono hasło jednorazowe');
            } else {
                toast.success('Użytkownik został zaktualizowany');
            }
            
            setShowEditModal(false);
            setSelectedUser(null);
            resetForm();
            fetchUsers();
        } catch (error) {
            toast.error('Błąd podczas aktualizacji użytkownika');
        } finally {
            setLoading(false);
        }
    };

    const handleResetPassword = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const payload = {
                use_one_time_password: resetPasswordData.use_one_time_password,
            };
            if (!payload.use_one_time_password) {
                payload.new_password = resetPasswordData.newPassword;
            } else {
                if (!resetPasswordData.one_time_password) {
                    toast.error('Hasło jednorazowe jest wymagane');
                    setLoading(false);
                    return;
                }
                payload.one_time_password = resetPasswordData.one_time_password;
            }
            const response = await resetUserPassword(
                resetPasswordData.userId,
                payload
            );
            
            if (response.otp) {
                setOtpValue(response.otp);
                toast.success(`Ustawiono hasło jednorazowe dla ${resetPasswordData.username}`);
            } else {
                toast.success(`Hasło dla użytkownika ${resetPasswordData.username} zostało zresetowane`);
            }
            
            setShowResetPasswordModal(false);
            setResetPasswordData({ userId: null, username: '', newPassword: 'User123!', use_one_time_password: false, one_time_password: '' });
            fetchUsers();  // Refresh users to update OTP status
        } catch (error) {
            if (error.error) {
                if (Array.isArray(error.error)) {
                    error.error.forEach(err => toast.error(err));
                } else {
                    toast.error(error.error);
                }
            } else {
                toast.error('Błąd podczas resetowania hasła');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleBlockUser = async (userId, isBlocked) => {
        try {
            await blockUser(userId, !isBlocked);
            toast.success(isBlocked ? 'Użytkownik odblokowany' : 'Użytkownik zablokowany');
            fetchUsers();
        } catch (error) {
            toast.error('Błąd podczas blokowania użytkownika');
        }
    };

    const handleDeleteUser = async (userId, username) => {
        if (username === 'ADMIN') {
            toast.error('Nie można usunąć konta administratora');
            return;
        }

        if (window.confirm(`Czy na pewno chcesz usunąć użytkownika: ${username}?`)) {
            try {
                await deleteUser(userId);
                toast.success('Użytkownik został usunięty');
                fetchUsers();
            } catch (error) {
                toast.error('Błąd podczas usuwania użytkownika');
            }
        }
    };

    const openAddModal = () => {
        resetForm();
        setOtpValue(null);
        setShowAddModal(true);
    };

    const openEditModal = (user) => {
        setSelectedUser(user);
        setFormData({
            username: user.username,
            full_name: user.full_name || '',
            password_expiry_days: user.password_expiry_days,
            is_admin: user.is_admin,
            use_one_time_password: false,
            one_time_password: '',
        });
        setShowEditModal(true);
    };

    const openResetPasswordModal = (user) => {
        setOtpValue(null);
        setResetPasswordData({
            userId: user.id,
            username: user.username,
            newPassword: 'User123!',
            use_one_time_password: false,
            one_time_password: '',
        });
        setShowResetPasswordModal(true);
    };

    const resetForm = () => {
        setFormData({
            username: '',
            full_name: '',
            password_expiry_days: 90,
            is_admin: 0,
            use_one_time_password: false,
            one_time_password: '',
        });
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        const date = new Date(dateString);
        return date.toLocaleString('pl-PL');
    };

    if (loading && users.length === 0) {
        return <div className="loading">Ładowanie użytkowników...</div>;
    }

    return (
        <div className="user-management">
            <div className="management-header">
                <h2>Zarządzanie użytkownikami</h2>
                <button onClick={openAddModal} className="add-user-btn">
                    + Dodaj użytkownika
                </button>
            </div>

            {otpValue && (
                <div className="otp-info-banner">
                    <h4>🔑 Hasło jednorazowe:</h4>
                    <p><strong>{otpValue}</strong></p>
                    <button onClick={() => setOtpValue(null)} className="close-banner-btn">×</button>
                </div>
            )}

            <div className="users-table-container">
                <table className="users-table">
                    <thead>
                        <tr>
                            <th>ID</th>
                            <th>Login</th>
                            <th>Imię i nazwisko</th>
                            <th>Rola</th>
                            <th>Status</th>
                            <th>Hasło jednorazowe</th>
                            <th>Ważność hasła (dni)</th>
                            <th>Data utworzenia</th>
                            <th>Akcje</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map((user) => (
                            <tr key={user.id} className={user.is_blocked ? 'blocked' : ''}>
                                <td>{user.id}</td>
                                <td>{user.username}</td>
                                <td>{user.full_name || '-'}</td>
                                <td>
                                    <span className={`role-badge ${user.is_admin ? 'admin' : 'user'}`}>
                                        {user.is_admin ? 'Administrator' : 'Użytkownik'}
                                    </span>
                                </td>
                                <td>
                                    <span className={`status-badge ${user.is_blocked ? 'blocked' : 'active'}`}>
                                        {user.is_blocked ? 'Zablokowany' : 'Aktywny'}
                                    </span>
                                </td>
                                <td>
                                    <span className={`otp-badge ${user.one_time_password_enabled ? 'enabled' : 'disabled'}`}>
                                        {user.one_time_password_enabled ? '✓ Włączone' : '✗ Wyłączone'}
                                    </span>
                                </td>
                                <td>{user.password_expiry_days === 0 ? 'Nigdy' : user.password_expiry_days}</td>
                                <td>{formatDate(user.created_at)}</td>
                                <td className="actions-cell">
                                    <button
                                        onClick={() => openEditModal(user)}
                                        className="btn edit-btn"
                                        title="Edytuj"
                                    >
                                        ✏️
                                    </button>
                                    <button
                                        onClick={() => openResetPasswordModal(user)}
                                        className="btn reset-password-btn"
                                        title="Resetuj hasło"
                                    >
                                        🔑
                                    </button>
                                    <button
                                        onClick={() => handleBlockUser(user.id, user.is_blocked)}
                                        className={user.is_blocked ? 'btn unblock-btn' : 'btn block-btn'}
                                        title={user.is_blocked ? 'Odblokuj' : 'Zablokuj'}
                                    >
                                        {user.is_blocked ? '🔓' : '🔒'}
                                    </button>
                                    {user.username !== 'ADMIN' && (
                                        <button
                                            onClick={() => handleDeleteUser(user.id, user.username)}
                                            className="btn delete-btn"
                                            title="Usuń"
                                        >
                                            🗑️
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showAddModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Dodaj nowego użytkownika</h3>
                        <form onSubmit={handleAddUser}>
                            <div className="form-group">
                                <label>Login:</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                    required
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>Imię i nazwisko:</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>Ważność hasła (dni):</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.password_expiry_days}
                                    onChange={(e) => setFormData({ ...formData, password_expiry_days: parseInt(e.target.value) })}
                                    required
                                    disabled={loading}
                                />
                                <span className="help-text">0 = hasło nigdy nie wygasa</span>
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.is_admin === 1}
                                        onChange={(e) => setFormData({ ...formData, is_admin: e.target.checked ? 1 : 0 })}
                                        disabled={loading}
                                    />
                                    <span>Administrator</span>
                                </label>
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.use_one_time_password}
                                        onChange={(e) => setFormData({ ...formData, use_one_time_password: e.target.checked })}
                                        disabled={loading}
                                    />
                                    <span>Użyj hasła jednorazowego</span>
                                </label>
                            </div>

                            {formData.use_one_time_password && (
                                <div className="form-group">
                                    <label>Hasło jednorazowe:</label>
                                    <input
                                        type="text"
                                        value={formData.one_time_password}
                                        onChange={(e) => setFormData({ ...formData, one_time_password: e.target.value })}
                                        required
                                        disabled={loading}
                                        placeholder="Wprowadź hasło jednorazowe"
                                    />
                                </div>
                            )}

                            <div className="modal-info">
                                {formData.use_one_time_password ? (
                                    <p>Zostanie ustawione podane hasło jednorazowe. Użytkownik będzie musiał je zmienić przy logowaniu.</p>
                                ) : (
                                    <>
                                        <p>Domyślne hasło: <strong>User123!</strong></p>
                                        <p>Użytkownik będzie musiał zmienić hasło przy pierwszym logowaniu.</p>
                                    </>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button type="submit" className="submit-btn" disabled={loading}>
                                    {loading ? 'Dodawanie...' : 'Dodaj użytkownika'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setShowAddModal(false)}
                                    className="cancel-btn"
                                    disabled={loading}
                                >
                                    Anuluj
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showEditModal && selectedUser && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Edytuj użytkownika: {selectedUser.username}</h3>
                        <form onSubmit={handleEditUser}>
                            <div className="form-group">
                                <label>Login:</label>
                                <input
                                    type="text"
                                    value={formData.username}
                                    disabled
                                    className="disabled-input"
                                />
                            </div>

                            <div className="form-group">
                                <label>Imię i nazwisko:</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                    disabled={loading}
                                />
                            </div>

                            <div className="form-group">
                                <label>Ważność hasła (dni):</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={formData.password_expiry_days}
                                    onChange={(e) => setFormData({ ...formData, password_expiry_days: parseInt(e.target.value) })}
                                    required
                                    disabled={loading}
                                />
                                <span className="help-text">0 = hasło nigdy nie wygasa</span>
                            </div>

                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={formData.use_one_time_password}
                                        onChange={(e) => setFormData({ ...formData, use_one_time_password: e.target.checked })}
                                        disabled={loading}
                                    />
                                    <span>Ustaw hasło jednorazowe</span>
                                </label>
                            </div>

                            {formData.use_one_time_password && (
                                <div className="form-group">
                                    <label>Hasło jednorazowe:</label>
                                    <input
                                        type="text"
                                        value={formData.one_time_password}
                                        onChange={(e) => setFormData({ ...formData, one_time_password: e.target.value })}
                                        required
                                        disabled={loading}
                                        placeholder="Wprowadź hasło jednorazowe"
                                    />
                                </div>
                            )}

                            {formData.use_one_time_password && (
                                <div className="modal-info">
                                    <p>Zostanie ustawione podane hasło jednorazowe. Użytkownik będzie musiał je zmienić przy logowaniu.</p>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="submit" className="submit-btn" disabled={loading}>
                                    {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowEditModal(false);
                                        setSelectedUser(null);
                                    }}
                                    className="cancel-btn"
                                    disabled={loading}
                                >
                                    Anuluj
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {showResetPasswordModal && (
                <div className="modal-overlay">
                    <div className="modal">
                        <h3>Resetuj hasło użytkownika: {resetPasswordData.username}</h3>
                        <form onSubmit={handleResetPassword}>
                            <div className="form-group checkbox-group">
                                <label>
                                    <input
                                        type="checkbox"
                                        checked={resetPasswordData.use_one_time_password}
                                        onChange={(e) => setResetPasswordData({ 
                                            ...resetPasswordData, 
                                            use_one_time_password: e.target.checked 
                                        })}
                                        disabled={loading}
                                    />
                                    <span>Użyj hasła jednorazowego</span>
                                </label>
                            </div>

                            {!resetPasswordData.use_one_time_password && (
                                <div className="form-group">
                                    <label>Nowe hasło:</label>
                                    <input
                                        type="text"
                                        value={resetPasswordData.newPassword}
                                        onChange={(e) => setResetPasswordData({ ...resetPasswordData, newPassword: e.target.value })}
                                        required
                                        disabled={loading}
                                        placeholder="Wprowadź nowe hasło"
                                    />
                                    <span className="help-text">Hasło musi spełniać wymagania systemowe</span>
                                </div>
                            )}

                            {resetPasswordData.use_one_time_password && (
                                <div className="form-group">
                                    <label>Hasło jednorazowe:</label>
                                    <input
                                        type="text"
                                        value={resetPasswordData.one_time_password}
                                        onChange={(e) => setResetPasswordData({ ...resetPasswordData, one_time_password: e.target.value })}
                                        required
                                        disabled={loading}
                                        placeholder="Wprowadź hasło jednorazowe"
                                    />
                                </div>
                            )}

                            <div className="modal-info">
                                <p><strong>Uwaga:</strong></p>
                                {resetPasswordData.use_one_time_password ? (
                                    <p>Zostanie ustawione podane hasło jednorazowe. Użytkownik będzie musiał je zmienić przy logowaniu.</p>
                                ) : (
                                    <>
                                        <p>Użytkownik będzie musiał zmienić hasło przy następnym logowaniu.</p>
                                        <p>Nowe hasło musi spełniać wszystkie wymagania systemowe.</p>
                                    </>
                                )}
                            </div>

                            <div className="modal-actions">
                                <button type="submit" className="submit-btn" disabled={loading}>
                                    {loading ? 'Resetowanie...' : 'Resetuj hasło'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => {
                                        setShowResetPasswordModal(false);
                                        setResetPasswordData({ userId: null, username: '', newPassword: 'User123!', use_one_time_password: false, one_time_password: '' });
                                    }}
                                    className="cancel-btn"
                                    disabled={loading}
                                >
                                    Anuluj
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;