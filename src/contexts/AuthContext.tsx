// src/contexts/AuthContext.tsx - VERSION COMPATIBLE ET OPTIMISÉE
import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  getCurrentUser,
  refreshCurrentUser,
  isAuthenticated as checkAuth,
  validateToken,
  repairAuthState,
  autoFixUserId,
  ensureValidUserId,
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
  initialized: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterUserData) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
  repairAuth: () => Promise<boolean>;
  fixUserId: () => Promise<boolean>;
  clearAuth: () => void;
  ensureValidUserId: () => Promise<number>;
}

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  lastValidation: number;
}

// ==============================
// CONTEXT
// ==============================

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// ==============================
// PROVIDER
// ==============================

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    loading: true,
    initialized: false,
    lastValidation: 0,
  });

  // ==============================
  // CORE FUNCTIONS
  // ==============================

  const loadUserFromStorage = useCallback((): User | null => {
    try {
      return getCurrentUser();
    } catch (error) {
      console.error('Erreur chargement utilisateur:', error);
      return null;
    }
  }, []);

  const validateAuthState = useCallback(async (): Promise<boolean> => {
    try {
      const isValid = await validateToken();
      if (!isValid) {
        setState(prev => ({ ...prev, user: null }));
        return false;
      }
      return true;
    } catch (error) {
      console.error('Erreur validation auth:', error);
      return false;
    }
  }, []);

  const initializeAuth = useCallback(async (): Promise<void> => {
    try {
      const user = loadUserFromStorage();
      if (user) {
        const isValid = await validateAuthState();
        if (isValid) {
          setState(prev => ({
            ...prev,
            user,
            loading: false,
            initialized: true,
            lastValidation: Date.now(),
          }));
        } else {
          setState(prev => ({ ...prev, user: null, loading: false, initialized: true }));
        }
      } else {
        setState(prev => ({ ...prev, user: null, loading: false, initialized: true }));
      }
    } catch (error) {
      console.error('Erreur initialisation auth:', error);
      setState(prev => ({ ...prev, user: null, loading: false, initialized: true }));
    }
  }, [loadUserFromStorage, validateAuthState]);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const refreshedUser = await refreshCurrentUser();
      if (refreshedUser) {
        setState(prev => ({
          ...prev,
          user: refreshedUser,
          loading: false,
          lastValidation: Date.now(),
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Erreur rafraîchissement:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const repairAuth = useCallback(async (): Promise<boolean> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const repaired = await repairAuthState();
      if (repaired) {
        const user = loadUserFromStorage();
        setState(prev => ({ ...prev, user, loading: false }));
        return true;
      }
      setState(prev => ({ ...prev, loading: false }));
      return false;
    } catch (error) {
      console.error('Erreur réparation:', error);
      setState(prev => ({ ...prev, loading: false }));
      return false;
    }
  }, [loadUserFromStorage]);

  const fixUserId = useCallback(async (): Promise<boolean> => {
    try {
      const fixed = await autoFixUserId();
      if (fixed) {
        const user = loadUserFromStorage();
        setState(prev => ({ ...prev, user }));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Erreur fixUserId:', error);
      return false;
    }
  }, [loadUserFromStorage]);

  // ==============================
  // AUTH OPERATIONS
  // ==============================

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      const response: LoginResponse = await loginUser(email, password);
      const storedUser = getCurrentUser();
      if (!storedUser) throw new UserServiceError('Échec sauvegarde utilisateur');
      setState(prev => ({
        ...prev,
        user: response.user,
        loading: false,
        lastValidation: Date.now(),
      }));
      if (response.user.id === 0) {
        setTimeout(() => repairAuth(), 1000);
      }
    } catch (error) {
      console.error('Erreur connexion:', error);
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, [repairAuth]);

  const register = useCallback(async (userData: RegisterUserData): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      await registerUser(userData);
      const storedUser = getCurrentUser();
      if (storedUser) {
        setState(prev => ({
          ...prev,
          user: storedUser,
          loading: false,
          lastValidation: Date.now(),
        }));
      } else {
        setState(prev => ({ ...prev, loading: false }));
      }
    } catch (error) {
      console.error('Erreur inscription:', error);
      setState(prev => ({ ...prev, loading: false }));
      throw error;
    }
  }, []);

  const logout = useCallback(async (): Promise<void> => {
    try {
      setState(prev => ({ ...prev, loading: true }));
      logoutUser();
      setState(prev => ({
        ...prev,
        user: null,
        loading: false,
        lastValidation: 0,
      }));
    } catch (error) {
      console.error('Erreur déconnexion:', error);
      setState(prev => ({ ...prev, loading: false }));
    }
  }, []);

  const clearAuth = useCallback((): void => {
    logoutUser();
    setState(prev => ({ ...prev, user: null, lastValidation: 0 }));
  }, []);

  // ==============================
  // EFFECTS
  // ==============================

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  useEffect(() => {
    const interval = setInterval(async () => {
      if (state.user && Date.now() - state.lastValidation > 300000) {
        await validateAuthState();
      }
    }, 60000);
    return () => clearInterval(interval);
  }, [state.user, state.lastValidation, validateAuthState]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key?.includes('auth') || event.key?.includes('user')) {
        setTimeout(() => initializeAuth(), 100);
      }
    };
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        validateAuthState();
      }
    };
    window.addEventListener('storage', handleStorageChange);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [initializeAuth, validateAuthState]);

  // ==============================
  // COMPUTED VALUES
  // ==============================

  const { isAuthenticated, isAdmin, isUser } = useMemo(() => {
    const authCheck = checkAuth();
    const currentUser = state.user;
    return {
      isAuthenticated: authCheck && !!currentUser,
      isAdmin: currentUser?.roles?.includes('ROLE_ADMIN') || false,
      isUser: currentUser?.roles?.includes('ROLE_USER') || false,
    };
  }, [state.user]);

  // ==============================
  // CONTEXT VALUE
  // ==============================

  const contextValue = useMemo((): AuthContextType => ({
    user: state.user,
    isAuthenticated,
    isAdmin,
    isUser,
    loading: state.loading,
    initialized: state.initialized,
    login,
    register,
    logout,
    refreshUser,
    repairAuth,
    fixUserId,
    clearAuth,
    ensureValidUserId
  }), [
    state.user,
    state.loading,
    state.initialized,
    isAuthenticated,
    isAdmin,
    isUser,
    login,
    register,
    logout,
    refreshUser,
    repairAuth,
    fixUserId,
    clearAuth,
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
// UTILITY HOOKS
// ==============================

export function useAuthGuard(requiredRole?: 'admin' | 'user'): boolean {
  const { isAuthenticated, isAdmin, isUser, loading } = useAuth();
  if (loading) return false;
  if (!isAuthenticated) return false;
  if (requiredRole === 'admin' && !isAdmin) return false;
  if (requiredRole === 'user' && !isUser) return false;
  return true;
}

export function useRequireAuth(redirectTo: string = '/login'): void {
  const { isAuthenticated, loading } = useAuth();
  useEffect(() => {
    if (!loading && !isAuthenticated && typeof window !== 'undefined') {
      window.location.href = redirectTo;
    }
  }, [isAuthenticated, loading, redirectTo]);
}

// ==============================
// DEFAULT EXPORT
// ==============================

export default AuthContext;