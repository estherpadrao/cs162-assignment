import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import 'bootstrap/dist/css/bootstrap.min.css';

import ApiClient from './ApiClient';
import UserContext from './UserContext';

import Header from './components/Header';
import HomePage from './pages/HomePage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import ProfilePage from './pages/ProfilePage';
import ListsPage from './pages/ListsPage';

// One shared ApiClient instance (token persisted in localStorage)
const api = new ApiClient();

export default function App() {
  // undefined = still loading, null = not authenticated, object = authenticated user
  const [user, setUser] = useState(undefined);

  // On mount, try to restore session from the stored token
  useEffect(() => {
    (async () => {
      const result = await api.getMe();
      setUser(result.ok ? result.user : null);
    })();
  }, []);

  // Wait for the auth check before rendering anything
  if (user === undefined) return null;

  return (
    <UserContext.Provider value={{ user, setUser, api }}>
      <BrowserRouter>
        <Header />
        <Routes>
          {/* Public */}
          <Route path="/" element={<HomePage />} />
          <Route
            path="/login"
            element={user ? <Navigate to="/lists" replace /> : <LoginPage />}
          />
          <Route
            path="/register"
            element={user ? <Navigate to="/lists" replace /> : <RegisterPage />}
          />
          {/* Protected */}
          <Route
            path="/profile"
            element={user ? <ProfilePage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/lists"
            element={user ? <ListsPage /> : <Navigate to="/login" replace />}
          />
          {/* Fallback */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </UserContext.Provider>
  );
}
