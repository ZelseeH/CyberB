import React from 'react';
import { Navigate } from 'react-router-dom';
import { isAuthenticated, isAdmin } from '../services/api';

const PrivateRoute = ({ children, requireAdmin = false }) => {
    if (!isAuthenticated()) {
        return <Navigate to="/login" replace />;
    }

    if (requireAdmin && !isAdmin()) {
        return <Navigate to="/user" replace />;
    }

    return children;
};

export default PrivateRoute;
