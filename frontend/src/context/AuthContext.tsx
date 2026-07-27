import React, { createContext, useContext, useState, useEffect } from 'react';
import apiClient from '../services/api';
import { UserResponse } from '../types';

interface AuthContextType {
  user: UserResponse | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (token: string, user: UserResponse) => void;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const DEFAULT_USER: UserResponse = {
  id: 1,
  full_name: 'MediVision User',
  email: 'user@medivision.ai',
  created_at: new Date().toISOString(),
  total_scans: 0,
  last_scan_date: null,
  settings: {
    theme: 'dark',
    notifications_enabled: true,
    default_page_size: 10,
  },
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse>(() => {
    const savedUser = localStorage.getItem('medivision_user');
    return savedUser ? JSON.parse(savedUser) : DEFAULT_USER;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('medivision_token') || 'demo_token';
  });

  const refreshUser = async () => {
    try {
      const res = await apiClient.get<UserResponse>('/auth/me');
      if (res.data) {
        setUser(res.data);
        localStorage.setItem('medivision_user', JSON.stringify(res.data));
      }
    } catch (err) {
      console.warn('Using default user profile:', err);
    }
  };

  useEffect(() => {
    refreshUser();
  }, []);

  const login = (newToken: string, newUser: UserResponse) => {
    localStorage.setItem('medivision_token', newToken);
    localStorage.setItem('medivision_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    // Reset to default active state
    setUser(DEFAULT_USER);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token: token || 'demo_token',
        isAuthenticated: true,
        loading: false,
        login,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
