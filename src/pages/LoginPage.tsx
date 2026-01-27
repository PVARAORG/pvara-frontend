import React, { useState } from 'react';
import { FiAlertCircle, FiLoader, FiLogIn } from 'react-icons/fi';
import '../styles/login.css';

interface LoginPageProps {
  onLogin: (username: string, password: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!username || !password) {
      setError('Please enter both username and password');
      return;
    }

    setIsLoading(true);

    try {
      await onLogin(username, password);
    } catch (err) {
      setError('Invalid username or password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-background">
        <div className="gradient-orb orb-1"></div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">Argaam Job Portal</h2>
        <div className="gradient-orb orb-3"></div>
      </div>

      <div className="login-card">
        <div className="login-header">
          <div className="logo-container">
            <div className="logo-icon">
              <img
                src="/logo.png"
                alt="Argaam"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                  (e.target as HTMLImageElement).parentElement!.innerHTML = '<span style="font-size: 40px;">🛡️</span>';
                }}
              />
            </div>
          </div>
          <h1>Argaam <span style={{ direction: 'rtl', display: 'inline-block' }}>أرقام</span></h1>
          <p className="text-gray-500 mb-8">Argaam - Connecting Talent with Opportunity</p>
          <p className="text-gray-500 mb-8" style={{ direction: 'rtl', fontSize: '0.9rem' }}>أرقام - ربط المواهب بالفرص</p>
        </div>

        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="error-message">
              <FiAlertCircle size={18} />
              <span>{error}</span>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="username">Username</label>
            <div className="input-wrapper">
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                disabled={isLoading}
                autoComplete="username"
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <div className="input-wrapper">
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                disabled={isLoading}
                autoComplete="current-password"
              />
            </div>
          </div>

          <div className="form-options">
            <label className="checkbox-label">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>
          </div>

          <button
            type="submit"
            className="login-button"
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <FiLoader className="spinner" size={20} />
                <span>Signing in...</span>
              </>
            ) : (
              <>
                <FiLogIn size={20} />
                <span>Sign In</span>
              </>
            )}
          </button>
        </form>

        <div className="login-footer">
          <p>Argaam - Connecting Talent with Opportunity</p>
          <p style={{ marginTop: '0.5rem', fontSize: '0.9rem' }}>أرقام - ربط المواهب بالفرص</p>
        </div>
      </div>

      <div className="login-info">
        <p>© 2025 Argaam. AI-Powered Licensing & Compliance Evaluation Platform.</p>
      </div>
    </div>
  );
};
