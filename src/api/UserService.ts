// src/api/UserService.ts - VERSION COMPLÈTE ET FINALE
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
  refresh_token?: string;
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
  refreshToken?: string;
  expiresAt: number;
}

export interface UserBankDetail {
  id: number;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branchName?: string;
  swiftCode?: string;
  iban?: string;
  currency: string;
  isActive: boolean;
}

export interface Transaction {
  id: number;
  amount: number;
  price: number;
  status: 'pending' | 'completed' | 'cancelled' | 'disputed';
  type: 'buy' | 'sell';
  createdAt: string;
  updatedAt?: string;
  ad?: { id: number; title: string };
  buyer?: User;
  seller?: User;
}

export interface Ad {
  id: number;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  currency: { code: string; name: string; type: 'crypto' | 'fiat' };
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  paymentMethod: string;
  user: User;
  createdAt: string;
  timeLimitMinutes: number;
  terms?: string;
  minAmountPerTransaction?: number;
  maxAmountPerTransaction?: number;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isVerified?: boolean;
  isActive?: boolean;
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
  REFRESH_TOKEN: 'refreshToken',
} as const;

const TOKEN_CONFIG = {
  PREFIX: 'Bearer',
  EXPIRY_BUFFER: 300000,
  REFRESH_THRESHOLD: 600000,
} as const;

// ==============================
// STORAGE MANAGEMENT
// ==============================

const saveAuthToStorage = (user: User, token: string, refreshToken?: string): void => {
  try {
    const expiresAt = Date.now() + 3600000;
    
    const authData: AuthStorage = {
      user: {
        ...user,
        id: user.id || generateStableUserId(user.email)
      },
      token,
      refreshToken,
      expiresAt
    };
    
    localStorage.setItem(STORAGE_KEYS.AUTH_DATA, JSON.stringify(authData));
    localStorage.setItem(STORAGE_KEYS.LEGACY_USER, JSON.stringify(authData.user));
    localStorage.setItem(STORAGE_KEYS.LEGACY_TOKEN, token);
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    
    api.defaults.headers.common['Authorization'] = `${TOKEN_CONFIG.PREFIX} ${token}`;
    
  } catch (error) {
    console.error('❌ Erreur sauvegarde storage:', error);
  }
};

