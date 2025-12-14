// src/api/UserService.ts - VERSION COMPLÈTE OPTIMISÉE AVEC refreshCurrentUser
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

export interface RefreshUserResponse {
  success: boolean;
  user: User | null;
  error?: string;
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
  TOKEN_TTL: 3600,
  REFRESH_TIMEOUT: 10000 // 10 secondes
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
    console.warn('⚠️ Erreur décodage JWT:', error);
    return null;
  }
};

const isTokenExpired = (token: string): boolean => {
  const payload = decodeJWT(token);
  if (!payload || !payload.exp) return true;
  
  const now = Math.floor(Date.now() / 1000);
  const buffer = 60;
  return payload.exp <= (now + buffer);
};

// ==============================
// STORAGE MANAGEMENT
// ==============================

const saveAuthData = (token: string, user: User): void => {
  const payload = decodeJWT(token);
  
  const expiresAt = payload?.exp ? payload.exp * 1000 : Date.now() + (AUTH_CONFIG.TOKEN_TTL * 1000);
  
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
  localStorage.setItem(STORAGE_KEYS.AUTH_TYPE, 'jwt');
  
  api.defaults.headers.common['Authorization'] = `${AUTH_CONFIG.TOKEN_PREFIX} ${token}`;
};

const clearAuthData = (): void => {
  Object.values(STORAGE_KEYS).forEach(key => {
    localStorage.removeItem(key);
  });
  delete api.defaults.headers.common['Authorization'];
};

// ==============================
// AUTHENTIFICATION
// ==============================

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    console.log('🔐 [UserService] Connexion utilisateur:', email);
    
    const requestData = {
      email: email.trim(),
      password: password
    };
    
    const response = await api.post(AUTH_CONFIG.LOGIN_ENDPOINT, requestData);
    
    const { token } = response.data;
    
    if (!token) {
      throw new UserServiceError('Token non reçu du serveur', 'NO_TOKEN', 400);
    }
    
    const payload = decodeJWT(token);
    
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
      isActive: payload?.isActive !== false,
      //avatarUrl: payload?.avatarUrl || ''
    };
    
    saveAuthData(token, user);
    
    try {
      const meResponse = await api.get(AUTH_CONFIG.ME_ENDPOINT);
      if (meResponse.data?.user) {
        Object.assign(user, meResponse.data.user);
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      }
    } catch (meError: any) {
      // Ignorer les erreurs
    }
    
    return { token, user };
    
  } catch (error: any) {
    clearAuthData();
    
    if (error.response) {
      const { status, data } = error.response;
      
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
        'Impossible de se connecter au serveur',
        'NETWORK_ERROR'
      );
    }
    
    throw new UserServiceError(
      error.message || 'Erreur inconnue',
      'UNKNOWN_ERROR'
    );
  }
};

export const logoutUser = (redirectToLogin: boolean = true): void => {
  try {
    api.post(AUTH_CONFIG.LOGOUT_ENDPOINT, {}).catch(() => {});
    
    clearAuthData();
    
    if (redirectToLogin && typeof window !== 'undefined') {
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }
    
  } catch (error) {
    console.error('⚠️ Erreur lors de la déconnexion:', error);
  }
};

// ==============================
// GETTERS & CHECKERS
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
  
  if (isTokenExpired(token)) {
    clearAuthData();
    return false;
  }
  
  const user = getCurrentUser();
  if (!user) return false;
  
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

// ==============================
// NOUVELLE FONCTION : refreshCurrentUser
// ==============================

/**
 * Rafraîchit les données utilisateur depuis l'API
 * Compatible avec AuthContext et UserBankDetails
 */
export const refreshCurrentUser = async (): Promise<User | null> => {
  try {
    console.log('🔄 [UserService] Rafraîchissement utilisateur depuis API...');
    
    const token = getAuthToken();
    if (!token) {
      console.log('❌ [UserService] Aucun token disponible pour rafraîchissement');
      return null;
    }
    
    // Vérifier si le token est encore valide
    if (isTokenExpired(token)) {
      console.log('⚠️ [UserService] Token expiré, déconnexion...');
      clearAuthData();
      return null;
    }
    
    // Appel API pour récupérer les données utilisateur à jour
    const response = await api.get(AUTH_CONFIG.ME_ENDPOINT, {
      timeout: AUTH_CONFIG.REFRESH_TIMEOUT
    });
    
    if (!response.data) {
      throw new Error('Aucune donnée reçue du serveur');
    }
    
    // Extraire les données utilisateur (adaptez selon votre API)
    const userData: User = response.data.user || response.data;
    
    if (!userData || !userData.email) {
      throw new Error('Données utilisateur invalides');
    }
    
    // Mettre à jour le localStorage
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    
    console.log('✅ [UserService] Utilisateur rafraîchi:', userData.email);
    console.log('📊 [UserService] Rôles mis à jour:', userData.roles);
    
    return userData;
    
  } catch (error: any) {
    console.error('❌ [UserService] Erreur rafraîchissement utilisateur:', error);
    
    // Ne pas déconnecter en cas d'erreur réseau ou serveur temporaire
    if (error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED') {
      console.log('🌐 [UserService] Erreur réseau, conservation données locales');
      return getCurrentUser(); // Retourner données locales
    }
    
    // Si erreur 401, le token est invalide
    if (error.response?.status === 401) {
      console.log('🔐 [UserService] Token invalide, déconnexion...');
      clearAuthData();
      return null;
    }
    
    // Pour les autres erreurs, retourner l'utilisateur local
    return getCurrentUser();
  }
};

// Alias pour compatibilité avec le code existant
export const refreshUserData = refreshCurrentUser;

// ==============================
// REGISTRATION
// ==============================

