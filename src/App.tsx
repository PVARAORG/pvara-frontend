import React from 'react';
import { LoginPage } from './pages/LoginPage';
import { UnifiedDashboard } from './pages/UnifiedDashboard';
import { useAuthStore } from './store/auth.store';
import './styles/ultra-premium.css';
import './styles/global.css';
import './styles/application-detail.css';

function App() {
  console.info('📱 App component mounted');
  const { isAuthenticated, login, logout } = useAuthStore();
  console.info('🔐 Auth status:', isAuthenticated ? 'Authenticated' : 'Not authenticated');

  const handleLogin = async (username: string, password: string) => {
    console.info('🔑 Login attempt for user:', username);
    try {
      const success = await login(username, password);
      if (!success) {
        console.error('❌ Login failed: Invalid credentials');
        throw new Error('Invalid credentials');
      }
      console.info('✅ Login successful');
    } catch (error) {
      console.error('❌ Login error:', error);
      throw error;
    }
  };

  if (!isAuthenticated) {
    console.info('🔓 Rendering login page');
    return <LoginPage onLogin={handleLogin} />;
  }

  console.info('🏠 Rendering dashboard');
  return (
    <div className="App">
      <UnifiedDashboard onLogout={logout} />
    </div>
  );
}

export default App;
