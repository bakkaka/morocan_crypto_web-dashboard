// src/api/UserService.ts - VERSION COMPLÈTE
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
  avatarUrl?: string;
}

export interface AuthStorage {
  user: User;
  token: string;
  expiresAt: number;
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
  AUTH_DATA: 'mc_auth_data',
  LEGACY_USER: 'currentUser',
  LEGACY_TOKEN: 'authToken',
} as const;

// IMPORTANT: Pas de /api au début car déjà dans baseURL d'axios
const API_ENDPOINTS = {
  LOGIN: '/login_check',
  REGISTER: '/users/register',
  LOGOUT: '/auth/logout',
  VALIDATE: '/auth/verify',
  CURRENT_USER: '/auth/me',
} as const;

const TOKEN_CONFIG = {
  PREFIX: 'Bearer',
  EXPIRY_BUFFER: 300000, // 5 minutes
} as const;

// ==============================
// STORAGE MANAGEMENT
// ==============================

const saveAuthToStorage = (user: User, token: string): void => {
  try {
    const expiresAt = Date.now() + 3600000; // 1 heure
    
    const authData: AuthStorage = {
      user: {
        ...user,
        id: user.id || generateStableUserId(user.email)
      },
      token,
      expiresAt
    };
    
    // Stockage principal
    localStorage.setItem(STORAGE_KEYS.AUTH_DATA, JSON.stringify(authData));
    
    // Compatibilité legacy
    localStorage.setItem(STORAGE_KEYS.LEGACY_USER, JSON.stringify(authData.user));
    localStorage.setItem(STORAGE_KEYS.LEGACY_TOKEN, token);
    
    // Définir le header par défaut
    api.defaults.headers.common['Authorization'] = `${TOKEN_CONFIG.PREFIX} ${token}`;
    
  } catch (error) {
    console.error('Erreur sauvegarde storage:', error);
  }
};

const loadAuthFromStorage = (): AuthStorage | null => {
  try {
    // Essayer le stockage principal
    const authDataStr = localStorage.getItem(STORAGE_KEYS.AUTH_DATA);
    if (authDataStr) {
      const authData: AuthStorage = JSON.parse(authDataStr);
      
      if (authData.user && authData.token && authData.expiresAt) {
        return authData;
      }
    }
    
    // Fallback: compatibilité legacy
    const userStr = localStorage.getItem(STORAGE_KEYS.LEGACY_USER);
    const token = localStorage.getItem(STORAGE_KEYS.LEGACY_TOKEN);
    
    if (userStr && token) {
      const user: User = JSON.parse(userStr);
      const expiresAt = Date.now() + 3600000;
      
      const authData: AuthStorage = { user, token, expiresAt };
      saveAuthToStorage(user, token); // Migrer vers nouveau format
      
      return authData;
    }
    
    return null;
    
  } catch (error) {
    console.error('Erreur chargement storage:', error);
    return null;
  }
};

export const clearAuthStorage = (): void => {
  try {
    // Nettoyer les clés principales
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    // Nettoyer les anciennes clés
    const legacyKeys = [
      'user', 'jwt_token', 'token', 'token_expiry',
      'refresh_token', 'auth_state', 'isAuthenticated'
    ];
    
    legacyKeys.forEach(key => localStorage.removeItem(key));
    
    // Supprimer le header
    delete api.defaults.headers.common['Authorization'];
    
  } catch (error) {
    console.error('Erreur nettoyage storage:', error);
  }
};

// ==============================
// JWT UTILITIES
// ==============================

