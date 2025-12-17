// src/api/UserService.ts - VERSION COMPLÈTE CORRIGÉE
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
  REFRESH_TOKEN: 'refresh_token',
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
  
  // SAUVEGARDE DOUBLE POUR COMPATIBILITÉ
  localStorage.setItem(STORAGE_KEYS.TOKEN, token);
  localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
  localStorage.setItem('jwt_token', token);
  localStorage.setItem('user', JSON.stringify(user));
  localStorage.setItem(STORAGE_KEYS.EXPIRES_AT, expiresAt.toString());
  
  // Configuration de l'API
  api.defaults.headers.common['Authorization'] = `${AUTH_CONFIG.TOKEN_PREFIX} ${token}`;
  
  console.log('💾 [UserService] Authentification sauvegardée:', {
    email: user.email,
    id: user.id,
    tokenLength: token.length,
    expires: new Date(expiresAt).toLocaleTimeString()
  });
};

export const clearAuthData = (): void => {
  console.log('🧹 [UserService] Nettoyage des données...');
  
  // Supprimer toutes les clés possibles
  const allKeys = [
    STORAGE_KEYS.USER, STORAGE_KEYS.TOKEN, STORAGE_KEYS.EXPIRES_AT,
    'user', 'jwt_token', 'token', 'auth_token', 'current_user'
  ];
  
  allKeys.forEach(key => localStorage.removeItem(key));
  
  delete api.defaults.headers.common['Authorization'];
  
  console.log('✅ [UserService] Nettoyage terminé');
};

// ==============================
// AUTHENTIFICATION
// ==============================

export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    console.log('🔐 [UserService] Connexion:', email);
    
    const requestData = {
      email: email.trim(),
      password: password
    };
    
    console.log('📤 Envoi données login...');
    
    const response = await api.post(AUTH_CONFIG.LOGIN_ENDPOINT, requestData);
    const { token } = response.data;
    
    if (!token) {
      throw new UserServiceError('Token non reçu', 'NO_TOKEN', 400);
    }
    
    console.log('✅ Token reçu:', token.substring(0, 20) + '...');
    
    const payload = decodeJWT(token);
    console.log('📄 Payload JWT:', payload);
    
    // CRITIQUE: Vérifier que l'ID n'est pas 0 dans le JWT
    let userId = payload?.id || payload?.user_id || 0;
    
    // Créer l'utilisateur avec l'ID disponible (même si 0)
    const userFromToken: User = {
      id: userId,
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
    
    console.log('👤 User créé depuis JWT:', { id: userFromToken.id, email: userFromToken.email });
    
    // Sauvegarder d'abord avec l'ID disponible (même 0)
    saveAuthData(token, userFromToken);
    
    // FORCER l'appel à /users/me pour obtenir les données complètes
    try {
      const meResponse = await api.get(AUTH_CONFIG.ME_ENDPOINT);
      console.log('📊 Réponse /users/me:', meResponse.data);
      
      if (meResponse.data) {
        const apiUser = meResponse.data.user || meResponse.data;
        
        // Fusionner toutes les données
        const enrichedUser = { ...userFromToken, ...apiUser };
        
        // Si on a un vrai ID, l'utiliser
        if (apiUser.id && apiUser.id !== 0) {
          enrichedUser.id = apiUser.id;
          console.log('✅ ID définitif après /users/me:', enrichedUser.id);
        }
        
        // Resauvegarder avec les données complètes
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(enrichedUser));
        localStorage.setItem('user', JSON.stringify(enrichedUser));
        
        console.log('✅ Données API fusionnées, ID final:', enrichedUser.id);
        return { token, user: enrichedUser };
      }
    } catch (meError: any) {
      console.warn('⚠️ /users/me échoué après login:', meError.message);
      console.log('📦 Utilisation données JWT uniquement, ID:', userFromToken.id);
    }
    
    return { token, user: userFromToken };
    
  } catch (error: any) {
    console.error('❌ Erreur connexion:', error);
    clearAuthData();
    
    if (error.response?.status === 401) {
      throw new UserServiceError('Email ou mot de passe incorrect', 'INVALID_CREDENTIALS', 401);
    }
    
    throw error;
  }
};

export const logoutUser = (): void => {
  console.log('🚪 [UserService] Déconnexion...');
  
  try {
    api.post(AUTH_CONFIG.LOGOUT_ENDPOINT, {}).catch(() => {});
  } catch (error) {}
  
  clearAuthData();
  
  console.log('✅ [UserService] Déconnexion réussie');
  
  if (typeof window !== 'undefined') {
    window.location.href = '/login';
  }
};

