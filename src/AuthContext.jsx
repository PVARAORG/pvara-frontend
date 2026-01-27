// src/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const AuthCtx = createContext();
const API_URL = process.env.REACT_APP_API_URL || 'https://argaam-be.fortanixor.com';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("argaam_user");
      const token = localStorage.getItem("token");
      if (stored && token) return JSON.parse(stored);
      return null;
    } catch {
      return null;
    }
  });

  useEffect(() => {
    localStorage.setItem("argaam_user", JSON.stringify(user));
  }, [user]);

  async function login({ username, password }) {
    try {
      const response = await fetch(`${API_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
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
      
      return { ok: false, message: data.message || "Invalid credentials" };
    } catch (error) {
      console.error('Login failed:', error);
      return { ok: false, message: "Unable to connect to server" };
    }
  }

  function logout() {
    setUser(null);
    localStorage.removeItem("argaam_user");
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
