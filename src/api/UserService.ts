// src/api/UserService.ts - VERSION FINALE OPTIMISÉE
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
// CONSTANTS - OPTIMISÉES
// ==============================

const STORAGE_KEYS = {
  USER: 'user',
  TOKEN: 'jwt_token',
  REFRESH_TOKEN: 'refresh_token',
  EXPIRES_AT: 'expires_at',
  AUTH_TYPE: 'auth_type'
} as const;

const AUTH_CONFIG = {
  TOKEN_PREFIX: 'Bearer',
  LOGIN_ENDPOINT: '/login_check',
  ME_ENDPOINT: '/users/me',
  LOGOUT_ENDPOINT: '/auth/logout',
  TOKEN_TTL: 3600 // 1 heure en secondes
} as const;

// ==============================
// JWT UTILITIES - OPTIMISÉES
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
    console.warn('⚠️ Erreur décodage JWT:', error);
    return null;
  }
};

const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const buffer = 60; // 60 secondes de buffer
  return payload.exp <= (now + buffer);
};

// ==============================
// STORAGE MANAGEMENT - OPTIMISÉ
// ==============================

const saveAuthData = (token: string, user: User): void => {
  const payload = decodeJWT(token);
  
  // Calculer l'expiration
  const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + (AUTH_CONFIG.TOKEN_TTL * 1000);
  
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
  localStorage.setItem(STORAGE_KEYS.AUTH_TYPE, 'jwt');
  
  // Mettre à jour les headers axios
  api.defaults.headers.common['Authorization'] = `${AUTH_CONFIG.TOKEN_PREFIX} ${token}`;
};

const clearAuthData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  delete api.defaults.headers.common['Authorization'];
};