const loadAuthFromStorage = (): AuthStorage | null => {
  try {
    const authDataStr = localStorage.getItem(STORAGE_KEYS.AUTH_DATA);
    if (authDataStr) {
      const authData: AuthStorage = JSON.parse(authDataStr);
      
      if (authData.user && authData.token && authData.expiresAt) {
        return authData;
      }
    }
    
    const userStr = localStorage.getItem(STORAGE_KEYS.LEGACY_USER);
    const token = localStorage.getItem(STORAGE_KEYS.LEGACY_TOKEN);
    const refreshToken = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    
    if (userStr && token) {
      const user: User = JSON.parse(userStr);
      const expiresAt = Date.now() + 3600000;
      
      const authData: AuthStorage = { 
        user, 
        token, 
        refreshToken: refreshToken || undefined,
        expiresAt 
      };
      saveAuthToStorage(user, token, refreshToken || undefined);
      
      return authData;
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Erreur chargement storage:', error);
    return null;
  }
};

export const clearAuthStorage = (): void => {
  try {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    
    const legacyKeys = [
      'user', 'jwt_token', 'token', 'token_expiry',
      'refresh_token', 'auth_state', 'isAuthenticated',
      'current_user', 'auth_token'
    ];
    
    legacyKeys.forEach(key => localStorage.removeItem(key));
    
    delete api.defaults.headers.common['Authorization'];
    
  } catch (error) {
    console.error('❌ Erreur nettoyage storage:', error);
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

const extractInfoFromJWT = (token: string): { email: string; possibleId?: number; roles?: string[] } => {
  const payload = decodeJWT(token);
  
  if (!payload) {
    return { email: '' };
  }
  
  const email = payload.email || payload.username || '';
  const roles = payload.roles || [];
  
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
  
  return { email, possibleId, roles };
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

const createUserObject = (email: string, token: string, jwtId?: number, roles?: string[]): User => {
  const payload = decodeJWT(token);
  const userId = jwtId || generateStableUserId(email);
  
  return {
    id: userId,
    email: email,
    fullName: payload?.fullName || email.split('@')[0] || 'Utilisateur',
    roles: roles || (Array.isArray(payload?.roles) ? payload.roles : ['ROLE_USER']),
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
// AUTHENTIFICATION
// ==============================

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    console.log('🔑 Connexion:', email);
    
    const credentials = {
      email: email.trim().toLowerCase(),
      password: password,
    };
    
    const response = await api.post('/login_check', credentials, {
      timeout: 15000,
    });
    
    const token = response.data.token || response.data.access_token;
    const refreshToken = response.data.refresh_token;
    
    if (!token) {
      throw new UserServiceError('Token non reçu', 'NO_TOKEN', 400);
    }
    
    if (!isTokenValid(token)) {
      throw new UserServiceError('Token invalide', 'INVALID_TOKEN', 400);
    }
    
    const { email: jwtEmail, possibleId, roles } = extractInfoFromJWT(token);
    const userEmail = jwtEmail || email;
    
    // Essayer de récupérer l'utilisateur depuis l'API
    let user = await tryFetchUserFromAPI(token);
    
    if (!user) {
      console.log('🛠️ Création utilisateur depuis JWT');
      user = createUserObject(userEmail, token, possibleId, roles);
    }
    
    saveAuthToStorage(user, token, refreshToken);
    
    console.log('✅ Connexion réussie');
    
    return { token, user, refresh_token: refreshToken };
    
  } catch (error: any) {
    console.error('❌ Erreur connexion:', error);
    
    clearAuthStorage();
    
    if (error.response?.status === 401) {
      throw new UserServiceError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS', 401);
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new UserServiceError('Erreur de connexion au serveur', 'NETWORK_ERROR', 0);
    }
    
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
    api.post('/auth/logout', {}).catch(() => {});
  } finally {
    clearAuthStorage();
    
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      window.location.href = '/login';
    }
  }
};

// ==============================
// INSCRIPTION
// ==============================

export const registerUser = async (data: RegisterUserData): Promise<User> => {
  try {
    console.log('🔄 Tentative d\'inscription...', data);
    
    const errors: string[] = [];
    
    if (!data.fullName?.trim() || data.fullName.trim().length < 2) {
      errors.push('Nom complet requis (min. 2 caractères)');
    }
    
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
      errors.push('Email invalide');
    }
    
    // CORRECTION ICI : Accepter +212 ou 212
    const phoneRegex = /^(?:\+?212|212)\d{9}$/;
    if (!phoneRegex.test(data.phone)) {
      errors.push('Téléphone invalide (format: +212XXXXXXXXX ou 212XXXXXXXXX)');
    }
    
    if (!data.password || data.password.length < 6) {
      errors.push('Mot de passe requis (min. 6 caractères)');
    }
    
    if (errors.length > 0) {
      throw new UserServiceError(errors.join('. '), 'VALIDATION_ERROR', 400);
    }
    
    // Nettoyer le numéro de téléphone pour enlever le + si présent
    const cleanedPhone = data.phone.replace('+', '');
    
    // ESSAYER DIFFÉRENTS ENDPOINTS D'INSCRIPTION
    const endpoints = [
      { url: '/register', type: 'standard' },
      { url: '/users', type: 'api-platform' },
      { url: '/api/register', type: 'api-prefix' },
      { url: '/auth/register', type: 'auth' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🧪 Test inscription avec: ${endpoint.url} (${endpoint.type})`);
        
        const payload = endpoint.type === 'api-platform' ? {
          email: data.email.toLowerCase().trim(),
          plainPassword: data.password,
          fullName: data.fullName.trim(),
          phone: cleanedPhone, // Utiliser le numéro nettoyé
          roles: ['ROLE_USER'],
          isVerified: false,
          reputation: 5.0,
          isActive: true,
        } : {
          email: data.email.toLowerCase().trim(),
          password: data.password,
          fullName: data.fullName.trim(),
          phone: cleanedPhone, // Utiliser le numéro nettoyé
        };
        
        console.log('📦 Payload:', payload);
        
        const response = await api.post(endpoint.url, payload, {
          timeout: 15000,
          headers: endpoint.type === 'api-platform' ? {
            'Content-Type': 'application/ld+json'
          } : undefined
        });
        
        console.log(`✅ Inscription réussie avec ${endpoint.url} (status: ${response.status})`);
        console.log('📦 Réponse:', response.data);
        
        // Essayer auto-connexion
        try {
          console.log('🔗 Tentative auto-connexion...');
          await loginUser(data.email, data.password);
        } catch (loginError) {
          console.log('⚠️ Auto-connexion échouée');
        }
        
        return response.data;
        
      } catch (error: any) {
        const status = error.response?.status;
        console.log(`❌ ${endpoint.url}: ${status || 'Error'} - ${error.message}`);
        
        // Si succès avec code différent
        if (status === 201 || status === 200) {
          console.log(`✅ Inscription réussie (status ${status})`);
          return error.response.data;
        }
        
        // Si validation error, arrêter
        if (status === 400 || status === 422) {
          break;
        }
        
        // Sinon continuer
        continue;
      }
    }
    
    throw new UserServiceError('Aucun endpoint d\'inscription ne fonctionne', 'NO_ENDPOINT', 500);
    
  } catch (error: any) {
    console.error('❌ Erreur inscription finale:', error);
    
    if (error instanceof UserServiceError) {
      throw error;
    }
    
    if (error.response?.data?.violations) {
      const messages = error.response.data.violations
        .map((v: any) => `${v.propertyPath}: ${v.message}`)
        .join('. ');
      throw new UserServiceError(messages, 'VALIDATION_ERROR', error.response.status);
    }
    
    if (error.response?.status === 409) {
      throw new UserServiceError('Email déjà utilisé', 'EMAIL_EXISTS', 409);
    }
    
    throw new UserServiceError(
      error.message || 'Erreur lors de l\'inscription',
      'REGISTRATION_ERROR',
      error.response?.status
    );
  }
};
// ==============================
// USER FETCHING
// ==============================

const tryFetchUserFromAPI = async (token: string): Promise<User | null> => {
  const endpoints = [
    '/auth/me',
    '/users/me',
    '/user/profile',
    '/profile',
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await api.get(endpoint, {
        headers: { 'Authorization': `Bearer ${token}` },
        timeout: 8000,
      });
      
      if (response.data) {
        const apiData = response.data.user || response.data;
        
        if (apiData && apiData.email) {
          console.log(`✅ ${endpoint} - Récupération réussie`);
          
          const userData = {
            ...createUserObject(apiData.email, token, apiData.id, apiData.roles),
            ...apiData
          };
          
          if (!userData.id || userData.id >= 100000) {
            userData.id = apiData.id || generateStableUserId(apiData.email);
          }
          
          return userData;
        }
      }
    } catch (error: any) {
      const status = error.response?.status;
      
      if (status === 404) continue;
      if (status === 401) return null;
      if (error.code === 'ECONNABORTED') continue;
    }
  }
  
  console.log('⚠️ Aucun endpoint utilisateur disponible');
  return null;
};

// ==============================
// STATE MANAGEMENT
// ==============================

export const refreshCurrentUser = async (): Promise<User | null> => {
  try {
    const token = getAuthToken();
    if (!token) return null;
    
    const user = await tryFetchUserFromAPI(token);
    if (user) {
      const authData = loadAuthFromStorage();
      if (authData) {
        saveAuthToStorage(user, token, authData.refreshToken);
      }
    }
    return user;
  } catch (error) {
    console.error('❌ Erreur refreshCurrentUser:', error);
    return null;
  }
};

export const validateToken = async (): Promise<boolean> => {
  try {
    const authData = loadAuthFromStorage();
    if (!authData) return false;
    
    if (!isTokenValid(authData.token)) {
      clearAuthStorage();
      return false;
    }
    
    if (Date.now() > authData.expiresAt) {
      clearAuthStorage();
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Erreur validateToken:', error);
    return false;
  }
};

export const repairAuthState = async (): Promise<boolean> => {
  try {
    console.log('🔧 Réparation de l\'état d\'authentification...');
    
    const authData = loadAuthFromStorage();
    if (!authData) return false;
    
    const token = authData.token;
    if (!token || !isTokenValid(token)) {
      clearAuthStorage();
      return false;
    }
    
    const user = await tryFetchUserFromAPI(token);
    
    if (user) {
      if (user.id && user.id >= 100000) {
        const { possibleId } = extractInfoFromJWT(token);
        if (possibleId && possibleId < 100000) {
          user.id = possibleId;
        }
      }
      
      saveAuthToStorage(user, token, authData.refreshToken);
      console.log('✅ État d\'authentification réparé');
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('❌ Erreur repairAuthState:', error);
    return false;
  }
};

// ==============================
// PUBLIC FUNCTIONS
// ==============================

export const getCurrentUser = (): User | null => {
  try {
    const authData = loadAuthFromStorage();
    
    if (!authData) return null;
    
    if (!isTokenValid(authData.token)) {
      clearAuthStorage();
      return null;
    }
    
    if (Date.now() > authData.expiresAt) {
      clearAuthStorage();
      return null;
    }
    
    return authData.user;
    
  } catch (error) {
    console.error('❌ Erreur getCurrentUser:', error);
    return null;
  }
};

export const getAuthToken = (): string | null => {
  try {
    const authData = loadAuthFromStorage();
    
    if (!authData) return null;
    
    if (!isTokenValid(authData.token)) {
      return null;
    }
    
    return authData.token;
    
  } catch (error) {
    console.error('❌ Erreur getAuthToken:', error);
    return null;
  }
};

export const isAuthenticated = (): boolean => {
  try {
    const user = getCurrentUser();
    const token = getAuthToken();
    return !!(user && token);
    
  } catch (error) {
    console.error('❌ Erreur isAuthenticated:', error);
    return false;
  }
};

// ==============================
// USER MANAGEMENT - COMPLETE
// ==============================

export const getUsers = async (filters?: UserFilters): Promise<{ users: User[]; total: number }> => {
  try {
    const params = {
      page: filters?.page || 1,
      itemsPerPage: filters?.limit || 20,
      ...(filters?.search && { search: filters.search }),
      ...(filters?.role && { role: filters.role }),
      ...(filters?.isVerified !== undefined && { isVerified: filters.isVerified }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
    };

    const response = await api.get('/users', { params });
    
    const users = response.data['hydra:member'] || response.data || [];
    const total = response.data['hydra:totalItems'] || users.length;
    
    return {
      users: users.map((userData: any) => ({
        id: userData.id,
        email: userData.email,
        fullName: userData.fullName || userData.full_name || userData.username || '',
        roles: Array.isArray(userData.roles) ? userData.roles : 
              (userData.roles ? [userData.roles] : ['ROLE_USER']),
        isVerified: userData.isVerified || userData.is_verified || false,
        reputation: userData.reputation || 5.0,
        phone: userData.phone || '',
        walletAddress: userData.walletAddress || userData.wallet_address || '',
        isActive: userData.isActive !== false && userData.is_active !== false,
        createdAt: userData.createdAt || userData.created_at || new Date().toISOString(),
        updatedAt: userData.updatedAt || userData.updated_at || new Date().toISOString(),
      })),
      total
    };
    
  } catch (error: any) {
    console.error('❌ Erreur getUsers:', error);
    throw new UserServiceError(
      error.response?.data?.message || 'Erreur lors de la récupération des utilisateurs',
      'GET_USERS_ERROR',
      error.response?.status
    );
  }
};

export const getUserById = async (id: number): Promise<User> => {
  try {
    const response = await api.get(`/users/${id}`);
    const userData = response.data;
    
    return {
      id: userData.id,
      email: userData.email,
      fullName: userData.fullName || userData.full_name || userData.username || '',
      roles: Array.isArray(userData.roles) ? userData.roles : 
            (userData.roles ? [userData.roles] : ['ROLE_USER']),
      isVerified: userData.isVerified || userData.is_verified || false,
      reputation: userData.reputation || 5.0,
      phone: userData.phone || '',
      walletAddress: userData.walletAddress || userData.wallet_address || '',
      isActive: userData.isActive !== false && userData.is_active !== false,
      createdAt: userData.createdAt || userData.created_at || new Date().toISOString(),
      updatedAt: userData.updatedAt || userData.updated_at || new Date().toISOString(),
    };
    
  } catch (error: any) {
    console.error(`❌ Erreur getUserById ${id}:`, error);
    throw new UserServiceError(
      error.response?.data?.message || `Erreur lors de la récupération de l'utilisateur ${id}`,
      'GET_USER_ERROR',
      error.response?.status
    );
  }
};

export const updateUser = async (id: number, userData: Partial<User>): Promise<User> => {
  try {
    const payload: any = {};
    
    if (userData.email !== undefined) payload.email = userData.email;
    if (userData.fullName !== undefined) payload.fullName = userData.fullName;
    if (userData.phone !== undefined) payload.phone = userData.phone;
    if (userData.reputation !== undefined) payload.reputation = userData.reputation;
    if (userData.isVerified !== undefined) payload.isVerified = userData.isVerified;
    if (userData.roles !== undefined) payload.roles = userData.roles;
    if (userData.isActive !== undefined) payload.isActive = userData.isActive;
    if (userData.walletAddress !== undefined) payload.walletAddress = userData.walletAddress;
    
    const response = await api.put(`/users/${id}`, payload);
    return response.data;
    
  } catch (error: any) {
    console.error(`❌ Erreur updateUser ${id}:`, error);
    throw new UserServiceError(
      error.response?.data?.message || `Erreur lors de la mise à jour de l'utilisateur ${id}`,
      'UPDATE_USER_ERROR',
      error.response?.status
    );
  }
};

export const deleteUser = async (id: number): Promise<void> => {
  try {
    console.log(`🗑️ Suppression de l'utilisateur ${id}`);
    
    const endpoints = [
      `/users/${id}`,
      `/users/${id}/delete`,
      `/admin/users/${id}`,
      `/api/users/${id}`
    ];
    
    let lastError: any = null;
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Tentative de suppression avec ${endpoint}`);
        await api.delete(endpoint);
        console.log(`✅ Utilisateur ${id} supprimé avec succès via ${endpoint}`);
        return;
      } catch (error: any) {
        console.log(`❌ ${endpoint}: ${error.response?.status || 'Error'}`);
        lastError = error;
        
        if (error.response?.status === 404 || error.response?.status === 405) {
          continue;
        }
        
        if (error.response?.status === 403) {
          throw new UserServiceError(
            'Permission refusée pour supprimer cet utilisateur',
            'DELETE_PERMISSION_DENIED',
            403
          );
        }
      }
    }
    
    if (lastError) {
      throw lastError;
    }
    
    throw new UserServiceError('Impossible de supprimer l\'utilisateur', 'DELETE_USER_FAILED', 500);
    
  } catch (error: any) {
    console.error(`❌ Erreur deleteUser ${id}:`, error);
    
    if (error instanceof UserServiceError) {
      throw error;
    }
    
    throw new UserServiceError(
      error.response?.data?.message || `Erreur lors de la suppression de l'utilisateur ${id}`,
      'DELETE_USER_ERROR',
      error.response?.status
    );
  }
};

export const promoteToAdmin = async (userId: number): Promise<User> => {
  try {
    console.log(`👑 Promotion de l'utilisateur ${userId} en admin`);
    
    const endpoints = [
      { url: `/users/${userId}/promote-to-admin`, method: 'POST' },
      { url: `/users/${userId}/admin`, method: 'PUT' },
      { url: `/users/${userId}`, method: 'PUT', data: { roles: ['ROLE_ADMIN', 'ROLE_USER'] } },
      { url: `/users/${userId}/role`, method: 'PATCH', data: { role: 'ROLE_ADMIN' } }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Tentative avec ${endpoint.url} (${endpoint.method})`);
        
        let response;
        if (endpoint.method === 'POST') {
          response = await api.post(endpoint.url, {});
        } else if (endpoint.method === 'PUT') {
          response = await api.put(endpoint.url, endpoint.data || { roles: ['ROLE_ADMIN'] });
        } else if (endpoint.method === 'PATCH') {
          response = await api.patch(endpoint.url, endpoint.data || { role: 'ROLE_ADMIN' });
        }
        
        if (response && response.data) {
          console.log(`✅ Promotion réussie avec ${endpoint.url}`);
          
          const updatedUser = response.data;
          return {
            id: updatedUser.id,
            email: updatedUser.email,
            fullName: updatedUser.fullName || updatedUser.full_name || updatedUser.username || '',
            roles: Array.isArray(updatedUser.roles) ? updatedUser.roles : 
                  (updatedUser.roles ? [updatedUser.roles] : ['ROLE_ADMIN', 'ROLE_USER']),
            isVerified: updatedUser.isVerified || updatedUser.is_verified || false,
            reputation: updatedUser.reputation || 5.0,
            phone: updatedUser.phone || '',
            walletAddress: updatedUser.walletAddress || updatedUser.wallet_address || '',
            isActive: updatedUser.isActive !== false && updatedUser.is_active !== false,
            createdAt: updatedUser.createdAt || updatedUser.created_at || new Date().toISOString(),
            updatedAt: updatedUser.updatedAt || updatedUser.updated_at || new Date().toISOString(),
          };
        }
      } catch (err: any) {
        console.log(`❌ ${endpoint.url}: ${err.response?.status || 'Error'}`);
        if (err.response?.status === 404 || err.response?.status === 405) {
          continue;
        }
      }
    }
    
    console.log('🔄 Utilisation de updateUser comme fallback');
    return await updateUser(userId, { roles: ['ROLE_ADMIN', 'ROLE_USER'] });
    
  } catch (error: any) {
    console.error(`❌ Erreur promoteToAdmin ${userId}:`, error);
    throw new UserServiceError(
      error.response?.data?.message || `Erreur lors de la promotion de l'utilisateur ${userId}`,
      'PROMOTE_TO_ADMIN_ERROR',
      error.response?.status
    );
  }
};

export const demoteFromAdmin = async (userId: number): Promise<User> => {
  try {
    console.log(`⬇️ Rétrogradation de l'utilisateur ${userId} (admin → user)`);
    
    const endpoints = [
      { url: `/users/${userId}/demote-from-admin`, method: 'POST' },
      { url: `/users/${userId}/user`, method: 'PUT' },
      { url: `/users/${userId}/role`, method: 'PATCH', data: { role: 'ROLE_USER' } }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Tentative avec ${endpoint.url} (${endpoint.method})`);
        
        let response;
        if (endpoint.method === 'POST') {
          response = await api.post(endpoint.url, {});
        } else if (endpoint.method === 'PUT') {
          response = await api.put(endpoint.url, { roles: ['ROLE_USER'] });
        } else if (endpoint.method === 'PATCH') {
          response = await api.patch(endpoint.url, endpoint.data || { role: 'ROLE_USER' });
        }
        
        if (response && response.data) {
          console.log(`✅ Rétrogradation réussie avec ${endpoint.url}`);
          
          const updatedUser = response.data;
          return {
            id: updatedUser.id,
            email: updatedUser.email,
            fullName: updatedUser.fullName || updatedUser.full_name || updatedUser.username || '',
            roles: Array.isArray(updatedUser.roles) ? updatedUser.roles : 
                  (updatedUser.roles ? [updatedUser.roles] : ['ROLE_USER']),
            isVerified: updatedUser.isVerified || updatedUser.is_verified || false,
            reputation: updatedUser.reputation || 5.0,
            phone: updatedUser.phone || '',
            walletAddress: updatedUser.walletAddress || updatedUser.wallet_address || '',
            isActive: updatedUser.isActive !== false && updatedUser.is_active !== false,
            createdAt: updatedUser.createdAt || updatedUser.created_at || new Date().toISOString(),
            updatedAt: updatedUser.updatedAt || updatedUser.updated_at || new Date().toISOString(),
          };
        }
      } catch (err: any) {
        console.log(`❌ ${endpoint.url}: ${err.response?.status || 'Error'}`);
        if (err.response?.status === 404 || err.response?.status === 405) {
          continue;
        }
      }
    }
    
    console.log('🔄 Utilisation de updateUser comme fallback');
    return await updateUser(userId, { roles: ['ROLE_USER'] });
    
  } catch (error: any) {
    console.error(`❌ Erreur demoteFromAdmin ${userId}:`, error);
    throw new UserServiceError(
      error.response?.data?.message || `Erreur lors de la rétrogradation de l'utilisateur ${userId}`,
      'DEMOTE_FROM_ADMIN_ERROR',
      error.response?.status
    );
  }
};

export const toggleUserStatus = async (userId: number): Promise<User> => {
  try {
    const currentUser = await getUserById(userId);
    const newStatus = !currentUser.isActive;
    
    console.log(`🔄 Changement de statut utilisateur ${userId}: ${currentUser.isActive ? 'actif' : 'inactif'} → ${newStatus ? 'actif' : 'inactif'}`);
    
    return await updateUser(userId, { isActive: newStatus });
    
  } catch (error: any) {
    console.error(`❌ Erreur toggleUserStatus ${userId}:`, error);
    throw new UserServiceError(
      error.response?.data?.message || `Erreur lors du changement de statut de l'utilisateur ${userId}`,
      'TOGGLE_USER_STATUS_ERROR',
      error.response?.status
    );
  }
};

export const verifyUser = async (userId: number): Promise<User> => {
  try {
    console.log(`✅ Vérification de l'utilisateur ${userId}`);
    
    const endpoints = [
      { url: `/users/${userId}/verify`, method: 'POST' },
      { url: `/admin/users/${userId}/verify`, method: 'PUT' },
      { url: `/users/${userId}`, method: 'PATCH', data: { isVerified: true } }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 Tentative avec ${endpoint.url} (${endpoint.method})`);
        
        let response;
        if (endpoint.method === 'POST') {
          response = await api.post(endpoint.url, {});
        } else if (endpoint.method === 'PUT') {
          response = await api.put(endpoint.url, { isVerified: true });
        } else if (endpoint.method === 'PATCH') {
          response = await api.patch(endpoint.url, endpoint.data);
        }
        
        if (response && response.data) {
          console.log(`✅ Utilisateur ${userId} vérifié avec ${endpoint.url}`);
          return response.data;
        }
      } catch (err: any) {
        console.log(`❌ ${endpoint.url}: ${err.response?.status || 'Error'}`);
        if (err.response?.status === 404 || err.response?.status === 405) {
          continue;
        }
      }
    }
    
    console.log('🔄 Utilisation de updateUser comme fallback');
    return await updateUser(userId, { isVerified: true });
    
  } catch (error: any) {
    console.error(`❌ Erreur verifyUser ${userId}:`, error);
    throw new UserServiceError(
      error.response?.data?.message || `Erreur lors de la vérification de l'utilisateur ${userId}`,
      'VERIFY_USER_ERROR',
      error.response?.status
    );
  }
};

export const updateUserProfile = async (userId: number, profileData: {
  fullName?: string;
  phone?: string;
  walletAddress?: string;
  avatarUrl?: string;
}): Promise<User> => {
  try {
    console.log(`📝 Mise à jour du profil utilisateur ${userId}`, profileData);
    
    const response = await api.patch(`/users/${userId}/profile`, profileData);
    return response.data;
    
  } catch (error: any) {
    console.error(`❌ Erreur updateUserProfile ${userId}:`, error);
    
    // Fallback: utiliser updateUser
    try {
      return await updateUser(userId, profileData);
    } catch (fallbackError) {
      throw new UserServiceError(
        error.response?.data?.message || `Erreur lors de la mise à jour du profil utilisateur ${userId}`,
        'UPDATE_PROFILE_ERROR',
        error.response?.status
      );
    }
  }
};

// ==============================
// ID MANAGEMENT
// ==============================

export const ensureValidUserId = async (): Promise<number> => {
  try {
    const user = getCurrentUser();
    const token = getAuthToken();
    
    if (!user || !token) {
      throw new Error('Utilisateur non authentifié');
    }
    
    if (user.id && user.id < 100000) {
      return user.id;
    }
    
    const apiUser = await tryFetchUserFromAPI(token);
    
    if (apiUser && apiUser.id && apiUser.id < 100000) {
      saveAuthToStorage(apiUser, token);
      return apiUser.id;
    }
    
    const { possibleId } = extractInfoFromJWT(token);
    if (possibleId && possibleId < 100000) {
      user.id = possibleId;
      saveAuthToStorage(user, token);
      return possibleId;
    }
    
    return user.id;
    
  } catch (error) {
    console.error('❌ Erreur ensureValidUserId:', error);
    
    const user = getCurrentUser();
    return user?.id || generateStableUserId('unknown@email.com');
  }
};

export const autoFixUserId = async (): Promise<boolean> => {
  try {
    const userId = await ensureValidUserId();
    return userId < 100000;
  } catch (error) {
    console.error('❌ Erreur autoFixUserId:', error);
    return false;
  }
};

// ==============================
// USER BANK DETAILS
// ==============================

export const getUserBankDetails = async (): Promise<UserBankDetail[]> => {
  try {
    const endpoints = [
      '/user_bank_details',
      '/api/user_bank_details',
      '/bank_details',
      '/api/bank_details'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const response = await api.get(endpoint);
        console.log(`✅ Bank details récupérés depuis ${endpoint}`);
        
        const data = response.data['hydra:member'] || response.data || [];
        
        return Array.isArray(data) ? data.map((item: any) => ({
          id: item.id,
          bankName: item.bankName || item.bank_name || '',
          accountHolder: item.accountHolder || item.account_holder || '',
          accountNumber: item.accountNumber || item.account_number || '',
          branchName: item.branchName || item.branch_name,
          swiftCode: item.swiftCode || item.swift_code,
          iban: item.iban,
          currency: item.currency || 'MAD',
          isActive: item.isActive !== undefined ? Boolean(item.isActive) : 
                   (item.is_active !== undefined ? Boolean(item.is_active) : true),
        })) : [];
        
      } catch (err: any) {
        console.log(`❌ ${endpoint}: ${err.response?.status || 'Error'}`);
      }
    }
    
    throw new Error('Aucun endpoint pour les coordonnées bancaires ne fonctionne');
    
  } catch (error: any) {
    console.error('❌ Erreur getUserBankDetails:', error);
    throw error;
  }
};

export const createUserBankDetail = async (bankDetail: Omit<UserBankDetail, 'id'>): Promise<UserBankDetail> => {
  try {
    const endpoints = [
      '/user_bank_details',
      '/api/user_bank_details'
    ];
    
    for (const endpoint of endpoints) {
      try {
        const payload = {
          bankName: bankDetail.bankName,
          accountHolder: bankDetail.accountHolder,
          accountNumber: bankDetail.accountNumber,
          branchName: bankDetail.branchName,
          swiftCode: bankDetail.swiftCode,
          iban: bankDetail.iban,
          currency: bankDetail.currency || 'MAD',
          isActive: bankDetail.isActive !== false,
        };
        
        const response = await api.post(endpoint, payload);
        console.log(`✅ Bank detail créé avec ${endpoint}`);
        return response.data;
        
      } catch (err: any) {
        console.log(`❌ ${endpoint}: ${err.response?.status || 'Error'}`);
      }
    }
    
    throw new Error('Impossible de créer les coordonnées bancaires');
    
  } catch (error: any) {
    console.error('❌ Erreur createUserBankDetail:', error);
    throw error;
  }
};

export const updateUserBankDetail = async (id: number, bankDetail: Partial<UserBankDetail>): Promise<UserBankDetail> => {
  try {
    const response = await api.put(`/user_bank_details/${id}`, bankDetail);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Erreur updateUserBankDetail ${id}:`, error);
    throw error;
  }
};

export const deleteUserBankDetail = async (id: number): Promise<void> => {
  try {
    await api.delete(`/user_bank_details/${id}`);
  } catch (error: any) {
    console.error(`❌ Erreur deleteUserBankDetail ${id}:`, error);
    throw error;
  }
};

// ==============================
// ADS MANAGEMENT
// ==============================

export const getAds = async (params?: any): Promise<{ data: Ad[]; total: number }> => {
  try {
    const response = await api.get('/ads', { params });
    
    const data = response.data['hydra:member'] || response.data || [];
    const total = response.data['hydra:totalItems'] || data.length;
    
    return { data, total };
    
  } catch (error: any) {
    console.error('❌ Erreur getAds:', error);
    throw error;
  }
};

export const getAdById = async (id: number): Promise<Ad> => {
  try {
    const response = await api.get(`/ads/${id}`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Erreur getAdById ${id}:`, error);
    throw error;
  }
};

