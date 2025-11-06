// Login.js

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, isAuthenticated, isAdmin } from '../services/api';
import { toast } from 'react-toastify';

const Login = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [otpAnswer, setOtpAnswer] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [otpRequired, setOtpRequired] = useState(false);

    useEffect(() => {
        if (isAuthenticated()) {
            if (isAdmin()) {
                navigate('/admin');
            } else {
                navigate('/user');
            }
        }
    }, [navigate]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            let data = { username };
            if (otpRequired) {
                data.otp_answer = otpAnswer;
            } else {
                data.password = password;
            }
            const response = await login(data);  // Zakładając, że login przyjmuje obiekt data

            if (response.requires_otp) {
                setOtpRequired(true);
                setPassword('');
                setLoading(false);
                toast.info('Wymagane hasło jednorazowe. Wpisz je poniżej.');
                return;
            }

            if (response.success) {
                toast.success('Zalogowano pomyślnie');

                if (response.user.must_change_password) {
                    toast.info('Musisz zmienić hasło');
                }

                if (response.user.is_admin === 1) {
                    navigate('/admin');
                } else {
                    navigate('/user');
                }
            }
        } catch (error) {
            if (error.error) {
                toast.error(error.error);
            } else {
                toast.error('Błąd podczas logowania');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-container">
            <div className="login-box">
                <h1>Cyberbezpieczeństwo</h1>
                <h2>Logowanie</h2>

                <form onSubmit={handleSubmit} className="login-form">
                    <div className="form-group">
                        <label htmlFor="username">Login:</label>
                        <input
                            type="text"
                            id="username"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            required
                            disabled={loading}
                            autoComplete="username"
                            placeholder="Wprowadź login"
                        />
                    </div>

                    {!otpRequired ? (
                        <div className="form-group">
                            <label htmlFor="password">Hasło:</label>
                            <div className="password-input-wrapper">
                                <input
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    disabled={loading}
                                    autoComplete="current-password"
                                    placeholder="Wprowadź hasło"
                                />
                                <button
                                    type="button"
                                    className="toggle-password"
                                    onClick={() => setShowPassword(!showPassword)}
                                    disabled={loading}
                                >
                                    {showPassword ? '👁️' : '👁️‍🗨️'}
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="form-group">
                            <label htmlFor="otp_answer">Hasło jednorazowe:</label>
                            <input
                                type="text"
                                id="otp_answer"
                                value={otpAnswer}
                                onChange={(e) => setOtpAnswer(e.target.value)}
                                required
                                disabled={loading}
                                placeholder="Wpisz hasło jednorazowe"
                            />
                        </div>
                    )}

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Logowanie...' : 'Zaloguj się'}
                    </button>
                </form>
            </div>
        </div>
    );
};

export default Login;