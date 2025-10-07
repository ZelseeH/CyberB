import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import './App.css';

import Login from './components/Login';
import AdminPanel from './components/AdminPanel';
import UserPanel from './components/UserPanel';
import PrivateRoute from './components/PrivateRoute';

function App() {
    return (
        <Router>
            <div className="App">
                <ToastContainer
                    position="top-right"
                    autoClose={3000}
                    hideProgressBar={false}
                    newestOnTop={false}
                    closeOnClick
                    rtl={false}
                    pauseOnFocusLoss
                    draggable
                    pauseOnHover
                    theme="light"
                />

                <Routes>
                    <Route path="/login" element={<Login />} />

                    <Route
                        path="/admin"
                        element={
                            <PrivateRoute requireAdmin={true}>
                                <AdminPanel />
                            </PrivateRoute>
                        }
                    />

                    <Route
                        path="/user"
                        element={
                            <PrivateRoute>
                                <UserPanel />
                            </PrivateRoute>
                        }
                    />

                    <Route path="/" element={<Navigate to="/login" replace />} />
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </div>
        </Router>
    );
}

export default App;