const validateEmail = (email: string): boolean => 
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePhone = (phone: string): boolean => 
  /^212\d{9}$/.test(phone);

const validatePassword = (password: string): boolean => 
  password.length >= 6;

export const registerUser = async (data: RegisterUserData): Promise<User> => {
  try {
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
    
    const response = await api.post<User>('/users', payload);
    
    try {
      await loginUser(data.email, data.password);
    } catch (loginError) {
      // Ignorer erreur connexion auto
    }
    
    return response.data;
    
  } catch (error: any) {
    if (error.response?.data?.violations) {
      const messages = error.response.data.violations
        .map((v: any) => `${v.propertyPath}: ${v.message}`)
        .join('. ');
      throw new UserServiceError(messages, 'VALIDATION_ERROR', error.response.status);
    }
    
    throw error;
  }
};

// ==============================
// USER MANAGEMENT
// ==============================

export const updateUserProfile = async (userId: number, data: UpdateUserData): Promise<User> => {
  try {
    if (data.email && !validateEmail(data.email)) {
      throw new UserServiceError('Email invalide', 'VALIDATION_ERROR', 400);
    }
    
    if (data.phone && !validatePhone(data.phone)) {
      throw new UserServiceError('Téléphone invalide', 'VALIDATION_ERROR', 400);
    }
    
    const response = await api.put<User>(`/users/${userId}`, data);
    
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
    const response = await api.get<any>(`/users?page=${page}&itemsPerPage=${limit}`);
    
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

// ==============================
// ADMIN MANAGEMENT FUNCTIONS
// ==============================

export const promoteToAdmin = async (userId: number): Promise<User> => {
  try {
    const response = await api.patch<User>(`/users/${userId}/promote`, {
      roles: ['ROLE_ADMIN', 'ROLE_USER']
    });
    return response.data;
  } catch (error: any) {
    console.error(`❌ Erreur promotion admin ${userId}:`, error);
    throw error;
  }
};

export const demoteFromAdmin = async (userId: number): Promise<User> => {
  try {
    const response = await api.patch<User>(`/users/${userId}/demote`, {
      roles: ['ROLE_USER']
    });
    return response.data;
  } catch (error: any) {
    console.error(`❌ Erreur rétrogradation admin ${userId}:`, error);
    throw error;
  }
};

export const deleteUser = async (userId: number): Promise<void> => {
  try {
    await api.delete(`/users/${userId}`);
  } catch (error: any) {
    console.error(`❌ Erreur suppression utilisateur ${userId}:`, error);
    throw error;
  }
};

export const activateUser = async (userId: number): Promise<User> => {
  try {
    const response = await api.patch<User>(`/users/${userId}/activate`, {
      isActive: true
    });
    return response.data;
  } catch (error: any) {
    console.error(`❌ Erreur activation utilisateur ${userId}:`, error);
    throw error;
  }
};

export const deactivateUser = async (userId: number): Promise<User> => {
  try {
    const response = await api.patch<User>(`/users/${userId}/deactivate`, {
      isActive: false
    });
    return response.data;
  } catch (error: any) {
    console.error(`❌ Erreur désactivation utilisateur ${userId}:`, error);
    throw error;
  }
};

// ==============================
// ALIAS POUR COMPATIBILITÉ
// ==============================

// Alias pour getUsers (compatibilité avec code existant)
export const getUsers = getUsersList;

// Alias pour updateUser (compatibilité)
export const updateUser = updateUserProfile;

// ==============================
// UTILITIES
// ==============================

export const testAPIConnection = async (): Promise<{ 
  connected: boolean; 
  message: string;
  responseTime?: number;
}> => {
  const startTime = Date.now();
  
  try {
    await api.get('/', { 
      timeout: 8000,
      headers: { 'Cache-Control': 'no-cache' }
    });
    
    const responseTime = Date.now() - startTime;
    
    return {
      connected: true,
      message: `API accessible`,
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
  
  Object.values(STORAGE_KEYS).forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`${key}:`, value ? 'présent' : 'NULL');
  });
  
  console.log('Authentifié:', isAuthenticated());
  console.log('Utilisateur:', getCurrentUser()?.email || 'NULL');
  
  const token = getAuthToken();
  if (token) {
    const payload = decodeJWT(token);
    console.log('Token expiré:', isTokenExpired(token));
    console.log('Token payload:', payload);
  }
  
  console.groupEnd();
};

export const forceLogout = (): void => {
  clearAuthData();
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

export const validateAndRefreshAuth = async (): Promise<RefreshUserResponse> => {
  try {
    if (!isAuthenticated()) {
      return { success: false, user: null, error: 'Non authentifié' };
    }
    
    const user = await refreshCurrentUser();
    
    if (user) {
      return { success: true, user };
    } else {
      return { success: false, user: null, error: 'Impossible de rafraîchir' };
    }
  } catch (error: any) {
    return { 
      success: false, 
      user: null, 
      error: error.message || 'Erreur inconnue' 
    };
  }
};

// ==============================
// DEFAULT EXPORT
// ==============================

export default {
  // Authentication
  loginUser,
  logoutUser,
  isAuthenticated,
  getCurrentUser,
  getAuthToken,
  
  // Registration
  registerUser,
  
  // User Management
  refreshCurrentUser, // NOUVELLE FONCTION
  refreshUserData,    // Alias
  updateUserProfile,
  updateUser, // Alias
  getUsersList,
  getUsers, // Alias
  getUserById,
  
  // Admin Management
  promoteToAdmin,
  demoteFromAdmin,
  deleteUser,
  activateUser,
  deactivateUser,
  
  // Utilities
  testAPIConnection,
  debugAuth,
  forceLogout,
  validateAndRefreshAuth,
  
  // Error class
  UserServiceError
};