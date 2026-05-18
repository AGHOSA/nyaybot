import { useState, useEffect } from 'react';
import AuthPage from './components/AuthPage';
import ChatPage from './components/ChatPage';
import SettingsPage from './components/SettingsPage';

export default function App() {
  const [page, setPage] = useState('auth');
  const [user, setUser] = useState(null);
  const [theme, setTheme] = useState('dark');

  useEffect(() => {
    const token = localStorage.getItem('nyaybot_token');
    const savedUser = localStorage.getItem('nyaybot_user');
    if (token && savedUser) {
      const u = JSON.parse(savedUser);
      setUser(u);
      setTheme(u.preferences?.theme || 'dark');
      setPage('chat');
    }
  }, []);

  useEffect(() => {
    document.body.classList.toggle('light', theme === 'light');
  }, [theme]);

  const handleLogin = (data) => {
    setUser(data);
    setTheme(data.preferences?.theme || 'dark');
    setPage('chat');
  };

  const handleLogout = () => {
    localStorage.removeItem('nyaybot_token');
    localStorage.removeItem('nyaybot_user');
    setUser(null);
    setPage('auth');
    setTheme('dark');
  };

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    // Persist theme preference
    if (user) {
      const merged = { ...user, preferences: { ...user.preferences, theme: next } };
      setUser(merged);
      localStorage.setItem('nyaybot_user', JSON.stringify(merged));
    }
  };

  const handleUserUpdate = (updated) => {
    const merged = {
      ...user,
      name: updated.name,
      email: updated.email,
      profilePhoto: updated.profilePhoto ?? user.profilePhoto,
      preferences: { ...user.preferences, ...updated.preferences },
    };
    setUser(merged);
    localStorage.setItem('nyaybot_user', JSON.stringify(merged));
    if (updated.preferences?.theme) setTheme(updated.preferences.theme);
  };

  if (page === 'auth') return <AuthPage onLogin={handleLogin} />;

  if (page === 'settings') return (
    <SettingsPage
      user={user}
      theme={theme}
      onToggleTheme={toggleTheme}
      onBack={() => setPage('chat')}
      onLogout={handleLogout}
      onUserUpdate={handleUserUpdate}
    />
  );

  return (
    <ChatPage
      user={user}
      theme={theme}
      onToggleTheme={toggleTheme}
      onOpenSettings={() => setPage('settings')}
      onLogout={handleLogout}
      onUserUpdate={handleUserUpdate}
    />
  );
}
