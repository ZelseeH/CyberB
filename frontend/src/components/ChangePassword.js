// ChangePassword.js

import React, { useState, useEffect, useRef } from 'react';
import ReCAPTCHA from 'react-google-recaptcha';
import { changePassword, getPasswordSettings, getRecaptchaSiteKey } from '../services/api';
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
    const [recaptchaSiteKey, setRecaptchaSiteKey] = useState(null);
    const [recaptchaToken, setRecaptchaToken] = useState(null);
    const recaptchaRef = useRef(null);

    // TO JEST POPRAWNE MIEJSCE DLA TEJ ZMIENNEJ (wewnątrz funkcji, po deklaracji state)
    const isCaptchaActive = recaptchaSiteKey && recaptchaSiteKey !== 'your-recaptcha-site-key';

    useEffect(() => {
        fetchPasswordSettings();
        fetchRecaptchaSiteKey();
    }, []);

    const fetchPasswordSettings = async () => {
        try {
            const settings = await getPasswordSettings();
            setPasswordSettings(settings);
        } catch (error) {
            console.error('Error fetching password settings:', error);
        }
    };

    const fetchRecaptchaSiteKey = async () => {
        try {
            const siteKey = await getRecaptchaSiteKey();
            setRecaptchaSiteKey(siteKey);
        } catch (error) {
            console.error('Error fetching reCAPTCHA site key:', error);
        }
    };

    const handleRecaptchaChange = (token) => {
        setRecaptchaToken(token);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        // Sprawdzamy token tylko jeśli CAPTCHA jest faktycznie aktywna
        if (isCaptchaActive && !recaptchaToken) {
            toast.error('Proszę potwierdzić reCAPTCHA');
            return;
        }

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
            await changePassword(currentUser.id, oldPassword, newPassword, recaptchaToken);
            toast.success('Hasło zostało zmienione pomyślnie');
            setOldPassword('');
            setNewPassword('');
            setConfirmPassword('');
            setRecaptchaToken(null);
            if (recaptchaRef.current) {
                recaptchaRef.current.reset();
            }

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
            // Reset reCAPTCHA po błędzie
            setRecaptchaToken(null);
            if (recaptchaRef.current) {
                recaptchaRef.current.reset();
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

                {/* Wyświetlamy ReCAPTCHA tylko jeśli klucz jest poprawny */}
                {isCaptchaActive && (
                    <div className="form-group recaptcha-group">
                        <ReCAPTCHA
                            ref={recaptchaRef}
                            sitekey={recaptchaSiteKey}
                            onChange={handleRecaptchaChange}
                        />
                    </div>
                )}

                <button 
                    type="submit" 
                    className="submit-btn" 
                    disabled={loading || (isCaptchaActive && !recaptchaToken)}
                >
                    {loading ? 'Zmieniam hasło...' : 'Zmień hasło'}
                </button>
            </form>
        </div>
    );
};

export default ChangePassword;