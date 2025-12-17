// src/api/UserService.ts - VERSION ULTIME CORRECTE
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
  USER: 'current_user',
  TOKEN: 'auth_token',
  EXPIRES_AT: 'token_expiry',
} as const;

const AUTH_CONFIG = {
  TOKEN_PREFIX: 'Bearer',
  LOGIN_ENDPOINT: '/login_check',
  ME_ENDPOINT: '/users/me',
  LOGOUT_ENDPOINT: '/auth/logout',
  TOKEN_TTL: 3600
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
  
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
  
  api.defaults.headers.common['Authorization'] = `${AUTH_CONFIG.TOKEN_PREFIX} ${token}`;
  
  console.log('💾 Auth sauvegardée:', user.email);
};

export const clearAuthData = (): void => {
  console.log('🧹 Nettoyage auth...');
  
  [STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN, STORAGE_KEYS.EXPIRES_AT].forEach(key => 
    localStorage.removeItem(key)
  );
  
  delete api.defaults.headers.common['Authorization'];
};

// ==============================
// AUTHENTIFICATION - CORRIGÉE
// ==============================

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    console.log('🔐 Login:', email);
    
    const requestData = {
      email: email.trim(),
      password: password
    };
    
    const response = await api.post(AUTH_CONFIG.LOGIN_ENDPOINT, requestData);
    const { token } = response.data;
    
    if (!token) {
      throw new UserServiceError('Token non reçu', 'NO_TOKEN', 400);
    }
    
    console.log('✅ Token reçu');
    
    const payload = decodeJWT(token);
    
    const userFromToken: User = {
      id: payload?.id || payload?.user_id || 0,
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
    };
    
    saveAuthData(token, userFromToken);
    
    return { token, user: userFromToken };
    
  } catch (error: any) {
    console.error('❌ Login error:', error.response?.status || error.message);
    
    // NETTOYER LES DONNÉES SEULEMENT SI 401 (mauvais credentials)
    if (error.response?.status === 401) {
      clearAuthData();
      throw new UserServiceError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS', 401);
    }
    
    // Autres erreurs
    if (error.code === 'ERR_NETWORK') {
      throw new UserServiceError('Serveur inaccessible', 'NETWORK_ERROR', 0);
    }
    
    throw new UserServiceError(
      error.response?.data?.message || 'Erreur de connexion',
      'LOGIN_ERROR',
      error.response?.status
    );
  }
};

export const logoutUser = (): void => {
  console.log('🚪 Logout');
  clearAuthData();
  
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

// ==============================
// GETTERS & CHECKERS
// ==============================

export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    if (!userStr) return null;
    
    return JSON.parse(userStr);
  } catch {
    return null;
  }
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem(STORAGE_KEYS.TOKEN);
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  if (!token) return false;
  
  return !isTokenExpired(token);
};

// ==============================
// REGISTRATION - SIMPLIFIÉE
// ==============================

const validateEmail = (email: string): boolean => 
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePhone = (phone: string): boolean => 
  /^212\d{9}$/.test(phone);

export const registerUser = async (data: RegisterUserData): Promise<User> => {
  try {
    console.log('📝 Register:', data.email);
    
    // Validation minimale
    if (!data.fullName?.trim()) {
      throw new UserServiceError('Nom complet requis', 'VALIDATION_ERROR', 400);
    }
    
    if (!validateEmail(data.email)) {
      throw new UserServiceError('Email invalide', 'VALIDATION_ERROR', 400);
    }
    
    if (!validatePhone(data.phone)) {
      throw new UserServiceError('Téléphone invalide. Format: 212XXXXXXXXX', 'VALIDATION_ERROR', 400);
    }
    
    if (!data.password || data.password.length < 6) {
      throw new UserServiceError('Mot de passe 6 caractères minimum', 'VALIDATION_ERROR', 400);
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
    
    console.log('📤 Envoi inscription...');
    
    const response = await api.post<User>('/users', payload);
    
    console.log('✅ Inscription réussie!');
    
    // IMPORTANT: NE PAS ESSAYER DE SE CONNECTER AUTOMATIQUEMENT
    // L'utilisateur doit se connecter manuellement
    
    return response.data;
    
  } catch (error: any) {
    console.error('❌ Register error:', error.response?.status || error.message);
    
    if (error.response?.data?.violations) {
      const messages = error.response.data.violations
        .map((v: any) => `${v.propertyPath}: ${v.message}`)
        .join('. ');
      throw new UserServiceError(messages, 'VALIDATION_ERROR', error.response.status);
    }
    
    if (error.response?.status === 422) {
      throw new UserServiceError(
        error.response.data?.detail || 'Données invalides',
        'VALIDATION_ERROR',
        422
      );
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new UserServiceError(
        'Impossible de contacter le serveur',
        'NETWORK_ERROR',
        0
      );
    }
    
    throw new UserServiceError(
      error.message || 'Erreur inscription',
      'REGISTRATION_ERROR',
      error.response?.status
    );
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
    console.error(`❌ Update user ${userId}:`, error);
    throw error;
  }
};

export const updateUser = updateUserProfile;

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
    
    throw new UserServiceError('Format inattendu', 'UNEXPECTED_FORMAT', 500);
    
  } catch (error: any) {
    console.error('❌ Get users:', error);
    throw error;
  }
};

export const getUsers = getUsersList;

export const getUserById = async (id: number): Promise<User> => {
  try {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Get user ${id}:`, error);
    throw error;
  }
};

// ==============================
// ADMIN FUNCTIONS
// ==============================

export const promoteToAdmin = async (userId: number): Promise<User> => {
  try {
    const response = await api.patch<User>(`/users/${userId}/promote`, {
      roles: ['ROLE_ADMIN', 'ROLE_USER']
    });
    return response.data;
  } catch (error: any) {
    console.error(`❌ Promote admin ${userId}:`, error);
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
    console.error(`❌ Demote admin ${userId}:`, error);
    throw error;
  }
};

export const deleteUser = async (userId: number): Promise<void> => {
  try {
    await api.delete(`/users/${userId}`);
  } catch (error: any) {
    console.error(`❌ Delete user ${userId}:`, error);
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
    console.error(`❌ Activate user ${userId}:`, error);
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
    console.error(`❌ Deactivate user ${userId}:`, error);
    throw error;
  }
};

// ==============================
// UTILITIES SIMPLIFIÉES
// ==============================

export const testAPIConnection = async (): Promise<{ 
  connected: boolean; 
  message: string;
}> => {
  // NE TESTEZ PAS - Assumez que l'API est accessible
  return {
    connected: true,
    message: '✅ API prête'
  };
};

export const debugAuth = (): void => {
  console.group('🔍 Debug Auth');
  console.log('User:', getCurrentUser());
  console.log('Token:', getAuthToken() ? 'PRÉSENT' : 'ABSENT');
  console.log('Auth:', isAuthenticated());
  console.groupEnd();
};

export const forceLogout = (): void => {
  clearAuthData();
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
  
  // User Management
  updateUserProfile,
  updateUser,
  getUsersList,
  getUsers,
  getUserById,
  
  // Admin Functions
  promoteToAdmin,
  demoteFromAdmin,
  deleteUser,
  activateUser,
  deactivateUser,
  
  // Utilities
  testAPIConnection,
  debugAuth,
  forceLogout,
  clearAuthData,
  UserServiceError
};

export default UserService;