const decodeJWT = (token: string): any => {
  try {
    if (!token || typeof token !== 'string') return null;
    
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    
    try {
      const base64Url = parts[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      
      const padLength = 4 - (base64.length % 4);
      const paddedBase64 = padLength < 4 ? base64 + '='.repeat(padLength) : base64;
      
      const jsonPayload = decodeURIComponent(
        atob(paddedBase64)
          .split('')
          .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
    
  } catch (error) {
    return null;
  }
};

const extractInfoFromJWT = (token: string): { email: string; possibleId?: number } => {
  const payload = decodeJWT(token);
  
  if (!payload) {
    return { email: '' };
  }
  
  const email = payload.email || payload.username || '';
  
  let possibleId: number | undefined;
  const idKeys = ['id', 'userId', 'user_id', 'sub'];
  
  for (const key of idKeys) {
    const value = payload[key];
    if (value) {
      const num = typeof value === 'string' ? parseInt(value, 10) : value;
      if (!isNaN(num) && num > 0) {
        possibleId = num;
        break;
      }
    }
  }
  
  return { email, possibleId };
};

const isTokenValid = (token: string): boolean => {
  try {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return false;
    
    const now = Math.floor(Date.now() / 1000);
    return payload.exp > now;
    
  } catch {
    return false;
  }
};

// ==============================
// USER UTILITIES
// ==============================

const generateStableUserId = (email: string): number => {
  if (!email) return 100000;
  
  let hash = 0;
  for (let i = 0; i < email.length; i++) {
    hash = ((hash << 5) - hash) + email.charCodeAt(i);
    hash |= 0;
  }
  
  return 100000 + (Math.abs(hash) % 100000);
};

const createUserObject = (email: string, token: string, jwtId?: number): User => {
  const payload = decodeJWT(token);
  const userId = jwtId || generateStableUserId(email);
  
  return {
    id: userId,
    email: email,
    fullName: payload?.fullName || email.split('@')[0] || 'Utilisateur',
    roles: Array.isArray(payload?.roles) ? payload.roles : ['ROLE_USER'],
    isVerified: payload?.isVerified || false,
    createdAt: payload?.createdAt || new Date().toISOString(),
    updatedAt: payload?.updatedAt || new Date().toISOString(),
    reputation: payload?.reputation || 5.0,
    phone: payload?.phone || '',
    walletAddress: payload?.walletAddress || '',
    isActive: payload?.isActive !== false,
  };
};

// ==============================
// API USER FETCHING
// ==============================

const tryFetchUserFromAPI = async (token: string): Promise<User | null> => {
  const endpoints = [
    '/auth/me',           // Endpoint principal (testé)
    '/users/me',          // Fallback 1
    '/user/profile',      // Fallback 2
    '/profile',           // Fallback 3
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint, {
        headers: { 'Authorization': `${TOKEN_CONFIG.PREFIX} ${token}` },
        timeout: 8000,
      });
      
      if (response.data) {
        const apiData = response.data.user || response.data;
        
        if (apiData && apiData.email) {
          console.log(`✅ ${endpoint} - Récupération réussie`);
          
          const userData = {
            ...createUserObject(apiData.email, token, apiData.id),
            ...apiData
          };
          
          // S'assurer d'un ID valide
          if (!userData.id || userData.id >= 100000) {
            userData.id = apiData.id || generateStableUserId(apiData.email);
          }
          
          return userData;
        }
      }
    } catch (error: any) {
      const status = error.response?.status;
      
      if (status === 404) {
        continue; // Essaye le prochain endpoint
      }
      
      if (status === 401) {
        return null; // Token invalide
      }
      
      // Pour les autres erreurs, continue
      if (error.code === 'ECONNABORTED') {
        continue;
      }
    }
  }
  
  console.log('⚠️ Aucun endpoint utilisateur disponible');
  return null;
};

// ==============================
// AUTHENTIFICATION
// ==============================

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    console.log('🔑 Connexion:', email);
    
    const credentials = {
      email: email.trim().toLowerCase(),
      password: password,
    };
    
    // Appel API login
    const response = await api.post(API_ENDPOINTS.LOGIN, credentials, {
      timeout: 15000,
    });
    
    const token = response.data.token || response.data.access_token;
    
    if (!token) {
      throw new UserServiceError('Token non reçu', 'NO_TOKEN', 400);
    }
    
    if (!isTokenValid(token)) {
      throw new UserServiceError('Token invalide', 'INVALID_TOKEN', 400);
    
    }
    
    // Récupérer les infos du JWT
    const { email: jwtEmail, possibleId } = extractInfoFromJWT(token);
    const userEmail = jwtEmail || email;
    
    // Essayer de récupérer l'utilisateur depuis l'API
    let user = await tryFetchUserFromAPI(token);
    
    // Fallback: créer depuis JWT
    if (!user) {
      console.log('🛠️ Création utilisateur depuis JWT');
      user = createUserObject(userEmail, token, possibleId);
    }
    
    // Sauvegarder
    saveAuthToStorage(user, token);
    
    console.log('✅ Connexion réussie');
    
    return { token, user };
    
  } catch (error: any) {
    console.error('❌ Erreur connexion:', error);
    
    clearAuthStorage();
    
    // Gestion des erreurs spécifiques
    if (error.response?.status === 401) {
      throw new UserServiceError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS', 401);
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new UserServiceError('Erreur de connexion au serveur', 'NETWORK_ERROR', 0);
    }
    
    // Relancer l'erreur
    if (error instanceof UserServiceError) {
      throw error;
    }
    
    throw new UserServiceError(
      error.response?.data?.message || 'Erreur lors de la connexion',
      'LOGIN_ERROR',
      error.response?.status
    );
  }
};

