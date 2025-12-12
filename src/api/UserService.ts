// src/api/UserService.ts - VERSION FINALE COMPLÈTE ET OPTIMISÉE
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
// JWT UTILITIES
// ==============================

const decodeJWT = (token: string): any => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (error) {
    console.error('❌ Erreur décodage JWT:', error);
    return null;
  }
};

// ==============================
// AUTHENTIFICATION - OPTIMISÉE
// ==============================

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  const startTime = Date.now();
  
  try {
    console.group('🔐 Connexion utilisateur');
    console.log('📤 Envoi à /login_check');
    console.log('👤 Email:', email);

    // FORMAT CORRECT : email/password (testé et fonctionnel)
    const response = await api.post('/login_check', {
      email: email,      // ← FORMAT VALIDÉ PAR TESTS
      password: password
    });

    const responseTime = Date.now() - startTime;
    console.log(`✅ Connexion réussie en ${responseTime}ms`);
    
    // Analyse de la réponse
    console.log('📥 Réponse reçue:', response.data);
    
    const responseData = response.data;
    const token = responseData.token;
    let user = responseData.user;
    
    if (!token) {
      console.error('❌ Pas de token dans la réponse!');
      throw new UserServiceError('Token non reçu du serveur', 'NO_TOKEN');
    }

    console.log('🔑 Token JWT reçu:', token.substring(0, 50) + '...');
    
    // Si pas d'utilisateur dans la réponse, créez-en un à partir du token
    if (!user) {
      console.log('⚠️ Création utilisateur à partir du token');
      const payload = decodeJWT(token);
      user = {
        id: payload?.id || 0,
        email: payload?.email || payload?.username || email,
        fullName: payload?.fullName || email.split('@')[0],
        roles: payload?.roles || ['ROLE_USER'],
        isVerified: payload?.isVerified || false,
        createdAt: payload?.createdAt || new Date().toISOString(),
        updatedAt: payload?.updatedAt || new Date().toISOString(),
        reputation: payload?.reputation || 5.0,
        phone: payload?.phone || ''
      };
    }

    console.log('👤 Utilisateur:', user.email);
    
    // Stockage
    localStorage.setItem(STORAGE_KEYS.TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
    localStorage.setItem(STORAGE_KEYS.AUTH_TIMESTAMP, Date.now().toString());

    console.log('💾 Stockage réussi');
    console.groupEnd();
    
    return { token, user };

  } catch (error: any) {
    console.groupEnd();
    console.error('❌ Erreur connexion:', error);
    
    // Log détaillé
    if (error.response) {
      console.error('📊 Détails erreur:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url,
        method: error.config?.method,
        requestData: error.config?.data ? JSON.parse(error.config.data) : null
      });
    }
    
    // Nettoyage
    localStorage.removeItem(STORAGE_KEYS.TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    localStorage.removeItem(STORAGE_KEYS.IS_AUTHENTICATED);
    
    // Gestion erreurs spécifiques
    if (error.response?.status === 401) {
      throw new UserServiceError('Email ou mot de passe incorrect', 'UNAUTHORIZED', 401);
    }
    
    if (error.response?.status === 400) {
      throw new UserServiceError(
        'Format de requête incorrect. Utilisez email/password',
        'BAD_REQUEST',
        400
      );
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new UserServiceError('Impossible de se connecter au serveur', 'NETWORK_ERROR');
    }
    
    throw new UserServiceError(
      error.response?.data?.message || error.message || 'Erreur inconnue',
      'UNKNOWN_ERROR',
      error.response?.status
    );
  }
};

export const logoutUser = (): void => {
  console.group('👋 Déconnexion');
  
  try {
    // Tentative de déconnexion API (silencieuse)
    api.post('/auth/logout', {}).catch(() => {
      // Ignorer les erreurs, c'est normal
    });
    
    // Nettoyage local
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('✅ Déconnexion réussie');
    
    // Redirection après un court délai
    setTimeout(() => {
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }, 300);
    
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion:', error);
  } finally {
    console.groupEnd();
  }
};

