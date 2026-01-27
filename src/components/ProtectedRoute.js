import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useBearerToken } from '../contexts/BearerTokenContext';

const ProtectedRoute = ({ children }) => {
  const { bearerToken } = useBearerToken();
  const location = useLocation();

  if (!bearerToken) {
    // Redirect to login page with return url
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;