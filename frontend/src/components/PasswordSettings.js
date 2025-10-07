import React, { useState, useEffect } from 'react';
import { getPasswordSettings, updatePasswordSettings } from '../services/api';
import { toast } from 'react-toastify';

const PasswordSettings = () => {
    const [settings, setSettings] = useState({
        min_length: 8,
        require_capital_letter: 1,
        require_special_char: 1,
        require_digits: 1,
    });
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(true);

    useEffect(() => {
        fetchSettings();
    }, []);

    const fetchSettings = async () => {
        try {
            const data = await getPasswordSettings();
            setSettings(data);
        } catch (error) {
            toast.error('Błąd podczas pobierania ustawień');
            console.error('Error fetching settings:', error);
        } finally {
            setFetching(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            await updatePasswordSettings(settings);
            toast.success('Ustawienia haseł zostały zaktualizowane');
        } catch (error) {
            toast.error('Błąd podczas aktualizacji ustawień');
            console.error('Error updating settings:', error);
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
        <div className="password-settings">
            <h2>Ustawienia wymagań haseł</h2>
            <p className="settings-description">
                Skonfiguruj wymagania dotyczące haseł dla wszystkich użytkowników systemu.
            </p>

            <form onSubmit={handleSubmit} className="settings-form">
                <div className="form-group">
                    <label htmlFor="min_length">Minimalna długość hasła:</label>
                    <input
                        type="number"
                        id="min_length"
                        min="1"
                        max="128"
                        value={settings.min_length}
                        onChange={(e) => handleChange('min_length', parseInt(e.target.value))}
                        disabled={loading}
                        required
                    />
                    <span className="help-text">Liczba znaków (1-128)</span>
                </div>

                <div className="form-group checkbox-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.require_capital_letter === 1}
                            onChange={(e) => handleChange('require_capital_letter', e.target.checked ? 1 : 0)}
                            disabled={loading}
                        />
                        <span>Wymagaj co najmniej jednej wielkiej litery</span>
                    </label>
                </div>

                <div className="form-group checkbox-group">
                    <label>
                        <input
                            type="checkbox"
                            checked={settings.require_special_char === 1}
                            onChange={(e) => handleChange('require_special_char', e.target.checked ? 1 : 0)}
                            disabled={loading}
                        />
                        <span>Wymagaj co najmniej jednego znaku specjalnego (!@#$%^&*)</span>
                    </label>
                </div>

                <div className="form-group">
                    <label htmlFor="require_digits">Wymagana liczba cyfr:</label>
                    <input
                        type="number"
                        id="require_digits"
                        min="0"
                        max="10"
                        value={settings.require_digits}
                        onChange={(e) => handleChange('require_digits', parseInt(e.target.value))}
                        disabled={loading}
                        required
                    />
                    <span className="help-text">Liczba wymaganych cyfr (0-10)</span>
                </div>

                <div className="settings-preview">
                    <h4>Podgląd wymagań:</h4>
                    <ul>
                        <li>Minimalna długość: <strong>{settings.min_length}</strong> znaków</li>
                        {settings.require_capital_letter === 1 && (
                            <li>Co najmniej <strong>1 wielka litera</strong></li>
                        )}
                        {settings.require_special_char === 1 && (
                            <li>Co najmniej <strong>1 znak specjalny</strong></li>
                        )}
                        {settings.require_digits > 0 && (
                            <li>Co najmniej <strong>{settings.require_digits}</strong> cyfr(y)</li>
                        )}
                    </ul>
                </div>

                <button type="submit" className="submit-btn" disabled={loading}>
                    {loading ? 'Zapisywanie...' : 'Zapisz ustawienia'}
                </button>
            </form>
        </div>
    );
};

export default PasswordSettings;
