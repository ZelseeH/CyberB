// components/SystemSettings.js

import React, { useState, useEffect } from 'react';
import { getSystemSettings, updateSystemSettings } from '../services/api';
import { toast } from 'react-toastify';

const SystemSettings = ({ onSettingsUpdated }) => {
    const [settings, setSettings] = useState({
        failed_login_limit: 5,
        idle_timeout_minutes: 15,
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await getSystemSettings();
            setSettings(data);
        } catch (error) {
            toast.error('Błąd podczas pobierania ustawień');
            console.error('Error:', error);
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const response = await updateSystemSettings(settings);

            // NOWY TIMEOUT Z BACKENDU!
            const newTimeout = response.idle_timeout_minutes || settings.idle_timeout_minutes;
            localStorage.setItem('idleTimeout', (newTimeout * 60 * 1000).toString());
            localStorage.setItem('loginTime', Date.now().toString()); // RESET SESJI!

            toast.success('Ustawienia systemowe zaktualizowane');
            console.log(`✅ Timeout updated to: ${newTimeout} minutes`);

            // Powiadom hook o zmianie
            if (onSettingsUpdated) {
                onSettingsUpdated();
            }
        } catch (error) {
            toast.error('Błąd podczas aktualizacji ustawień');
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleChange = (field, value) => {
        setSettings(prev => ({
            ...prev,
            [field]: value
        }));
    };

    if (fetching) {
        return <div className="loading">Ładowanie ustawień...</div>;
    }

    return (
        <div className="system-settings">
            <h2>Ustawienia systemowe</h2>
            <p className="settings-description">
                Skonfiguruj parametry systemu dla wszystkich użytkowników.
            </p>

            <form onSubmit={handleSubmit} className="settings-form">
                <div className="form-group">
                    <label htmlFor="idle_timeout_minutes">Limit błędnych logowań:</label>
                    <input
                        type="number"
                        id="failed_login_limit"
                        min="1"
                        max="100"
                        value={settings.failed_login_limit}
                        onChange={(e) => handleChange('failed_login_limit', parseInt(e.target.value))}
                        disabled={loading}
                        required
                    />
                    <span className="help-text">Liczba prób (1-100)</span>
                </div>

                <div className="form-group">
                    <label htmlFor="idle_timeout_minutes">Timeout nieaktywności (minuty):</label>
                    <input
                        type="number"
                        id="idle_timeout_minutes"
                        min="1"
                        max="1440"
                        value={settings.idle_timeout_minutes}
                        onChange={(e) => handleChange('idle_timeout_minutes', parseInt(e.target.value))}
                        disabled={loading}
                        required
                    />
                    <span className="help-text">Liczba minut (1-1440)</span>
                </div>

                <div className="settings-preview">
                    <h4>Podgląd:</h4>
                    <ul>
                        <li>Limit błędnych logowań: <strong>{settings.failed_login_limit}</strong></li>
                        <li>Timeout nieaktywności: <strong>{settings.idle_timeout_minutes}</strong> minut</li>
                    </ul>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Zapisywanie...' : 'Zapisz zmiany'}
                </button>
            </form>
        </div>
    );
};

export default SystemSettings;
