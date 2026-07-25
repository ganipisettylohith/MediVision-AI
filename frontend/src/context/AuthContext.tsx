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

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<UserResponse | null>(() => {
    const savedUser = localStorage.getItem('medivision_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [token, setToken] = useState<string | null>(() => {
    return localStorage.getItem('medivision_token');
  });

  const [loading, setLoading] = useState<boolean>(true);

  const refreshUser = async () => {
    const activeToken = localStorage.getItem('medivision_token');
    if (!activeToken) {
      setUser(null);
      setLoading(false);
      return;
    }

    try {
      const res = await apiClient.get<UserResponse>('/auth/me');
      setUser(res.data);
      localStorage.setItem('medivision_user', JSON.stringify(res.data));
    } catch (err) {
      console.error('Failed to fetch current user profile:', err);
      logout();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      refreshUser();
    } else {
      setLoading(false);
    }
  }, [token]);

  const login = (newToken: string, newUser: UserResponse) => {
    localStorage.setItem('medivision_token', newToken);
    localStorage.setItem('medivision_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);
  };

  const logout = () => {
    localStorage.removeItem('medivision_token');
    localStorage.removeItem('medivision_user');
    setToken(null);
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        loading,
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
