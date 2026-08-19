import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authApi } from '../../services/api/authApi';

const AuthContext = createContext(null);
const TOKEN_STORAGE_KEY = "ailogitrack_auth_token";

export function AuthProvider({ children }) {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(TOKEN_STORAGE_KEY));
  const [user, setUser] = useState(null);
  const [isLoading, setIsLoading] = useState(true);

  const persistSession = useCallback((token, authCustomer) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, token);
    setAuthToken(token);
    setUser(authCustomer);
  }, []);

  const clearSession = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
    setUser(null);
  }, []);

  const fetchProfile = useCallback(async (token) => {
    try {
      // Temporarily bypass the client default token if we are initializing
      const response = await authApi.getProfile();
      if (response?.success && response?.data) {
        setUser(response.data.customer || response.data);
      } else {
        clearSession();
      }
    } catch (error) {
      console.error("Session restoration failed:", error);
      clearSession();
    } finally {
      setIsLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    if (authToken) {
      fetchProfile(authToken);
    } else {
      setIsLoading(false);
    }
  }, [authToken, fetchProfile]);

  const login = async (credentials) => {
    const response = await authApi.login(credentials);
    const token = response?.data?.token;
    const authCustomer = response?.data?.customer;

    if (!token || !authCustomer) {
      throw new Error("Invalid login response from server");
    }

    persistSession(token, authCustomer);
    return authCustomer;
  };

  const register = async (details) => {
    const response = await authApi.register(details);
    if (!response?.success) {
      throw new Error(response?.message || "Registration failed");
    }
    return response;
  };

  const logout = async () => {
    try {
      if (authToken) await authApi.logout();
    } catch (error) {
      console.warn("Logout request failed, clearing locally anyway");
    } finally {
      clearSession();
    }
  };

  const value = {
    user,
    token: authToken,
    isLoading,
    isAuthenticated: !!authToken && !!user,
    role: user?.role || 'guest',
    login,
    register,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