// ==============================
// GETTERS & CHECKERS - OPTIMISÉS
// ==============================

export const getCurrentUserFromStorage = (): User | null => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    return user && user.email ? user : null;
  } catch (error) {
    console.error('❌ Erreur parsing utilisateur:', error);
    return null;
  }
};

export const getCurrentUserFromAPI = async (): Promise<User | null> => {
  try {
    console.log('🔍 Tentative récupération via /users/me...');
    const response = await api.get<User>('/users/me', {
      timeout: 5000,
      validateStatus: (status) => status < 500 // Ne pas throw sur 401/404
    });
    
    if (response.status === 200) {
      console.log('✅ Données utilisateur récupérées depuis API');
      return response.data;
    }
    
    // Si erreur 401/404, utiliser le storage
    console.warn(`⚠️ /users/me retourne ${response.status}, utilisation du storage`);
    return getCurrentUserFromStorage();
    
  } catch (error: any) {
    // ERREUR 500 : problème eager loading - utiliser le storage
    console.warn('⚠️ /users/me inaccessible (erreur eager loading), utilisation du storage');
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
  
  const authenticated = !!(token && user && isAuth);
  
  console.log('🔍 Vérification authentification:', {
    hasToken: !!token,
    hasUser: !!user,
    isAuthFlag: isAuth,
    authenticated
  });
  
  return authenticated;
};

// ==============================
// REGISTRATION - OPTIMISÉE
// ==============================

const validateEmail = (email: string): boolean => 
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePhone = (phone: string): boolean => 
  /^212\d{9}$/.test(phone);  // Format marocain

const validatePassword = (password: string): boolean => 
  password.length >= 6;

export const registerUser = async (data: RegisterUserData): Promise<User> => {
  const startTime = Date.now();
  
  try {
    console.group('📝 Inscription utilisateur');
    console.log('👤 Email:', data.email);
    
    // Validation
    const errors: string[] = [];
    
    if (!data.fullName || data.fullName.trim().length < 2) {
      errors.push('Le nom complet doit contenir au moins 2 caractères');
    }
    
    if (!data.email || !validateEmail(data.email)) {
      errors.push('Email invalide');
    }
    
    if (!data.phone || !validatePhone(data.phone)) {
      errors.push('Téléphone invalide. Format: 212XXXXXXXXX');
    }
    
    if (!data.password || !validatePassword(data.password)) {
      errors.push('Le mot de passe doit contenir au moins 6 caractères');
    }
    
    if (errors.length > 0) {
      throw new UserServiceError(errors.join('. '), 'VALIDATION_ERROR');
    }
    
    // Préparation des données
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
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Inscription réussie en ${responseTime}ms:`, response.data.email);
    console.groupEnd();
    
    return response.data;
    
  } catch (error: any) {
    console.groupEnd();
    console.error('❌ Erreur inscription:', error);
    
    if (error.response?.data?.violations) {
      const messages = error.response.data.violations
        .map((v: any) => `${v.propertyPath}: ${v.message}`)
        .join('. ');
      throw new UserServiceError(messages, 'VALIDATION_ERROR', error.response.status);
    }
    
    if (error.response?.data?.['hydra:description']) {
      throw new UserServiceError(
        error.response.data['hydra:description'],
        'API_ERROR',
        error.response.status
      );
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
    console.log('🔄 Rafraîchissement données utilisateur...');
    const user = await getCurrentUserFromAPI();
    
    if (user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      console.log('✅ Données utilisateur rafraîchies:', user.email);
    }
    
    return user;
  } catch (error) {
    console.error('❌ Erreur rafraîchissement:', error);
    return null;
  }
};

export const getUsers = async (page: number = 1, limit: number = 30): Promise<{ users: User[]; total: number }> => {
  try {
    console.log(`🔍 Récupération utilisateurs page ${page}...`);
    
    const response = await api.get<any>(`/users?page=${page}&itemsPerPage=${limit}`);
    
    // Gestion format Hydra (API Platform)
    if (response.data?.['hydra:member']) {
      return {
        users: response.data['hydra:member'],
        total: response.data['hydra:totalItems'] || response.data['hydra:member'].length
      };
    }
    
    // Format simple array
    if (Array.isArray(response.data)) {
      return {
        users: response.data,
        total: response.data.length
      };
    }
    
    throw new UserServiceError('Format de réponse inattendu', 'UNEXPECTED_FORMAT');
    
  } catch (error: any) {
    console.error('❌ Erreur récupération utilisateurs:', error);
    throw error;
  }
};

export const getUserById = async (id: number): Promise<User> => {
  try {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Erreur récupération utilisateur ${id}:`, error);
    throw error;
  }
};