export const logoutUser = (): void => {
  try {
    // Notifier l'API (optionnel)
    api.post(API_ENDPOINTS.LOGOUT, {}).catch(() => {});
  } finally {
    clearAuthStorage();
    
    // Redirection
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
};

export const registerUser = async (data: RegisterUserData): Promise<User> => {
  try {
    // Validation
    const errors: string[] = [];
    
    if (!data.fullName?.trim() || data.fullName.trim().length < 2) {
      errors.push('Nom complet requis (min. 2 caractères)');
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Email invalide');
    }
    
    if (!/^212\d{9}$/.test(data.phone)) {
      errors.push('Téléphone invalide (212XXXXXXXXX)');
    }
    
    if (!data.password || data.password.length < 6) {
      errors.push('Mot de passe requis (min. 6 caractères)');
    }
    
    if (errors.length > 0) {
      throw new UserServiceError(errors.join('. '), 'VALIDATION_ERROR', 400);
    }
    
    const payload = {
      fullName: data.fullName.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      plainPassword: data.password,
      roles: ['ROLE_USER'],
      isVerified: false,
      reputation: 5.0,
      isActive: true,
    };
    
    const response = await api.post(API_ENDPOINTS.REGISTER, payload, {
      timeout: 15000,
    });
    
    console.log('✅ Inscription réussie');
    
    // Auto-connexion
    try {
      await loginUser(data.email, data.password);
    } catch {
      console.log('Auto-connexion échouée, utilisateur doit se connecter manuellement');
    }
    
    return response.data;
    
  } catch (error: any) {
    console.error('❌ Erreur inscription:', error);
    
    if (error.response?.data?.violations) {
      const messages = error.response.data.violations
        .map((v: any) => `${v.propertyPath}: ${v.message}`)
        .join('. ');
      throw new UserServiceError(messages, 'VALIDATION_ERROR', error.response.status);
    }
    
    if (error.response?.status === 409) {
      throw new UserServiceError('Email déjà utilisé', 'EMAIL_EXISTS', 409);
    }
    
    throw error;
  }
};

// ==============================
// STATE MANAGEMENT
// ==============================

export const getCurrentUser = (): User | null => {
  try {
    const authData = loadAuthFromStorage();
    
    if (!authData) return null;
    
    // Vérifier le token
    if (!isTokenValid(authData.token)) {
      clearAuthStorage();
      return null;
    }
    
    // Vérifier l'expiration
    if (Date.now() > authData.expiresAt) {
      clearAuthStorage();
      return null;
    }
    
    return authData.user;
    
  } catch (error) {
    console.error('Erreur getCurrentUser:', error);
    return null;
  }
};

export const getAuthToken = (): string | null => {
  try {
    const authData = loadAuthFromStorage();
    
    if (!authData || !isTokenValid(authData.token)) {
      return null;
    }
    
    return authData.token;
    
  } catch (error) {
    console.error('Erreur getAuthToken:', error);
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  try {
    const user = getCurrentUser();
    const token = getAuthToken();
    return !!(user && token);
    
  } catch (error) {
    console.error('Erreur isAuthenticated:', error);
    return false;
  }
};

// ==============================
// ID MANAGEMENT FUNCTIONS (NÉCESSAIRES POUR AuthContext)
// ==============================

export const ensureValidUserId = async (): Promise<number> => {
  try {
    const user = getCurrentUser();
    const token = getAuthToken();
    
    if (!user || !token) {
      throw new Error('Utilisateur non authentifié');
    }
    
    // Si l'ID est valide (pas généré), le retourner
    if (user.id && user.id < 100000) {
      return user.id;
    }
    
    // Sinon, essayer de récupérer un ID valide depuis l'API
    const apiUser = await tryFetchUserFromAPI(token);
    
    if (apiUser && apiUser.id && apiUser.id < 100000) {
      saveAuthToStorage(apiUser, token);
      return apiUser.id;
    }
    
    // Fallback: retourner l'ID généré
    return user.id;
    
  } catch (error) {
    console.error('Erreur ensureValidUserId:', error);
    
    const user = getCurrentUser();
    return user?.id || generateStableUserId('unknown@email.com');
  }
};

export const autoFixUserId = async (): Promise<boolean> => {
  try {
    const oldUser = getCurrentUser();
    const newId = await ensureValidUserId();
    
    return oldUser?.id !== newId;
    
  } catch (error) {
    console.error('Erreur autoFixUserId:', error);
    return false;
  }
};

export const repairAuthState = async (): Promise<boolean> => {
  try {
    const user = getCurrentUser();
    const token = getAuthToken();
    
    if (!user || !token) {
      return false;
    }
    
    // Si l'ID est généré, essayer de le remplacer par un vrai ID
    if (user.id >= 100000) {
      const apiUser = await tryFetchUserFromAPI(token);
      
      if (apiUser && apiUser.id && apiUser.id < 100000) {
        saveAuthToStorage(apiUser, token);
        return true;
      }
    }
    
    return false;
    
  } catch (error) {
    console.error('Erreur repairAuthState:', error);
    return false;
  }
};

// ==============================
// USER MANAGEMENT
// ==============================

export const refreshCurrentUser = async (): Promise<User | null> => {
  try {
    const token = getAuthToken();
    
    if (!token) return null;
    
    const apiUser = await tryFetchUserFromAPI(token);
    
    if (apiUser) {
      saveAuthToStorage(apiUser, token);
      return apiUser;
    }
    
    return getCurrentUser();
    
  } catch (error) {
    console.error('Erreur refreshCurrentUser:', error);
    return null;
  }
};

export const refreshUserData = refreshCurrentUser;

export const validateToken = async (): Promise<boolean> => {
  try {
    const token = getAuthToken();
    
    if (!token) return false;
    
    if (!isTokenValid(token)) return false;
    
    // Tenter validation API
    try {
      await api.get(API_ENDPOINTS.VALIDATE, {
        headers: { 'Authorization': `${TOKEN_CONFIG.PREFIX} ${token}` },
        timeout: 10000,
      });
      return true;
    } catch {
      return isTokenValid(token); // Fallback JWT
    }
    
  } catch (error) {
    console.error('Erreur validateToken:', error);
    return false;
  }
};

export const updateUserProfile = async (userId: number, data: UpdateUserData): Promise<User> => {
  try {
    const response = await api.put(`/users/${userId}`, data);
    
    // Mettre à jour le storage si utilisateur courant
    const currentUser = getCurrentUser();
    if (currentUser?.id === userId) {
      const updatedUser = { ...currentUser, ...response.data };
      const token = getAuthToken();
      if (token) {
        saveAuthToStorage(updatedUser, token);
      }
    }
    
    return response.data;
    
  } catch (error: any) {
    console.error(`Erreur update user ${userId}:`, error);
    throw error;
  }
};

export const updateUser = updateUserProfile;

export const getUsersList = async (page: number = 1, limit: number = 30) => {
  try {
    const response = await api.get(`/users?page=${page}&itemsPerPage=${limit}`);
    
    if (response.data?.['hydra:member']) {
      return {
        users: response.data['hydra:member'],
        total: response.data['hydra:totalItems'] || 0
      };
    }
    
    if (Array.isArray(response.data)) {
      return {
        users: response.data,
        total: response.data.length
      };
    }
    
    throw new UserServiceError('Format de réponse inattendu', 'UNEXPECTED_FORMAT', 500);
    
  } catch (error: any) {
    console.error('Erreur getUsersList:', error);
    throw error;
  }
};

export const getUsers = getUsersList;

export const getUserById = async (id: number): Promise<User> => {
  try {
    const response = await api.get(`/users/${id}`);
    return response.data;
  } catch (error: any) {
    console.error(`Erreur getUserById ${id}:`, error);
    throw error;
  }
};

// ==============================
// ADMIN FUNCTIONS
// ==============================

export const promoteToAdmin = async (userId: number): Promise<User> => {
  try {
    const response = await api.patch(`/users/${userId}/promote`, {
      roles: ['ROLE_ADMIN', 'ROLE_USER']
    });
    return response.data;
  } catch (error: any) {
    console.error(`Erreur promoteToAdmin ${userId}:`, error);
    throw error;
  }
};

export const demoteFromAdmin = async (userId: number): Promise<User> => {
  try {
    const response = await api.patch(`/users/${userId}/demote`, {
      roles: ['ROLE_USER']
    });
    return response.data;
  } catch (error: any) {
    console.error(`Erreur demoteFromAdmin ${userId}:`, error);
    throw error;
  }
};

export const deleteUser = async (userId: number): Promise<void> => {
  try {
    await api.delete(`/users/${userId}`);
  } catch (error: any) {
    console.error(`Erreur deleteUser ${userId}:`, error);
    throw error;
  }
};

export const activateUser = async (userId: number): Promise<User> => {
  try {
    const response = await api.patch(`/users/${userId}/activate`, {
      isActive: true
    });
    return response.data;
  } catch (error: any) {
    console.error(`Erreur activateUser ${userId}:`, error);
    throw error;
  }
};

export const deactivateUser = async (userId: number): Promise<User> => {
  try {
    const response = await api.patch(`/users/${userId}/deactivate`, {
      isActive: false
    });
    return response.data;
  } catch (error: any) {
    console.error(`Erreur deactivateUser ${userId}:`, error);
    throw error;
  }
};

// ==============================
// UTILITIES
// ==============================

export const testAPIConnection = async () => {
  const startTime = Date.now();
  
  try {
    await api.get('/', { timeout: 8000 });
    
    return {
      connected: true,
      message: `API accessible (${Date.now() - startTime}ms)`
    };
    
  } catch (error: any) {
    return {
      connected: false,
      message: `Erreur: ${error.message}`
    };
  }
};

export const debugAuth = (): void => {
  console.group('🔍 DEBUG AUTH');
  
  console.log('=== STORAGE ===');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.includes('auth') || key?.includes('user') || key?.includes('token')) {
      console.log(`${key}:`, localStorage.getItem(key));
    }
  }
  
  console.log('=== CURRENT STATE ===');
  console.log('User:', getCurrentUser());
  console.log('Token présent:', !!getAuthToken());
  console.log('Authentifié:', isAuthenticated());
  
  const token = getAuthToken();
  if (token) {
    console.log('=== TOKEN INFO ===');
    const payload = decodeJWT(token);
    console.log('Payload:', payload);
    console.log('Valide:', isTokenValid(token));
  }
  
  console.groupEnd();
};

export const forceLogout = (): void => {
  console.log('Déconnexion forcée');
  clearAuthStorage();
  
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

// ==============================
// DEFAULT EXPORT
// ==============================

const UserService = {
  // Auth
  loginUser,
  logoutUser,
  registerUser,
  isAuthenticated,
  getCurrentUser,
  getAuthToken,
  refreshCurrentUser,
  refreshUserData,
  validateToken,
  
  // ID Management (nécessaires pour AuthContext)
  ensureValidUserId,
  autoFixUserId,
  repairAuthState,
  
  // User Management
  updateUserProfile,
  updateUser,
  getUsersList,
  getUsers,
  getUserById,
  
  // Admin
  promoteToAdmin,
  demoteFromAdmin,
  deleteUser,
  activateUser,
  deactivateUser,
  
  // Utilities
  testAPIConnection,
  debugAuth,
  forceLogout,
  clearAuthStorage,
  
  // Error Class
  UserServiceError,
};

export default UserService;