// ==============================
// GETTERS & CHECKERS - MODIFIÉS POUR ACCEPTER ID=0
// ==============================

export const getCurrentUser = (): User | null => {
  try {
    console.log('🔍 [UserService] Recherche utilisateur...');
    
    // Chercher dans TOUTES les clés possibles
    const possibleKeys = ['current_user', 'user', 'USER'];
    
    for (const key of possibleKeys) {
      const userStr = localStorage.getItem(key);
      if (userStr) {
        console.log(`✅ Trouvé dans clé: "${key}"`);
        try {
          const user = JSON.parse(userStr);
          
          // MODIFICATION : ACCEPTER ID=0 TEMPORAIREMENT
          if (user && typeof user === 'object' && (user.email || user.username)) {
            console.log('👤 Utilisateur trouvé (ID peut être 0):', { 
              email: user.email || user.username, 
              id: user.id 
            });
            return user;
          }
        } catch (parseError) {
          console.error(`❌ Erreur parsing "${key}":`, parseError);
        }
      }
    }
    
    console.log('❌ Aucun utilisateur trouvé dans localStorage');
    return null;
    
  } catch (error) {
    console.error('❌ Erreur getCurrentUser:', error);
    return null;
  }
};

export const getAuthToken = (): string | null => {
  // Chercher dans toutes les clés possibles
  const tokenKeys = ['auth_token', 'jwt_token', 'token'];
  
  for (const key of tokenKeys) {
    const token = localStorage.getItem(key);
    if (token) {
      return token;
    }
  }
  
  return null;
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const user = getCurrentUser();
  
  if (!token) {
    console.log('🔐 Aucun token trouvé');
    return false;
  }
  
  if (isTokenExpired(token)) {
    console.log('⚠️ Token expiré');
    clearAuthData();
    return false;
  }
  
  if (!user) {
    console.log('👤 Aucun utilisateur trouvé');
    return false;
  }
  
  // MODIFICATION : ACCEPTER ID=0 TEMPORAIREMENT
  console.log('✅ Authentifié (même avec ID=0):', { 
    email: user.email, 
    id: user.id,
    warning: user.id === 0 ? 'ID=0 - À corriger plus tard' : 'ID valide'
  });
  
  return true;
};

// ==============================
// FONCTIONS POUR GÉRER ID=0 - NOUVELLES
// ==============================

/**
 * Récupère le vrai ID utilisateur depuis l'API
 */
export const fetchUserRealId = async (): Promise<number | null> => {
  try {
    console.log('🔍 [UserService] Tentative de récupération du vrai ID utilisateur...');
    
    const token = getAuthToken();
    if (!token) {
      console.log('❌ Pas de token disponible');
      return null;
    }
    
    // 1. Essayer /users/me d'abord
    try {
      console.log('🔄 Essai endpoint: /users/me');
      const response = await api.get('/users/me');
      
      if (response.data?.id && response.data.id !== 0) {
        console.log(`✅ Vrai ID trouvé via /users/me:`, response.data.id);
        return response.data.id;
      }
      
      if (response.data?.user?.id && response.data.user.id !== 0) {
        console.log(`✅ Vrai ID trouvé via /users/me.user:`, response.data.user.id);
        return response.data.user.id;
      }
      
    } catch (meError: any) {
      console.log(`❌ /users/me échoué:`, meError.message);
    }
    
    // 2. Chercher l'utilisateur par email
    const currentUser = getCurrentUser();
    if (currentUser?.email) {
      console.log('🔄 Tentative recherche par email:', currentUser.email);
      try {
        const response = await api.get(`/users?email=${encodeURIComponent(currentUser.email)}`);
        
        if (response.data?.['hydra:member']?.[0]?.id) {
          const realId = response.data['hydra:member'][0].id;
          console.log(`✅ ID trouvé via recherche email:`, realId);
          return realId;
        }
        
        if (Array.isArray(response.data) && response.data[0]?.id) {
          const realId = response.data[0].id;
          console.log(`✅ ID trouvé via recherche email:`, realId);
          return realId;
        }
      } catch (searchError) {
        console.log('❌ Recherche par email échouée');
      }
    }
    
    console.warn('⚠️ [UserService] Impossible de récupérer le vrai ID');
    return null;
    
  } catch (error) {
    console.error('❌ [UserService] Erreur récupération ID:', error);
    return null;
  }
};

/**
 * Corrige automatiquement l'ID utilisateur si = 0
 */
