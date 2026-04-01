// src/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from "react";

const AuthCtx = createContext();
const API_URL = process.env.REACT_APP_API_URL || 'https://backend.pvara.team';

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      const stored = localStorage.getItem("pvara_user");
      const token = localStorage.getItem("token");
      if (stored && token) return JSON.parse(stored);
      return null;
    } catch {
      return null;
    }
  });

  // 2FA pending state
  const [pending2FA, setPending2FA] = useState(null);

  useEffect(() => {
    localStorage.setItem("pvara_user", JSON.stringify(user));
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
        // Check if 2FA is required
        if (data.requires2FA) {
          setPending2FA({ userId: data.userId });
          return { ok: false, requires2FA: true, message: data.message };
        }

        // No 2FA required - complete login
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

  async function verify2FA(otpCode) {
    if (!pending2FA) {
      return { ok: false, message: "No pending verification" };
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/verify-2fa`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: pending2FA.userId, otpCode })
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
        setPending2FA(null);
        return { ok: true, user: userPayload };
      }

      return { ok: false, message: data.detail?.message || data.message || "Invalid code" };
    } catch (error) {
      console.error('2FA verification failed:', error);
      return { ok: false, message: "Unable to connect to server" };
    }
  }

  async function resendOTP() {
    if (!pending2FA) {
      return { ok: false, message: "No pending verification" };
    }

    try {
      const response = await fetch(`${API_URL}/api/auth/resend-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ userId: pending2FA.userId })
      });

      const data = await response.json();
      return { ok: data.success, message: data.message };
    } catch (error) {
      return { ok: false, message: "Unable to connect to server" };
    }
  }

  function cancelPending2FA() {
    setPending2FA(null);
  }

  function logout() {
    setUser(null);
    setPending2FA(null);
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
    <AuthCtx.Provider value={{ user, login, logout, hasRole, pending2FA, verify2FA, resendOTP, cancelPending2FA }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth() {
  return useContext(AuthCtx);
}
