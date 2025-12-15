// src/contexts/AuthContext.tsx - VERSION COMPLÈTE CORRIGÉE
import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  getCurrentUser,
  refreshCurrentUser,
  debugAuth,
  isAuthenticated as checkAuth,
  autoFixUserId,
  ensureValidUserId,
  type LoginResponse,
  type RegisterUserData 
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
  refreshUser: () => Promise<void>;
  debugAuth: () => void;
  fixUserId: () => Promise<boolean>;
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
  const [initialized, setInitialized] = useState<boolean>(false);

  // ==============================
  // CORE FUNCTIONS
  // ==============================

  const checkAuthStatus = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      console.log('🔍 [AuthContext] Vérification DÉTAILLÉE...');
      
      // DEBUG: Afficher tout localStorage
      console.log('📦 localStorage actuel:');
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        console.log(`  ${key}:`, localStorage.getItem(key!));
      }
      
      const userData = getCurrentUser();
      const isAuthValid = checkAuth();
      
      if (userData && isAuthValid) {
        console.log('✅ [AuthContext] Utilisateur TROUVÉ (même ID=0):', userData.email);
        console.log('📊 Détails:', { 
          id: userData.id, 
          email: userData.email,
          roles: userData.roles 
        });
        
        // Vérifier et corriger ID=0 si nécessaire
        if (userData.id === 0) {
          console.warn('⚠️ ID utilisateur = 0, tentative de correction...');
          try {
            const fixed = await autoFixUserId();
            if (fixed) {
              const updatedUser = getCurrentUser();
              if (updatedUser) {
                console.log('✅ ID corrigé:', updatedUser.id);
                setUser(updatedUser);
              } else {
                setUser(userData);
              }
            } else {
              console.log('⚠️ ID toujours 0, garder utilisateur quand même');
              setUser(userData);
            }
          } catch (fixError) {
            console.error('❌ Erreur correction ID:', fixError);
            setUser(userData);
          }
        } else {
          setUser(userData);
        }
      } else {
        console.log('❌ [AuthContext] Aucun utilisateur trouvé');
        console.log('🔍 Recherche manuelle...');
        
        // Recherche manuelle de secours
        const manualUserStr = localStorage.getItem('user');
        if (manualUserStr) {
          try {
            const manualUser = JSON.parse(manualUserStr);
            if (manualUser && manualUser.email) {
              console.log('🎯 Utilisateur trouvé MANUELLEMENT:', manualUser.email);
              setUser(manualUser);
              return;
            }
          } catch (e) {
            console.error('❌ Erreur parsing manuel:', e);
          }
        }
        
        setUser(null);
      }
      
    } catch (error) {
      console.error('❌ [AuthContext] Erreur vérification:', error);
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
    }
  }, []);

  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 [AuthContext] Rafraîchissement...');
      
      const userData = await refreshCurrentUser();
      
      if (userData) {
        console.log('✅ Utilisateur rafraîchi:', userData.email);
        setUser(userData);
      } else {
        console.warn('⚠️ Impossible de rafraîchir');
      }
      
    } catch (error) {
      console.error('❌ Erreur rafraîchissement:', error);
    }
  }, []);

  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      console.log('🔄 [AuthContext] Connexion démarre...', { email });
      
      const response: LoginResponse = await loginUser(email, password);
      
      console.log('🎉 [AuthContext] Connexion RÉUSSIE!');
      console.log('📊 Détails:', {
        email: response.user.email,
        id: response.user.id,
        roles: response.user.roles
      });
      
      // Vérification IMMÉDIATE après connexion
      const verifyUser = getCurrentUser();
      console.log('🔍 Vérification post-connexion:', verifyUser ? 'OK' : 'ÉCHEC');
      
      setUser(response.user);
      
      // Si ID=0, essayer de le corriger immédiatement
      if (response.user.id === 0) {
        console.warn('⚠️ ID=0 après connexion, correction différée...');
        // On corrigera plus tard dans checkAuthStatus
      }
      
      // Forcer une vérification après un court délai
      setTimeout(() => {
        checkAuthStatus();
      }, 100);
      
    } catch (error) {
      console.error('❌ [AuthContext] Erreur connexion:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, [checkAuthStatus]);

  const register = useCallback(async (userData: RegisterUserData): Promise<void> => {
    try {
      setLoading(true);
      console.log('📝 [AuthContext] Inscription...', { email: userData.email });
      
      await registerUser(userData);
      console.log('✅ Inscription réussie');
      
    } catch (error) {
      console.error('❌ Erreur inscription:', error);
      throw error;
    } finally {
      setLoading(false);
    }
  }, []);

  const logout = useCallback((): void => {
    console.log('👋 [AuthContext] Déconnexion demandée');
    
    setUser(null);
    logoutUser();
    
    console.log('✅ [AuthContext] Déconnexion exécutée');
  }, []);

  const debugAuthContext = useCallback((): void => {
    console.log('🔧 [AuthContext] Debug manuel');
    debugAuth();
    checkAuthStatus();
  }, [checkAuthStatus]);

  const fixUserId = useCallback(async (): Promise<boolean> => {
    try {
      console.log('🔧 [AuthContext] Correction manuelle ID...');
      const fixed = await ensureValidUserId();
      
      if (fixed) {
        const updatedUser = getCurrentUser();
        if (updatedUser) {
          setUser(updatedUser);
          console.log('✅ ID corrigé manuellement:', updatedUser.id);
        }
        return true;
      }
      return false;
    } catch (error) {
      console.error('❌ Erreur correction manuelle ID:', error);
      return false;
    }
  }, []);

  // ==============================
  // EFFECTS
  // ==============================

  useEffect(() => {
    console.log('🚀 [AuthContext] Initialisation du provider');
    checkAuthStatus();
  }, [checkAuthStatus]);

  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user' || event.key === 'jwt_token' || event.key === 'current_user') {
        console.log('🔄 Changement storage détecté:', event.key);
        setTimeout(() => checkAuthStatus(), 100);
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkAuthStatus]);

  // ==============================
  // COMPUTED VALUES
  // ==============================

  const { isAuthenticated, isAdmin, isUser } = useMemo(() => {
    const isAuthenticated = !!user && checkAuth();
    const isAdmin = user?.roles?.includes('ROLE_ADMIN') || false;
    const isUser = user?.roles?.includes('ROLE_USER') || false;

    if (initialized) {
      console.log('📊 [AuthContext] État FINAL:', {
        user: user?.email || 'null',
        isAuthenticated,
        isAdmin,
        isUser,
        loading,
        id: user?.id
      });
    }

    return { isAuthenticated, isAdmin, isUser };
  }, [user, loading, initialized]);

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
    checkAuthStatus,
    refreshUser,
    debugAuth: debugAuthContext,
    fixUserId
  }), [
    user, 
    isAuthenticated, 
    isAdmin, 
    isUser, 
    loading, 
    login, 
    register, 
    logout, 
    checkAuthStatus,
    refreshUser,
    debugAuthContext,
    fixUserId
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