export const createAd = async (adData: any): Promise<Ad> => {
  try {
    console.log('📤 Création annonce:', adData);
    
    const { user, ...dataWithoutUser } = adData;
    
    const response = await api.post('/ads', dataWithoutUser);
    console.log('✅ Annonce créée:', response.data);
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Erreur createAd:', error);
    throw error;
  }
};

export const updateAd = async (id: number, adData: any): Promise<Ad> => {
  try {
    const response = await api.put(`/ads/${id}`, adData);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Erreur updateAd ${id}:`, error);
    throw error;
  }
};

export const deleteAd = async (id: number): Promise<void> => {
  try {
    await api.delete(`/ads/${id}`);
  } catch (error: any) {
    console.error(`❌ Erreur deleteAd ${id}:`, error);
    throw error;
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
  validateToken,
  repairAuthState,
  autoFixUserId,
  
  // User Management (COMPLETE)
  getUsers,
  getUserById,
  updateUser,
  deleteUser,           // FONCTION AJOUTÉE
  promoteToAdmin,
  demoteFromAdmin,
  toggleUserStatus,
  verifyUser,
  updateUserProfile,
  
  // ID Management
  ensureValidUserId,
  
  // Bank Details
  getUserBankDetails,
  createUserBankDetail,
  updateUserBankDetail,
  deleteUserBankDetail,
  
  // Ads Management
  getAds,
  getAdById,
  createAd,
  updateAd,
  deleteAd,
  
  // Utilities
  clearAuthStorage,
  
  // Error Class
  UserServiceError,
};

export default UserService;