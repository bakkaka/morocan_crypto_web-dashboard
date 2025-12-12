// src/api/UserService.ts - VERSION FINALE CORRIGÉE
import api from './axiosConfig';
import type { User } from '../types/User';

// ==============================
// INTERFACES
// ==============================

export interface RegisterUserData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  message?: string;
}

export interface UpdateUserData {
  fullName?: string;
  email?: string;
  phone?: string;
  reputation?: number;
  isVerified?: boolean;
  roles?: string[];
  isActive?: boolean;
  walletAddress?: string;
}

export class UserServiceError extends Error {
  public code?: string;
  public status?: number;
  public details?: any;

  constructor(message: string, code?: string, status?: number, details?: any) {
    super(message);
    this.name = 'UserServiceError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// ==============================
// CONSTANTS
// ==============================

const STORAGE_KEYS = {
  USER: 'user',
  TOKEN: 'authToken',
  IS_AUTHENTICATED: 'isAuthenticated',
  AUTH_TIMESTAMP: 'authTimestamp'
} as const;

// ==============================
// AUTHENTIFICATION (CORRIGÉ)
// ==============================

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  const startTime = Date.now();
  
  try {
    console.group('🔐 Connexion utilisateur');
    console.log('📤 Envoi à /login_check');
    console.log('👤 Email:', email);

    // FORMAT CORRECT : email/password (comme PowerShell)
    const response = await api.post('/login_check', {
      email: email,      // ← VOTRE BACKEND ATTEND "email" PAS "username"
      password: password
    });

    const responseTime = Date.now() - startTime;
    console.log(`✅ Connexion réussie en ${responseTime}ms`);
    
    // VÉRIFICATION CRITIQUE : Analyse de la réponse
    console.log('📥 Réponse du backend:', response.data);
    
    // VOTRE BACKEND RETOURNE { token: "...", user: {...} }
    const responseData = response.data;
    const token = responseData.token;
    const user = responseData.user;
    
    if (!token) {
      console.error('❌ AUCUN TOKEN dans la réponse!');
      console.error('Structure réponse:', responseData);
      throw new UserServiceError('Token non reçu du serveur', 'NO_TOKEN');
    }

    if (!user) {
      console.warn('⚠️ Pas d\'objet user dans la réponse');
      // Créer un user basique
      const basicUser: User = {
        id: 0,
        email: email,
        fullName: email.split('@')[0],
        roles: ['ROLE_USER'],
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reputation: 5.0,
        phone: ''
      };
      responseData.user = basicUser;
    }

    console.log('🔑 Token JWT reçu:', token.substring(0, 50) + '...');
    console.log('👤 Utilisateur:', user.email);
    
    // STOCKAGE CRITIQUE : MÊMES CLÉS QUE PowerShell
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
    localStorage.setItem(STORAGE_KEYS.AUTH_TIMESTAMP, Date.now().toString());

    console.log('💾 Stockage réussi');
    console.log('📊 Vérification storage:');
    console.log('   authToken:', localStorage.getItem(STORAGE_KEYS.TOKEN)?.substring(0, 30) + '...');
    console.log('   user:', localStorage.getItem(STORAGE_KEYS.USER)?.substring(0, 50) + '...');
    
    console.groupEnd();
    return { token, user };

  } catch (error: any) {
    console.groupEnd();
    console.error('❌ Erreur connexion:', error);
    
    // Nettoyage en cas d'erreur
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    
    // Gestion des erreurs
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          throw new UserServiceError(
            'Email ou mot de passe incorrect',
            'UNAUTHORIZED',
            status
          );
        
        case 400:
          throw new UserServiceError(
            'Format de requête incorrect. Utilisez email/password',
            'BAD_REQUEST',
            status
          );
        
        default:
          throw new UserServiceError(
            data?.message || `Erreur serveur (${status})`,
            'HTTP_ERROR',
            status
          );
      }
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new UserServiceError('Impossible de se connecter au serveur', 'NETWORK_ERROR');
    }
    
    throw new UserServiceError(
      error.message || 'Erreur inconnue',
      'UNKNOWN_ERROR'
    );
  }
};

export const logoutUser = (): void => {
  console.group('👋 Déconnexion');
  
  try {
    // Appel API logout si disponible
    api.post('/auth/logout', {}).catch(() => {
      console.log('ℹ️ Endpoint /auth/logout non disponible');
    });
    
    // Nettoyage COMPLET
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('✅ Déconnexion réussie');
    
    // Redirection vers login
    setTimeout(() => {
      window.location.href = '/login';
    }, 500);
    
  } catch (error) {
    console.error('❌ Erreur déconnexion:', error);
  } finally {
    console.groupEnd();
  }
};

// ==============================
// GETTERS & CHECKERS
// ==============================

export const getCurrentUserFromStorage = (): User | null => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    return user && user.email ? user : null;
  } catch (error) {
    console.error('❌ Erreur parsing user:', error);
    return null;
  }
};

