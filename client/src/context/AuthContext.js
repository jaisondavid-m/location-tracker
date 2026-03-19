import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { loginUser, getCurrentUser } from '../api/axios';

const AuthContext = createContext(null);

// ── Decode JWT payload without any library ────────────────────────────────────
const decodeBase64 = value => {
  if (typeof global?.atob === 'function') return global.atob(value);
  if (typeof atob === 'function') return atob(value);
  throw new Error('No base64 decoder available');
};

const decodeJWT = token => {
  try {
    const base64 = token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(
      decodeBase64(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join(''),
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }) => {
  const [user, setUser]                       = useState(null);
  const [loading, setLoading]                 = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ── Rehydrate on app start ────────────────────────────────────────────────
  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem('jwt_token');
        if (token) {
          const claims = decodeJWT(token);
          if (claims && claims.exp * 1000 > Date.now()) {
            setUser(buildUser(claims));
            setIsAuthenticated(true);
          } else {
            await AsyncStorage.removeItem('jwt_token');
          }
        }
      } catch (e) {
        console.warn('Auth rehydration failed:', e);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // ── Build user object from JWT claims ─────────────────────────────────────
  // JWT stores user_id as number (float64 in Go → number in JS)
  const buildUser = claims => ({
    user_id: claims.user_id,
    role:    claims.role    ?? null,
    name:    claims.name    ?? null,   // ← from JWT
    email:   claims.email   ?? null,   // ← from JWT
  });

  // ── Save session after login ──────────────────────────────────────────────
  const saveSession = async token => {
    await AsyncStorage.setItem('jwt_token', token);
    const claims = decodeJWT(token);

    if (!claims?.user_id || !claims?.role) {
      throw new Error('Invalid session token received from server.');
    }

    const userData = buildUser(claims);
    setUser(userData);
    setIsAuthenticated(true);
    return userData;
  };

  // ── Login ─────────────────────────────────────────────────────────────────
  const login = async (email, password) => {
    const response = await loginUser(email, password);
    const token = response?.token;
    if (!token) throw new Error('Login succeeded but no token was returned.');
    return saveSession(token);
  };

  // ── Fetch fresh user from /auth/me (call this if you need latest data) ────
  const refreshUser = async () => {
    try {
      const data = await getCurrentUser(); // GET /auth/me
      setUser(prev => ({ ...prev, ...data }));
      return data;
    } catch (e) {
      console.warn('refreshUser failed:', e);
    }
  };

  // ── Logout ────────────────────────────────────────────────────────────────
  const logout = async () => {
    await AsyncStorage.removeItem('jwt_token');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, loading, isAuthenticated, login, logout, saveSession, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);