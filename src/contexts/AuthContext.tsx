// src/contexts/AuthContext.tsx
import React, { createContext, useState, useContext, useEffect } from 'react';
import { 
  loginUser, 
  registerUser, 
  logoutUser, 
  getCurrentUserFromStorage,
  type User, 
  type LoginResponse,
  type RegisterUserData 
} from '../api/UserService';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isUser: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (userData: RegisterUserData) => Promise<void>;
  logout: () => void;
  loading: boolean;
  checkAuthStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const checkAuthStatus = async (): Promise<void> => {
    try {
      setLoading(true);
      console.log('🔍 [AuthContext] Vérification du statut d\'authentification...');
      
      const userData = getCurrentUserFromStorage();
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
      console.log('🔍 [AuthContext] Vérification terminée - Loading:', false);
    }
  };

  useEffect(() => {
    console.log('🚀 [AuthContext] Initialisation du AuthProvider');
    checkAuthStatus();
  }, []);

  const login = async (email: string, password: string): Promise<void> => {
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
  };

  const register = async (userData: RegisterUserData): Promise<void> => {
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
  };

  const logout = (): void => {
    console.log('👋 [AuthContext] Déconnexion en cours...');
    setUser(null);
    logoutUser();
    console.log('✅ [AuthContext] Déconnexion terminée');
  };

  // Calcul des rôles
  const isAuthenticated = !!user;
  const isAdmin = user?.roles?.includes('ROLE_ADMIN') || false;
  const isUser = user?.roles?.includes('ROLE_USER') || false;

  console.log('📊 [AuthContext] État actuel:', {
    user: user?.email || 'null',
    isAuthenticated,
    isAdmin,
    isUser,
    loading
  });

  const value: AuthContextType = {
    user,
    isAuthenticated,
    isAdmin,
    isUser,
    login,
    register,
    logout,
    loading,
    checkAuthStatus
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