export const getCurrentUserFromAPI = async (): Promise<User | null> => {
  try {
    const response = await api.get<User>('/users/me');
    return response.data;
  } catch (error: any) {
    console.warn('⚠️ /users/me non disponible:', error.response?.status || error.message);
    return getCurrentUserFromStorage();
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const user = getCurrentUserFromStorage();
  const isAuth = localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === 'true';
  
  return !!(token && user && isAuth);
};

// ==============================
// REGISTRATION
// ==============================

const validateEmail = (email: string): boolean => 
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePhone = (phone: string): boolean => 
  /^212\d{9}$/.test(phone);  // Format: 212XXXXXXXXX

const validatePassword = (password: string): boolean => 
  password.length >= 6;

export const registerUser = async (data: RegisterUserData): Promise<User> => {
  try {
    console.group('📝 Inscription');
    
    // Validation
    if (!data.email || !validateEmail(data.email)) {
      throw new UserServiceError('Email invalide', 'VALIDATION_ERROR');
    }
    
    if (!data.phone || !validatePhone(data.phone)) {
      throw new UserServiceError('Téléphone invalide (format: 212XXXXXXXXX)', 'VALIDATION_ERROR');
    }
    
    if (!data.password || !validatePassword(data.password)) {
      throw new UserServiceError('Mot de passe doit contenir au moins 6 caractères', 'VALIDATION_ERROR');
    }
    
    const payload = {
      fullName: data.fullName.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      plainPassword: data.password,
      roles: ['ROLE_USER'],
      isVerified: false,
      reputation: 5.0,
    };
    
    console.log('📤 Envoi inscription...');
    const response = await api.post<User>('/users', payload);
    
    console.log('✅ Inscription réussie:', response.data.email);
    console.groupEnd();
    
    return response.data;
    
  } catch (error: any) {
    console.groupEnd();
    console.error('❌ Erreur inscription:', error);
    
    if (error.response?.data?.violations) {
      const messages = error.response.data.violations
        .map((v: any) => `${v.propertyPath}: ${v.message}`)
        .join(', ');
      throw new UserServiceError(messages, 'VALIDATION_ERROR', error.response.status);
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new UserServiceError('Impossible de se connecter au serveur', 'NETWORK_ERROR');
    }
    
    throw error;
  }
};

// ==============================
// ADDITIONAL FUNCTIONS
// ==============================

export const refreshUserData = async (): Promise<User | null> => {
  try {
    const user = await getCurrentUserFromAPI();
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      console.log('✅ Données utilisateur rafraîchies');
    }
    return user;
  } catch (error) {
    console.error('❌ Erreur rafraîchissement:', error);
    return null;
  }
};

export const getUsers = async (): Promise<{ users: User[]; total: number }> => {
  try {
    const response = await api.get<any>('/users');
    
    if (response.data?.member) {
      return { 
        users: response.data.member, 
        total: response.data.totalItems || response.data.member.length
      };
    }
    
    if (Array.isArray(response.data)) {
      return { users: response.data, total: response.data.length };
    }
    
    throw new UserServiceError('Structure de réponse inattendue', 'UNEXPECTED_STRUCTURE');
    
  } catch (error: any) {
    console.error('❌ Erreur récupération utilisateurs:', error);
    throw error;
  }
};

export const updateUser = async (id: number, data: UpdateUserData): Promise<User> => {
  try {
    const response = await api.put<User>(`/users/${id}`, data);
    return response.data;
  } catch (error: any) {
    console.error('❌ Erreur mise à jour utilisateur:', error);
    throw error;
  }
};

export const testAPIConnection = async (): Promise<{ connected: boolean; message: string }> => {
  try {
    await api.get('/', { timeout: 5000 });
    return { connected: true, message: 'Serveur accessible' };
  } catch (error) {
    return { connected: false, message: 'Serveur non accessible' };
  }
};

// ==============================
// DEBUG UTILITIES
// ==============================

export const debugAuth = (): void => {
  console.group('🔍 DEBUG AUTHENTIFICATION');
  
  console.log('📦 LOCALSTORAGE:');
  Object.values(STORAGE_KEYS).forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`  ${key}:`, value?.substring(0, 100) + (value && value.length > 100 ? '...' : ''));
  });
  
  const token = getAuthToken();
  console.log('🔑 TOKEN:', token ? `${token.substring(0, 50)}...` : 'NULL');
  console.log('✅ Authentifié:', isAuthenticated());
  console.log('👤 Utilisateur:', getCurrentUserFromStorage()?.email || 'NULL');
  
  console.groupEnd();
};

// Export pour console debug
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
}

// Export par défaut
export default {
  loginUser,
  logoutUser,
  getCurrentUserFromStorage,
  getCurrentUserFromAPI,
  getAuthToken,
  isAuthenticated,
  registerUser,
  refreshUserData,
  getUsers,
  updateUser,
  testAPIConnection,
  debugAuth,
  UserServiceError,
};