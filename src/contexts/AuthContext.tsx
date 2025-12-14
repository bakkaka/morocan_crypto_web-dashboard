// src/contexts/AuthContext.tsx - VERSION OPTIMISÉE AVEC refreshUser
import React, { createContext, useState, useContext, useEffect, useMemo, useCallback } from 'react';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  getCurrentUser,
  refreshCurrentUser,
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
  refreshUser: () => Promise<void>; // <-- AJOUTÉ ICI
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
  // CORE AUTH FUNCTIONS
  // ==============================

  /**
   * Vérifie le statut d'authentification au chargement
   */
  const checkAuthStatus = useCallback(async (): Promise<void> => {
    try {
      setLoading(true);
      console.log('🔍 [AuthContext] Vérification du statut d\'authentification...');
      
      const userData = getCurrentUser();
      console.log('🔍 [AuthContext] Utilisateur depuis storage:', userData);
      
      setUser(userData);
      
      if (userData) {
        console.log('✅ [AuthContext] Utilisateur connecté détecté:', userData.email);
        console.log('👥 [AuthContext] Rôles de l\'utilisateur:', userData.roles);
      } else {
        console.log('🔐 [AuthContext] Aucun utilisateur connecté');
      }
      
    } catch (error) {
      console.error('❌ [AuthContext] Erreur lors de la vérification d\'authentification:', error);
      setUser(null);
    } finally {
      setLoading(false);
      setInitialized(true);
      console.log('🔍 [AuthContext] Vérification terminée - Loading:', false);
    }
  }, []);

  /**
   * Rafraîchit les données utilisateur depuis l'API
   * Compatible avec UserBankDetails
   */
  const refreshUser = useCallback(async (): Promise<void> => {
    try {
      console.log('🔄 [AuthContext] Rafraîchissement des données utilisateur...');
      
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        console.log('🔐 [AuthContext] Aucun token trouvé, déconnexion...');
        setUser(null);
        return;
      }

      // Vérifier si UserService a une fonction refreshCurrentUser
      // Sinon, utiliser getCurrentUser ou appeler l'API directement
      let userData: User | null = null;
      
      // Essayer d'abord la fonction de rafraîchissement
      if (refreshCurrentUser) {
        userData = await refreshCurrentUser();
      } else {
        // Fallback: récupérer depuis le localStorage ou API
        userData = getCurrentUser();
        
        // Si pas dans localStorage, faire un appel API
        if (!userData) {
          // Vous devrez peut-être implémenter cette fonction dans UserService
          // userData = await fetchCurrentUserFromAPI();
        }
      }
      
      if (userData) {
        console.log('✅ [AuthContext] Utilisateur rafraîchi:', userData.email);
        setUser(userData);
      } else {
        console.warn('⚠️ [AuthContext] Impossible de rafraîchir l\'utilisateur');
        // Conserver l'utilisateur actuel si existant
      }
      
    } catch (error) {
      console.error('❌ [AuthContext] Erreur lors du rafraîchissement:', error);
      // Ne pas déconnecter en cas d'erreur de rafraîchissement
      // L'utilisateur peut continuer avec les données en cache
    }
  }, []);

  /**
   * Connexion utilisateur
   */
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    try {
      setLoading(true);
      console.log('🔄 [AuthContext] Début de la connexion...', { email });
      
      const response: LoginResponse = await loginUser(email, password);
      
      console.log('✅ [AuthContext] Réponse de connexion reçue:');
      console.log('   - User:', response.user);
      console.log('   - Token présent:', !!response.token);
      
      setUser(response.user);
      
      console.log('✅ [AuthContext] Utilisateur défini dans le state:', response.user.email);
      console.log('✅ [AuthContext] Rôles définis:', response.user.roles);
      
    } catch (error) {
      console.error('❌ [AuthContext] Erreur lors de la connexion:', error);
      throw error;
    } finally {
      setLoading(false);
      console.log('🏁 [AuthContext] Connexion terminée - Loading:', false);
    }
  }, []);

  /**
   * Inscription utilisateur
   */
  const register = useCallback(async (userData: RegisterUserData): Promise<void> => {
    try {
      setLoading(true);
      console.log('📝 [AuthContext] Début de l\'inscription...', { email: userData.email });
      
      await registerUser(userData);
      console.log('✅ [AuthContext] Inscription réussie');
      
    } catch (error) {
      console.error('❌ [AuthContext] Erreur lors de l\'inscription:', error);
      throw error;
    } finally {
      setLoading(false);
      console.log('🏁 [AuthContext] Inscription terminée - Loading:', false);
    }
  }, []);

  /**
   * Déconnexion utilisateur
   */
  const logout = useCallback((): void => {
    console.log('👋 [AuthContext] Déconnexion en cours...');
    setUser(null);
    logoutUser();
    console.log('✅ [AuthContext] Déconnexion terminée');
  }, []);

  // ==============================
  // EFFECTS
  // ==============================

  /**
   * Initialisation au montage du composant
   */
  useEffect(() => {
    console.log('🚀 [AuthContext] Initialisation du AuthProvider');
    checkAuthStatus();
  }, [checkAuthStatus]);

  /**
   * Écoute les changements de localStorage (pour synchroniser les onglets)
   */
  useEffect(() => {
    const handleStorageChange = (event: StorageEvent) => {
      if (event.key === 'user' || event.key === 'jwt_token') {
        console.log('🔄 [AuthContext] Changement de localStorage détecté:', event.key);
        checkAuthStatus();
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
    const isAuthenticated = !!user;
    const isAdmin = user?.roles?.includes('ROLE_ADMIN') || false;
    const isUser = user?.roles?.includes('ROLE_USER') || false;

    if (initialized) {
      console.log('📊 [AuthContext] État actuel:', {
        user: user?.email || 'null',
        isAuthenticated,
        isAdmin,
        isUser,
        loading
      });
    }

    return { isAuthenticated, isAdmin, isUser };
  }, [user, loading, initialized]);

  // ==============================
  // CONTEXT VALUE
  // ==============================

  const contextValue = useMemo(() => ({
    user,
    isAuthenticated,
    isAdmin,
    isUser,
    loading,
    login,
    register,
    logout,
    checkAuthStatus,
    refreshUser // <-- AJOUTÉ ICI
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
    refreshUser
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
    throw new Error('useAuth doit être utilisé à l\'intérieur d\'un AuthProvider');
  }
  
  return context;
}

// ==============================
// DEFAULT EXPORT
// ==============================

export default AuthContext;