export const updateUser = async (id: number, data: UpdateUserData): Promise<User> => {
  try {
    // Validation optionnelle
    if (data.email && !validateEmail(data.email)) {
      throw new UserServiceError('Email invalide', 'VALIDATION_ERROR');
    }
    
    if (data.phone && !validatePhone(data.phone)) {
      throw new UserServiceError('Téléphone invalide. Format: 212XXXXXXXXX', 'VALIDATION_ERROR');
    }
    
    const response = await api.put<User>(`/users/${id}`, data);
    console.log(`✅ Utilisateur ${id} mis à jour`);
    
    // Mettre à jour le storage si c'est l'utilisateur courant
    const currentUser = getCurrentUserFromStorage();
    if (currentUser?.id === id) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(response.data));
    }
    
    return response.data;
    
  } catch (error: any) {
    console.error(`❌ Erreur mise à jour utilisateur ${id}:`, error);
    throw error;
  }
};

export const testAPIConnection = async (): Promise<{ connected: boolean; message: string }> => {
  try {
    const response = await api.get('/', { timeout: 5000 });
    return {
      connected: true,
      message: `API accessible (${response.status})`
    };
  } catch (error: any) {
    return {
      connected: false,
      message: `API inaccessible: ${error.message}`
    };
  }
};

// ==============================
// DEBUG & UTILITIES
// ==============================

export const debugAuth = (): void => {
  console.group('🔍 DEBUG AUTHENTIFICATION COMPLET');
  
  // 1. Stockage local
  console.log('📦 LOCALSTORAGE:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.includes('auth') || key === 'user') {
      const value = localStorage.getItem(key);
      console.log(`  ${key}:`, value?.substring(0, 100) + (value && value.length > 100 ? '...' : ''));
    }
  }
  
  // 2. État actuel
  const token = getAuthToken();
  console.log('🔑 TOKEN:', token ? `${token.substring(0, 50)}...` : 'NULL');
  console.log('✅ Authentifié:', isAuthenticated());
  console.log('👤 Utilisateur:', getCurrentUserFromStorage()?.email || 'NULL');
  
  // 3. Décodage JWT
  if (token) {
    try {
      const payload = decodeJWT(token);
      console.log('📄 Payload JWT:', {
        email: payload?.email || payload?.username,
        roles: payload?.roles,
        exp: payload?.exp ? new Date(payload.exp * 1000).toLocaleString() : null,
        iat: payload?.iat ? new Date(payload.iat * 1000).toLocaleString() : null
      });
    } catch (e) {
      console.log('⚠️ Token non déchiffrable');
    }
  }
  
  console.groupEnd();
};

export const clearAuthData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  console.log('🧹 Données d\'authentification nettoyées');
};

// ==============================
// INITIALIZATION & EXPORTS
// ==============================

// Export pour debug dans la console
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
  (window as any).clearAuthData = clearAuthData;
  console.log('🚀 UserService initialisé. Commandes disponibles:');
  console.log('   - debugAuth(): Affiche l\'état d\'authentification');
  console.log('   - clearAuthData(): Nettoie les données d\'authentification');
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
  getUserById,
  updateUser,
  testAPIConnection,
  debugAuth,
  clearAuthData,
  UserServiceError,
};