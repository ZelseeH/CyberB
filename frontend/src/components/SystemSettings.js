// SystemSettings.js

import React, { useState, useEffect } from 'react';
import { getSystemSettings, updateSystemSettings } from '../services/api';
import { toast } from 'react-toastify';

const SystemSettings = () => {
    const [settings, setSettings] = useState({
        failed_login_limit: 5,
        idle_timeout_minutes: 15,
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await getSystemSettings();
            setSettings(data);
        } catch (error) {
            toast.error('Błąd podczas pobierania ustawień systemowych');
        }
    };

    const handleChange = (e) => {
        const { name, value } = e.target;
        setSettings(prev => ({ ...prev, [name]: parseInt(value) }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            await updateSystemSettings(settings);
            toast.success('Ustawienia systemowe zaktualizowane');
        } catch (error) {
            toast.error('Błąd podczas aktualizacji ustawień');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="password-settings">
            <h2>Ustawienia systemowe</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Limit błędnych logowań:</label>
                    <input
                        type="number"
                        name="failed_login_limit"
                        value={settings.failed_login_limit}
                        onChange={handleChange}
                        min="1"
                        required
                        disabled={loading}
                    />
                    <span className="help-text">Liczba błędnych logowań po której konto zostanie zablokowane na 15 minut</span>
                </div>

                <div className="form-group">
                    <label>Czas nieaktywności (minuty):</label>
                    <input
                        type="number"
                        name="idle_timeout_minutes"
                        value={settings.idle_timeout_minutes}
                        onChange={handleChange}
                        min="1"
                        required
                        disabled={loading}
                    />
                    <span className="help-text">Czas nieaktywności po którym użytkownik zostanie wylogowany</span>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
            </form>
        </div>
    );
};

export default SystemSettings;