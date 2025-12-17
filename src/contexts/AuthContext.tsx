// src/contexts/AuthContext.tsx - VERSION CORRIGÉE TYPE-SAFE
import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  getCurrentUser,
  isAuthenticated as checkAuth,
  type LoginResponse,
  type RegisterUserData,
  UserServiceError
} from '../api/UserService';
import type { User } from '../types/User';

// ==============================
// TYPES
// ==============================

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUser: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterUserData) => Promise<void>;
  logout: () => void;
  checkAuthStatus: () => Promise<void>;
}

// ==============================
// CONTEXT
// ==============================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==============================
// PROVIDER
// ==============================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // ==============================
  // CORE FUNCTIONS
  // ==============================

  const checkAuthStatus = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      
      const userData = getCurrentUser();
      const isAuthValid = checkAuth();
      
      if (userData && isAuthValid) {
        console.log('✅ Utilisateur authentifié:', userData.email);
        setUser(userData);
      } else {
        console.log('❌ Aucun utilisateur authentifié');
        setUser(null);
      }
      
    } catch (error: any) {
      console.error('❌ Erreur vérification auth:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      console.log('🔄 Connexion...', { email });
      
      const response: LoginResponse = await loginUser(email, password);
      
      console.log('🎉 Connexion réussie!');
      setUser(response.user);
      
    } catch (error: any) {
      console.error('❌ Erreur connexion:', error);
      
      if (error instanceof UserServiceError) {
        throw error;
      }
      
      throw new UserServiceError(
        error?.message || 'Erreur de connexion',
        'LOGIN_ERROR',
        error?.response?.status
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const register = useCallback(async (userData: RegisterUserData): Promise<void> => {
    try {
      setLoading(true);
      console.log('📝 Inscription...', { email: userData.email });
      
      const registeredUser = await registerUser(userData);
      
      console.log('✅ Inscription réussie!', registeredUser);
      
      // Message clair: Inscription réussie, veuillez vous connecter
      console.log('ℹ️ Inscription terminée. Vous pouvez maintenant vous connecter.');
      
    } catch (error: any) {
      console.error('❌ Erreur inscription:', error);
      
      if (error instanceof UserServiceError) {
        // Messages d'erreur clairs selon le code
        switch (error.code) {
          case 'SERVER_UNAVAILABLE':
          case 'NETWORK_ERROR':
            throw new UserServiceError(
              'Serveur indisponible. Vérifiez votre connexion internet.',
              error.code,
              error.status
            );
            
          case 'VALIDATION_ERROR':
            throw error;
            
          default:
            throw new UserServiceError(
              `Erreur lors de l'inscription: ${error.message}`,
              error.code,
              error.status
            );
        }
      }
      
      throw new UserServiceError(
        'Une erreur inattendue est survenue lors de l\'inscription.',
        'UNKNOWN_ERROR'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback((): void => {
    console.log('👋 Déconnexion...');
    
    setUser(null);
    logoutUser();
  }, []);

  // ==============================
  // EFFECTS
  // ==============================

  useEffect(() => {
    console.log('🚀 Initialisation AuthContext');
    checkAuthStatus();
  }, [checkAuthStatus]);

  // ==============================
  // COMPUTED VALUES
  // ==============================

  const { isAuthenticated, isAdmin, isUser } = useMemo(() => {
    const isAuthenticated = !!user && checkAuth();
    const isAdmin = user?.roles?.includes('ROLE_ADMIN') || false;
    const isUser = user?.roles?.includes('ROLE_USER') || false;

    return { isAuthenticated, isAdmin, isUser };
  }, [user]);

  // ==============================
  // CONTEXT VALUE
  // ==============================

  const contextValue = useMemo((): AuthContextType => ({
    user,
    isAuthenticated,
    isAdmin,
    isUser,
    loading,
    login,
    register,
    logout,
    checkAuthStatus
  }), [
    user, 
    isAuthenticated, 
    isAdmin, 
    isUser, 
    loading, 
    login, 
    register, 
    logout, 
    checkAuthStatus
  ]);

  // ==============================
  // RENDER
  // ==============================

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

// ==============================
// CUSTOM HOOK
// ==============================

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  
  if (context === undefined) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider');
  }
  
  return context;
}

// ==============================
// DEFAULT EXPORT
// ==============================

export default AuthContext;