// ==============================
// AUTHENTIFICATION - VERSION OPTIMISÉE POUR VOTRE API
// ==============================

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  const startTime = Date.now();
  
  try {
    console.group('🔐 [UserService] Connexion utilisateur');
    
    // FORMAT VALIDÉ PAR TESTS : {"email": "...", "password": "..."}
    const requestData = {
      email: email.trim(),
      password: password
    };
    
    console.log('📤 Envoi à /login_check:', { email: requestData.email });
    
    const response = await api.post(AUTH_CONFIG.LOGIN_ENDPOINT, requestData);
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Connexion réussie en ${responseTime}ms`);
    
    const { token } = response.data;
    
    if (!token) {
      console.error('❌ Pas de token dans la réponse');
      throw new UserServiceError('Token non reçu du serveur', 'NO_TOKEN', 400);
    }
    
    console.log('🔑 Token JWT reçu:', token.substring(0, 30) + '...');
    
    // Décode le token pour extraire les infos utilisateur
    const payload = decodeJWT(token);
    
    // Construction de l'objet utilisateur
    const user: User = {
      id: payload?.id || 0,
      email: payload?.email || payload?.username || email,
      fullName: payload?.fullName || email.split('@')[0] || 'Utilisateur',
      roles: payload?.roles || ['ROLE_USER'],
      isVerified: payload?.isVerified || false,
      createdAt: payload?.createdAt || new Date().toISOString(),
      updatedAt: payload?.updatedAt || new Date().toISOString(),
      reputation: payload?.reputation || 5.0,
      phone: payload?.phone || '',
      walletAddress: payload?.walletAddress || '',
      isActive: payload?.isActive !== false
    };
    
    console.log('👤 Utilisateur construit:', user.email);
    
    // Sauvegarde des données
    saveAuthData(token, user);
    
    // Tentative de récupération des infos complètes via /api/me
    try {
      const meResponse = await api.get(AUTH_CONFIG.ME_ENDPOINT);
      if (meResponse.data?.user) {
        const apiUser = meResponse.data.user;
        // Fusionner les données
        Object.assign(user, apiUser);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        console.log('✅ Données utilisateur complétées via /api/me');
      }
    } catch (meError: any) {
      // Ignorer les erreurs 500 de /api/me (problème connu)
      if (meError.response?.status !== 500) {
        console.warn('⚠️ /api/me non accessible:', meError.message);
      }
    }
    
    console.groupEnd();
    return { token, user };
    
  } catch (error: any) {
    console.groupEnd();
    
    // Nettoyage en cas d'erreur
    clearAuthData();
    
    // Gestion détaillée des erreurs
    if (error.response) {
      const { status, data } = error.response;
      console.error('❌ Erreur serveur:', { status, data });
      
      switch (status) {
        case 400:
          throw new UserServiceError(
            'Format incorrect. Utilisez: {"email": "...", "password": "..."}',
            'BAD_FORMAT',
            400
          );
        case 401:
          throw new UserServiceError(
            'Email ou mot de passe incorrect',
            'INVALID_CREDENTIALS',
            401
          );
        case 500:
          throw new UserServiceError(
            'Erreur interne du serveur',
            'SERVER_ERROR',
            500
          );
        default:
          throw new UserServiceError(
            data?.message || `Erreur serveur (${status})`,
            'API_ERROR',
            status
          );
      }
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new UserServiceError(
        'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
        'NETWORK_ERROR'
      );
    }
    
    throw new UserServiceError(
      error.message || 'Erreur inconnue lors de la connexion',
      'UNKNOWN_ERROR'
    );
  }
};

export const logoutUser = (redirectToLogin: boolean = true): void => {
  console.group('👋 [UserService] Déconnexion');
  
  try {
    // Tentative de déconnexion côté serveur (silencieuse)
    api.post(AUTH_CONFIG.LOGOUT_ENDPOINT, {}).catch(() => {
      // Ignorer les erreurs
    });
    
    // Nettoyage local
    clearAuthData();
    
    console.log('✅ Déconnexion réussie');
    
    // Redirection optionnelle
    if (redirectToLogin && typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }
    
  } catch (error) {
    console.error('⚠️ Erreur lors de la déconnexion:', error);
  } finally {
    console.groupEnd();
  }
};

// ==============================
// GETTERS & CHECKERS - OPTIMISÉS
// ==============================

export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) return null;
    
    const user = JSON.parse(userStr);
    return user && typeof user === 'object' && user.email ? user : null;
  } catch (error) {
    console.warn('⚠️ Erreur parsing utilisateur:', error);
    return null;
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  
  if (!token) return false;
  
  // Vérifier l'expiration
  if (isTokenExpired(token)) {
    console.warn('⚠️ Token expiré, nettoyage...');
    clearAuthData();
    return false;
  }
  
  // Vérifier l'utilisateur
  const user = getCurrentUser();
  if (!user) return false;
  
  // Vérifier la cohérence avec le localStorage
  const storedExpiresAt = localStorage.getItem(STORAGE_KEYS.EXPIRES_AT);
  if (storedExpiresAt) {
    const expiresAt = parseInt(storedExpiresAt, 10);
    if (Date.now() > expiresAt) {
      clearAuthData();
      return false;
    }
  }
  
  return true;
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  if (!token) return {};
  
  return {
    'Authorization': `${AUTH_CONFIG.TOKEN_PREFIX} ${token}`,
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  };
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
    console.group('📝 [UserService] Inscription utilisateur');
    
    // Validation
    const errors: string[] = [];
    
    if (!data.fullName?.trim() || data.fullName.trim().length < 2) {
      errors.push('Le nom complet doit contenir au moins 2 caractères');
    }
    
    if (!validateEmail(data.email)) {
      errors.push('Email invalide');
    }
    
    if (!validatePhone(data.phone)) {
      errors.push('Téléphone invalide. Format: 212XXXXXXXXX');
    }
    
    if (!validatePassword(data.password)) {
      errors.push('Le mot de passe doit contenir au moins 6 caractères');
    }
    
    if (errors.length > 0) {
      throw new UserServiceError(errors.join('. '), 'VALIDATION_ERROR', 400);
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
      isActive: true
    };
    
    console.log('📤 Envoi inscription...');
    const response = await api.post<User>('/users', payload);
    
    const responseTime = Date.now() - startTime;
    console.log(`✅ Inscription réussie en ${responseTime}ms:`, response.data.email);
    
    // Connexion automatique après inscription
    try {
      const loginResult = await loginUser(data.email, data.password);
      console.log('🔐 Connexion automatique réussie après inscription');
    } catch (loginError) {
      console.warn('⚠️ Connexion automatique échouée, mais inscription réussie');
    }
    
    console.groupEnd();
    return response.data;
    
  } catch (error: any) {
    console.groupEnd();
    
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
// USER MANAGEMENT - OPTIMISÉ
// ==============================

export const refreshUserData = async (): Promise<User | null> => {
  try {
    console.log('🔄 [UserService] Rafraîchissement données utilisateur...');
    
    if (!isAuthenticated()) {
      console.warn('⚠️ Non authentifié, impossible de rafraîchir');
      return null;
    }
    
    // Essayer /api/me d'abord
    try {
      const response = await api.get(AUTH_CONFIG.ME_ENDPOINT);
      if (response.data?.user) {
        const user = response.data.user;
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
        console.log('✅ Données utilisateur rafraîchies depuis /api/me');
        return user;
      }
    } catch (meError: any) {
      if (meError.response?.status !== 500) {
        console.warn('⚠️ /api/me inaccessible:', meError.message);
      }
    }
    
    // Sinon, utiliser les données actuelles
    const currentUser = getCurrentUser();
    if (currentUser) {
      console.log('ℹ️ Utilisation des données utilisateur actuelles');
      return currentUser;
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Erreur rafraîchissement:', error);
    return null;
  }
};

export const updateUserProfile = async (userId: number, data: UpdateUserData): Promise<User> => {
  try {
    console.log(`📝 [UserService] Mise à jour utilisateur ${userId}`);
    
    // Validation
    if (data.email && !validateEmail(data.email)) {
      throw new UserServiceError('Email invalide', 'VALIDATION_ERROR', 400);
    }
    
    if (data.phone && !validatePhone(data.phone)) {
      throw new UserServiceError('Téléphone invalide. Format: 212XXXXXXXXX', 'VALIDATION_ERROR', 400);
    }
    
    const response = await api.put<User>(`/users/${userId}`, data);
    
    console.log(`✅ Utilisateur ${userId} mis à jour`);
    
    // Mettre à jour le storage si c'est l'utilisateur courant
    const currentUser = getCurrentUser();
    if (currentUser?.id === userId) {
      const updatedUser = { ...currentUser, ...response.data };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(updatedUser));
    }
    
    return response.data;
    
  } catch (error: any) {
    console.error(`❌ Erreur mise à jour utilisateur ${userId}:`, error);
    throw error;
  }
};

export const getUsersList = async (page: number = 1, limit: number = 30): Promise<{ users: User[]; total: number }> => {
  try {
    console.log(`🔍 [UserService] Récupération utilisateurs page ${page}...`);
    
    const response = await api.get<any>(`/users?page=${page}&itemsPerPage=${limit}`);
    
    // Gestion format Hydra (API Platform)
    if (response.data?.['hydra:member']) {
      return {
        users: response.data['hydra:member'],
        total: response.data['hydra:totalItems'] || 0
      };
    }
    
    // Format simple array
    if (Array.isArray(response.data)) {
      return {
        users: response.data,
        total: response.data.length
      };
    }
    
    throw new UserServiceError('Format de réponse inattendu', 'UNEXPECTED_FORMAT', 500);
    
  } catch (error: any) {
    console.error('❌ Erreur récupération utilisateurs:', error);
    throw error;
  }
};

export const getUserById = async (id: number): Promise<User> => {
  try {
    console.log(`🔍 [UserService] Récupération utilisateur ${id}...`);
    
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
    
  } catch (error: any) {
    console.error(`❌ Erreur récupération utilisateur ${id}:`, error);
    throw error;
  }
};

// ==============================
// UTILITIES & DEBUG
// ==============================

export const testAPIConnection = async (): Promise<{ 
  connected: boolean; 
  message: string;
  responseTime?: number;
}> => {
  const startTime = Date.now();
  
  try {
    const response = await api.get('/', { 
      timeout: 8000,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      connected: true,
      message: `API accessible (${response.status})`,
      responseTime
    };
    
  } catch (error: any) {
    return {
      connected: false,
      message: `API inaccessible: ${error.message}`,
      responseTime: Date.now() - startTime
    };
  }
};

export const debugAuth = (): void => {
  console.group('🔍 [UserService] DEBUG AUTHENTIFICATION');
  
  // Stockage local
  console.log('📦 LOCALSTORAGE:');
  Object.values(STORAGE_KEYS).forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`  ${key}:`, value ? 
      (key === STORAGE_KEYS.TOKEN ? 
        `${value.substring(0, 30)}...` : 
        value.substring(0, 100) + (value.length > 100 ? '...' : '')
      ) : 'NULL'
    );
  });
  
  // État actuel
  console.log('📊 ÉTAT:');
  console.log('  Authentifié:', isAuthenticated());
  console.log('  Utilisateur:', getCurrentUser()?.email || 'NULL');
  
  // Token info
  const token = getAuthToken();
  if (token) {
    const payload = decodeJWT(token);
    console.log('🔑 TOKEN INFO:');
    console.log('  Expiré:', isTokenExpired(token));
    console.log('  Payload:', {
      email: payload?.email || payload?.username,
      roles: payload?.roles,
      exp: payload?.exp ? new Date(payload.exp * 1000).toLocaleString() : 'Non défini'
    });
  }
  
  console.groupEnd();
};

export const forceLogout = (): void => {
  console.log('🚨 [UserService] Déconnexion forcée');
  clearAuthData();
  
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

// ==============================
// INITIALIZATION & AUTO-SETUP
// ==============================

// Auto-configuration axios avec le token existant
const initializeAuth = (): void => {
  const token = getAuthToken();
  if (token && !isTokenExpired(token)) {
    api.defaults.headers.common['Authorization'] = `${AUTH_CONFIG.TOKEN_PREFIX} ${token}`;
    console.log('🔧 [UserService] Token restauré dans axios');
  }
};

// Initialisation au chargement
if (typeof window !== 'undefined') {
  initializeAuth();
  
  // Exposer des fonctions pour le debug
  (window as any).debugAuth = debugAuth;
  (window as any).forceLogout = forceLogout;
  
  console.log('🚀 UserService initialisé. Commandes disponibles:');
  console.log('   - debugAuth(): Affiche l\'état d\'authentification');
  console.log('   - forceLogout(): Force la déconnexion et redirection');
}

// ==============================
// EXPORT PAR DÉFAUT
// ==============================

export default {
  // Authentication
  loginUser,
  logoutUser,
  isAuthenticated,
  getCurrentUser,
  getAuthToken,
  getAuthHeaders,
  
  // Registration
  registerUser,
  
  // User Management
  refreshUserData,
  updateUserProfile,
  getUsersList,
  getUserById,
  
  // Utilities
  testAPIConnection,
  debugAuth,
  forceLogout,
  clearAuthData: () => clearAuthData(),
  
  // Error class
  UserServiceError
};