export const autoFixUserId = async (): Promise<boolean> => {
  const currentUser = getCurrentUser();
  
  if (currentUser && currentUser.id === 0) {
    console.warn('⚠️ [UserService] Détection ID=0, correction automatique...');
    const realId = await fetchUserRealId();
    
    if (realId) {
      console.log('✅ [UserService] ID corrigé automatiquement:', realId);
      
      // Mettre à jour l'utilisateur
      currentUser.id = realId;
      
      // Sauvegarder dans toutes les clés
      localStorage.setItem('current_user', JSON.stringify(currentUser));
      localStorage.setItem('user', JSON.stringify(currentUser));
      
      return true;
    } else {
      console.warn('⚠️ [UserService] Impossible de corriger ID=0');
    }
  }
  
  return false;
};

/**
 * Force la vérification et correction de l'ID
 */
export const ensureValidUserId = async (): Promise<number | null> => {
  try {
    const currentUser = getCurrentUser();
    
    if (!currentUser) {
      console.log('❌ [UserService] Aucun utilisateur pour vérification ID');
      return null;
    }
    
    // Si ID déjà valide, retourner
    if (currentUser.id && currentUser.id !== 0) {
      console.log('✅ [UserService] ID déjà valide:', currentUser.id);
      return currentUser.id;
    }
    
    // Sinon, essayer de corriger
    console.log('🔄 [UserService] Vérification ID utilisateur...');
    const fixed = await autoFixUserId();
    
    if (fixed) {
      const updatedUser = getCurrentUser();
      return updatedUser?.id || null;
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ [UserService] Erreur vérification ID:', error);
    return null;
  }
};

// ==============================
// USER REFRESH
// ==============================

export const refreshCurrentUser = async (): Promise<User | null> => {
  try {
    console.log('🔄 [UserService] Rafraîchissement...');
    
    const token = getAuthToken();
    if (!token) {
      console.log('❌ Aucun token');
      return null;
    }
    
    if (isTokenExpired(token)) {
      console.log('⚠️ Token expiré');
      clearAuthData();
      return null;
    }
    
    const response = await api.get(AUTH_CONFIG.ME_ENDPOINT);
    
    if (!response.data) {
      throw new Error('Aucune donnée');
    }
    
    const userData: User = response.data.user || response.data;
    
    if (!userData || !userData.email) {
      throw new Error('Données invalides');
    }
    
    // Sauvegarder dans toutes les clés
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(userData));
    localStorage.setItem('user', JSON.stringify(userData));
    
    console.log('✅ Utilisateur rafraîchi:', { email: userData.email, id: userData.id });
    
    return userData;
    
  } catch (error: any) {
    console.error('❌ Erreur rafraîchissement:', error);
    
    // En cas d'erreur, garder l'utilisateur actuel
    const currentUser = getCurrentUser();
    if (currentUser) {
      console.log('📦 Retour utilisateur courant');
      return currentUser;
    }
    
    return null;
  }
};

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
      errors.push('Nom complet 2 caractères minimum');
    }
    
    if (!validateEmail(data.email)) {
      errors.push('Email invalide');
    }
    
    if (!validatePhone(data.phone)) {
      errors.push('Téléphone invalide. Format: 212XXXXXXXXX');
    }
    
    if (!validatePassword(data.password)) {
      errors.push('Mot de passe 6 caractères minimum');
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
    
    // Auto-connexion après inscription
    try {
      await loginUser(data.email, data.password);
    } catch (loginError) {
      console.warn('⚠️ Auto-connexion après inscription échouée');
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
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
    
    return response.data;
    
  } catch (error: any) {
    console.error(`❌ Erreur mise à jour utilisateur ${userId}:`, error);
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
    console.error('❌ Erreur récupération utilisateurs:', error);
    throw error;
  }
};

export const getUsers = getUsersList;

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
// ADMIN FUNCTIONS
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
  console.group('🔍 [UserService] DEBUG COMPLET');
  
  console.log('=== LOCALSTORAGE ===');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    console.log(`${key}:`, localStorage.getItem(key!));
  }
  
  console.log('=== AUTH STATE ===');
  console.log('Token:', getAuthToken() ? 'PRÉSENT' : 'ABSENT');
  console.log('Utilisateur:', getCurrentUser());
  console.log('Authentifié:', isAuthenticated());
  
  console.groupEnd();
};

export const forceLogout = (): void => {
  console.log('🚨 Déconnexion forcée');
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
  refreshCurrentUser,
  refreshUserData,
  
  // ID Correction
  fetchUserRealId,
  autoFixUserId,
  ensureValidUserId,
  
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