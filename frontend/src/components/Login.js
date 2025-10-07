import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { login, isAuthenticated, isAdmin } from '../services/api';
import { toast } from 'react-toastify';

const Login = () => {
    const navigate = useNavigate();
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

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
            const response = await login(username, password);

            if (response.success) {
                toast.success('Zalogowano pomyślnie');

                if (response.user.must_change_password) {
                    toast.info('Musisz zmienić hasło przy pierwszym logowaniu');
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
                <h1>System Bezpieczeństwa</h1>
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

                    <button type="submit" className="login-btn" disabled={loading}>
                        {loading ? 'Logowanie...' : 'Zaloguj się'}
                    </button>
                </form>

                <div className="login-info">
                    <p>Domyślne konto administratora:</p>
                    <p>Login: <strong>ADMIN</strong></p>
                    <p>Hasło: <strong>Admin123!</strong></p>
                </div>
            </div>
        </div>
    );
};

export default Login;
