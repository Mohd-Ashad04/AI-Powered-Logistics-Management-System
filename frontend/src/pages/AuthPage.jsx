import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../features/auth/AuthContext';
import { AuthScreen } from '../OldApp'; // Importing the existing AuthScreen to preserve design
import { LogisticsNetwork } from '../components/visuals/LogisticsNetwork';

export function AuthPage() {
  const { login, register, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  // If already authenticated, redirect to /app
  if (isAuthenticated) {
    const from = location.state?.from?.pathname || "/app";
    navigate(from, { replace: true });
    return null;
  }

  const handleLogin = async (credentials) => {
    await login(credentials);
    const from = location.state?.from?.pathname || "/app";
    navigate(from, { replace: true });
  };

  const handleRegister = async (details) => {
    await register(details);
  };

  return (
    <div style={{ display: 'flex', width: '100vw', height: '100vh', overflow: 'hidden' }}>
      {/* Left Side: Visual Signature */}
      <div 
        className="auth-visual-side"
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column',
          backgroundColor: 'var(--color-bg-base)',
          borderRight: '1px solid var(--color-border-subtle)',
          position: 'relative',
          padding: 'var(--space-10)'
        }}
      >
        <style>{`
          @media (max-width: 768px) {
            .auth-visual-side { display: none !important; }
          }
        `}</style>
        <div style={{ zIndex: 10 }}>
          <h1 style={{ color: 'var(--color-text-primary)', display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
            <span style={{ color: 'var(--color-accent-primary)' }}>⬢</span> AiLogiTrack
          </h1>
          <p style={{ color: 'var(--color-text-secondary)', maxWidth: '400px', fontSize: 'var(--font-size-lg)', marginTop: 'var(--space-4)' }}>
            The enterprise operating system for global supply chain visibility and automated logistics management.
          </p>
        </div>
        
        <div style={{ position: 'absolute', inset: 0, top: '20%' }}>
          <LogisticsNetwork />
        </div>
      </div>

      {/* Right Side: Auth Form */}
      <div 
        style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          justifyContent: 'center',
          backgroundColor: 'var(--color-surface-1)',
          overflowY: 'auto'
        }}
      >
        <AuthScreen onLogin={handleLogin} onRegister={handleRegister} />
      </div>
    </div>
  );
}
