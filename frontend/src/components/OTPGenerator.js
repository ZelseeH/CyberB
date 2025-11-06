// components/OTPGenerator.js

import React, { useState } from 'react';

const OTPGenerator = ({ onGenerate }) => {
    const [x, setX] = useState(65);
    const [a, setA] = useState(6);
    const [generatedOTP, setGeneratedOTP] = useState('');

    // Funkcja jednokierunkowa: exp(-a*x)
    const generateOTP = () => {
        // exp(-a*x) 
        const result = Math.exp(-a * x);

        // Konwertuj na liczbę całkowitą i weź ostatnie 6 cyfr
        const numericValue = Math.floor(result * 1000000);
        const otpString = String(Math.abs(numericValue)).padStart(6, '0').slice(-6);

        setGeneratedOTP(otpString);

        if (onGenerate) {
            onGenerate(otpString);
        }

        console.log(`🔐 OTP Generated:`);
        console.log(`   x=${x}, a=${a}`);
        console.log(`   exp(-${a}*${x}) = ${result}`);
        console.log(`   OTP: ${otpString}`);
    };

    return (
        <div className="otp-generator">
            <h4>🔑 Generator hasła jednorazowego</h4>

            <div className="otp-generator-form">
                <div className="form-group">
                    <label>x = </label>
                    <input
                        type="number"
                        min="1"
                        max="1000"
                        value={x}
                        onChange={(e) => setX(parseInt(e.target.value))}
                        className="otp-input"
                    />
                </div>

                <div className="form-group">
                    <label>a = </label>
                    <input
                        type="number"
                        min="1"
                        max="100"
                        value={a}
                        onChange={(e) => setA(parseInt(e.target.value))}
                        className="otp-input"
                    />
                </div>

                <button
                    type="button"
                    onClick={generateOTP}
                    className="generate-otp-btn"
                >
                    Generuj OTP
                </button>
            </div>

            {generatedOTP && (
                <div className="otp-result">
                    <p>Funkcja: <code>exp(-a*x)</code></p>
                    <p>Wartość: <code>exp(-{a}*{x}) = {Math.exp(-a * x).toFixed(10)}</code></p>
                    <p className="otp-display">
                        Hasło jednorazowe: <strong>{generatedOTP}</strong>
                    </p>
                </div>
            )}
        </div>
    );
};

export default OTPGenerator;
