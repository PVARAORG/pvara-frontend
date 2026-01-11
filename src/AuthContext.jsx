// src/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const AuthCtx = createContext();
const API_URL = process.env.REACT_APP_API_URL || 'https://portal-be.paicc.tech';

const demoUsers = [
  { username: "admin", password: "admin", role: "admin", name: "Admin User" },
  { username: "hr", password: "hr", role: "hr", name: "HR User" },
  { username: "recruit", password: "rec", role: "recruiter", name: "Recruiter" },
  { username: "viewer", password: "view", role: "viewer", name: "Viewer" },
];

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("pvara_user");
      const token = localStorage.getItem("token");
      if (stored && token) return JSON.parse(stored);
      return null; // No auto-login - require proper authentication
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem("pvara_user", JSON.stringify(user));
  }, [user]);

  async function login({ username, password }) {
    try {
      // Try backend API first
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'ngrok-skip-browser-warning': 'true'
        },
        body: JSON.stringify({ username, password })
      });

      const data = await response.json();

      if (data.success) {
        const { token, user: userData } = data;
        localStorage.setItem('token', token);
        const userPayload = {
          username: userData.username,
          role: userData.role,
          name: userData.fullName || userData.username,
          email: userData.email
        };
        setUser(userPayload);
        return { ok: true, user: userPayload };
      }
    } catch (error) {
      console.log('Backend auth failed, trying demo credentials...');
    }

    // Fallback to demo users for development
    const found = demoUsers.find(u => u.username === username && u.password === password);
    if (found) {
      const payload = { username: found.username, role: found.role, name: found.name };
      setUser(payload);
      // Create a demo token
      localStorage.setItem('token', 'demo-token-' + Date.now());
      return { ok: true, user: payload };
    }

    return { ok: false, message: "Invalid credentials" };
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("pvara_user");
    localStorage.removeItem("token");
    // Refresh the page to fully reset app state and hide authenticated content
    window.location.reload();
  }

  const hasRole = (roles) => {
    if (!user) return false;
    if (typeof roles === "string") roles = [roles];
    return roles.includes(user.role);
  };

  return (
    <AuthCtx.Provider value={{ user, login, logout, hasRole }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
