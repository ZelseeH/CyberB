// hooks/useSessionTimeout.js

import React, { useEffect, useRef } from 'react';
import { logout } from '../services/api';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';

export const useSessionTimeout = () => {
    const navigate = useNavigate();
    const [timeRemaining, setTimeRemaining] = React.useState(900);

    const idleTimeoutMsRef = useRef(null);
    const sessionStartRef = useRef(Date.now());
    const logoutAttempted = useRef(false);
    const warningShown = useRef(false);
    const timerRef = useRef(null);

    const performLogout = async (message) => {
        if (logoutAttempted.current) return;
        logoutAttempted.current = true;

        console.error('🔴🔴🔴 PERFORMING LOGOUT 🔴🔴🔴', message);
        try {
            await logout();
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            if (message) toast.error(message);
            setTimeout(() => navigate('/login'), 500);
        }
    };

    useEffect(() => {
        const storedTimeout = localStorage.getItem('idleTimeout');
        const loginTime = localStorage.getItem('loginTime');

        idleTimeoutMsRef.current = storedTimeout ? parseInt(storedTimeout) : 15 * 60 * 1000;
        sessionStartRef.current = loginTime ? parseInt(loginTime) : Date.now();

        logoutAttempted.current = false;
        warningShown.current = false;

        const timeoutSec = Math.floor(idleTimeoutMsRef.current / 1000);
        console.log(`%c🕐 SESSION INITIALIZED`, 'color: green; font-weight: bold; font-size: 14px;');
        console.log(`   Timeout: ${timeoutSec}s (${idleTimeoutMsRef.current}ms)`);
        console.log(`   Session Start: ${new Date(sessionStartRef.current).toLocaleTimeString()}`);
        console.log(`   Now: ${new Date().toLocaleTimeString()}`);

        timerRef.current = setInterval(() => {
            const now = Date.now();
            const elapsed = now - sessionStartRef.current;
            const remaining = Math.max(0, idleTimeoutMsRef.current - elapsed);
            const remainingSeconds = Math.floor(remaining / 1000);

            setTimeRemaining(remainingSeconds);

            // DEBUG CO 5 SEKUND
            if (remainingSeconds % 5 === 0) {
                console.log(`%c⏱️  ${remainingSeconds}s | elapsed: ${Math.floor(elapsed / 1000)}s | timeout: ${Math.floor(idleTimeoutMsRef.current / 1000)}s`,
                    'color: blue; font-weight: bold;');
            }

            if (remainingSeconds === 60 && !warningShown.current) {
                warningShown.current = true;
                console.warn('%c⚠️  WARNING - 60 SECONDS LEFT!', 'color: orange; font-weight: bold; font-size: 14px;');
                toast.warning('Zostało 1 minuta do wylogowania!');
            }

            if (remainingSeconds <= 0 && !logoutAttempted.current) {
                console.error('%c🔴 TIME EXPIRED - LOGOUT NOW!', 'color: red; font-weight: bold; font-size: 16px;');
                performLogout('Sesja wygasła.');
            }
        }, 1000);

        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, []);

    useEffect(() => {
        // TYLKO CLICK I KEYDOWN - brak mousemove!
        const handleActivity = () => {
            const now = Date.now();
            sessionStartRef.current = now;
            warningShown.current = false;
            localStorage.setItem('loginTime', now.toString());

            const timeoutSec = Math.floor(idleTimeoutMsRef.current / 1000);
            console.log(`%c📌 ACTIVITY DETECTED (click/keydown) - SESSION RESET!`, 'color: purple; font-weight: bold; font-size: 12px;');
            console.log(`   New start: ${new Date(now).toLocaleTimeString()}`);
            console.log(`   Timeout: ${timeoutSec}s`);
        };

        // USUŃ mousemove - tylko click i keydown!
        document.addEventListener('click', handleActivity);
        document.addEventListener('keydown', handleActivity);

        return () => {
            document.removeEventListener('click', handleActivity);
            document.removeEventListener('keydown', handleActivity);
        };
    }, []);

    const updateIdleTimeout = (newTimeoutMs) => {
        console.log(`%c🔄 TIMEOUT UPDATED!`, 'color: teal; font-weight: bold; font-size: 14px;');
        console.log(`   Old: ${Math.floor(idleTimeoutMsRef.current / 1000)}s`);
        console.log(`   New: ${Math.floor(newTimeoutMs / 1000)}s`);

        idleTimeoutMsRef.current = newTimeoutMs;
        sessionStartRef.current = Date.now();
        warningShown.current = false;
        localStorage.setItem('idleTimeout', newTimeoutMs.toString());
        localStorage.setItem('loginTime', Date.now().toString());
    };

    return { timeRemaining, updateIdleTimeout };
};
