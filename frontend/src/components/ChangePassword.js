import React, { useState, useEffect } from 'react';
import { changePassword, getPasswordSettings } from '../services/api';
import { toast } from 'react-toastify';

const ChangePassword = ({ currentUser, onSuccess }) => {
    const [oldPassword, setOldPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showOldPassword, setShowOldPassword] = useState(false);
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [passwordSettings, setPasswordSettings] = useState(null);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchPasswordSettings();
    }, []);

    const fetchPasswordSettings = async () => {
        try {
            const settings = await getPasswordSettings();
            setPasswordSettings(settings);
        } catch (error) {
            console.error('Error fetching password settings:', error);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (newPassword !== confirmPassword) {
            toast.error('Nowe hasła nie są identyczne');
            return;
        }

        if (newPassword === oldPassword) {
            toast.error('Nowe hasło musi być inne niż stare hasło');
            return;
        }

        setLoading(true);

        try {
            await changePassword(currentUser.id, oldPassword, newPassword);
            toast.success('Hasło zostało zmienione pomyślnie');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');

            if (onSuccess) {
                onSuccess();
            }
        } catch (error) {
            if (error.error) {
                if (Array.isArray(error.error)) {
                    error.error.forEach(err => toast.error(err));
                } else {
                    toast.error(error.error);
                }
            } else {
                toast.error('Błąd podczas zmiany hasła');
            }
        } finally {
            setLoading(false);
        }
    };

    const renderPasswordRequirements = () => {
        if (!passwordSettings) return null;

        return (
            <div className="password-requirements">
                <h4>Wymagania dotyczące hasła:</h4>
                <ul>
                    <li>Minimalna długość: {passwordSettings.min_length} znaków</li>
                    {passwordSettings.require_capital_letter === 1 && (
                        <li>Co najmniej jedna wielka litera</li>
                    )}
                    {passwordSettings.require_special_char === 1 && (
                        <li>Co najmniej jeden znak specjalny (!@#$%^&*(),.?":{ }|&lt;&gt;)</li>
                    )}
                    {passwordSettings.require_digits > 0 && (
                        <li>Co najmniej {passwordSettings.require_digits} cyfr(y)</li>
                    )}
                </ul>
            </div>
        );
    };

    return (
        <div className="change-password">
            {renderPasswordRequirements()}

            <form onSubmit={handleSubmit} className="change-password-form">
                <div className="form-group">
                    <label htmlFor="oldPassword">Stare hasło:</label>
                    <div className="password-input-wrapper">
                        <input
                            type={showOldPassword ? 'text' : 'password'}
                            id="oldPassword"
                            value={oldPassword}
                            onChange={(e) => setOldPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                        <button
                            type="button"
                            className="toggle-password"
                            onClick={() => setShowOldPassword(!showOldPassword)}
                        >
                            {showOldPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="newPassword">Nowe hasło:</label>
                    <div className="password-input-wrapper">
                        <input
                            type={showNewPassword ? 'text' : 'password'}
                            id="newPassword"
                            value={newPassword}
                            onChange={(e) => setNewPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                        <button
                            type="button"
                            className="toggle-password"
                            onClick={() => setShowNewPassword(!showNewPassword)}
                        >
                            {showNewPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                    </div>
                </div>

                <div className="form-group">
                    <label htmlFor="confirmPassword">Powtórz nowe hasło:</label>
                    <div className="password-input-wrapper">
                        <input
                            type={showConfirmPassword ? 'text' : 'password'}
                            id="confirmPassword"
                            value={confirmPassword}
                            onChange={(e) => setConfirmPassword(e.target.value)}
                            required
                            disabled={loading}
                        />
                        <button
                            type="button"
                            className="toggle-password"
                            onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        >
                            {showConfirmPassword ? '👁️' : '👁️‍🗨️'}
                        </button>
                    </div>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Zmieniam hasło...' : 'Zmień hasło'}
                </button>
            </form>
        </div>
    );
};

export default ChangePassword;
