import React, { createContext, useState, useContext, useEffect } from 'react';
import type { User, LoginResponse } from '../services/AuthService';
import { loginUser, registerUser, logoutUser } from '../services/AuthService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: { email: string; password: string; fullName: string; phone: string }) => Promise<void>;
  logout: () => void;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Vérifier si l'utilisateur est déjà connecté au chargement
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    
    if (token && userData) {
      try {
        setUser(JSON.parse(userData));
      } catch (error) {
        console.error('Erreur parsing user data:', error);
        localStorage.removeItem('authToken');
        localStorage.removeItem('userData');
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
    try {
      const response: LoginResponse = await loginUser(email, password);
      setUser(response.user);
      localStorage.setItem('authToken', response.token || 'demo-token');
      localStorage.setItem('userData', JSON.stringify(response.user));
    } catch (error) {
      throw error;
    }
  };

  const register = async (userData: { email: string; password: string; fullName: string; phone: string }): Promise<void> => {
    try {
      await registerUser(userData);
    } catch (error) {
      throw error;
    }
  };

  const logout = (): void => {
    setUser(null);
    logoutUser();
  };

  const value: AuthContextType = {
    user,
    isAuthenticated: !!user,
    login,
    register,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};