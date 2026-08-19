import React from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/AuthContext';

export function RoleRoute({ allowedRoles, children }) {
  const { role, isLoading, isAuthenticated } = useAuth();

  if (isLoading) {
    return <div className="loading-screen">Loading application...</div>;
  }

  // If unauthenticated, let ProtectedRoute handle it (assuming RoleRoute is nested within it, 
  // or handle it here if it's standalone)
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Ensure role exists and is in the allowedRoles array.
  // Note: sub-admin is usually treated as admin for routing purposes, but adjust if needed.
  const userRole = role || 'customer';
  const hasAccess = allowedRoles.includes(userRole);

  if (!hasAccess) {
    // Redirect to a safe default path for their role
    if (userRole === 'customer') return <Navigate to="/app/customer" replace />;
    if (userRole === 'delivery-agent') return <Navigate to="/app/agent" replace />;
    if (userRole === 'admin' || userRole === 'sub-admin') return <Navigate to="/app/admin" replace />;
    
    // Fallback
    return <Navigate to="/" replace />;
  }

  return children;
}
