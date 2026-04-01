// src/ProtectedRoute.jsx
import React from "react";
import { useAuth } from "./AuthContext";

export default function Protected({ allowed = [], children, fallback = null }) {
  const { user, hasRole } = useAuth();
  if (!user) return fallback || <div className="p-4 bg-yellow-50 text-sm">Please log in to continue.</div>;
  if (allowed.length && !hasRole(allowed)) return <div className="p-4 bg-red-50 text-sm">Access denied — insufficient privileges.</div>;
  return children;
}
