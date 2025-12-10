// src/api/UserService.ts
import api from './axiosConfig';
import type { User } from '../types/User';

// --- Erreur personnalisée ---
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

// --- Interfaces COMPLÈTES ---
export interface RegisterUserData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginData {
  email: string;
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

// --- Validation ---
const validateEmail = (email: string): boolean => 
  /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

const validatePhone = (phone: string): boolean => 
  /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/.test(phone);

const validatePassword = (password: string): boolean => 
  password.length >= 6;

const validateUserData = (data: RegisterUserData): void => {
  if (!data.fullName || data.fullName.trim().length < 2) {
    throw new UserServiceError('Le nom complet doit contenir au moins 2 caractères', 'VALIDATION_ERROR');
  }
  if (!data.email || !validateEmail(data.email)) {
    throw new UserServiceError('Email invalide', 'VALIDATION_ERROR');
  }
  if (!data.phone || !validatePhone(data.phone)) {
    throw new UserServiceError('Téléphone invalide', 'VALIDATION_ERROR');
  }
  if (!data.password || !validatePassword(data.password)) {
    throw new UserServiceError('Le mot de passe doit contenir au moins 6 caractères', 'VALIDATION_ERROR');
  }
};

// --- Gestion du Token JWT ---
const decodeJWT = (token: string): any => {
  try {
    const payload = token.split('.')[1];
    const decoded = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    return JSON.parse(decoded);
  } catch (error) {
    console.error('❌ [UserService] Erreur décodage JWT:', error);
    return null;
  }
};

const isTokenExpired = (token: string): boolean => {
  try {
    const payload = decodeJWT(token);
    if (!payload || !payload.exp) return true;
    const currentTime = Math.floor(Date.now() / 1000);
    return payload.exp < currentTime;
  } catch {
    return true;
  }
};

const extractUserFromToken = (token: string, email: string): User => {
  try {
    const payload = decodeJWT(token);
    
    if (!payload) {
      throw new UserServiceError('Token invalide', 'INVALID_TOKEN');
    }

    const user: User = {
      id: payload.id || payload.userId || 0,
      email: payload.username || payload.email || email,
      fullName: payload.fullName || payload.fullname || 'Utilisateur',
      roles: Array.isArray(payload.roles) ? payload.roles : 
             (payload.roles ? [payload.roles] : ['ROLE_USER']),
      isVerified: payload.isVerified || false,
      createdAt: payload.createdAt || new Date().toISOString(),
      updatedAt: payload.updatedAt || new Date().toISOString(),
      walletAddress: payload.walletAddress,
      reputation: payload.reputation || 5.0
    };

    console.log('👤 [UserService] Utilisateur extrait du token:', user.email);
    return user;

  } catch (error) {
    console.error('❌ [UserService] Erreur extraction utilisateur du token:', error);
    return {
      id: 0,
      email: email,
      fullName: 'Utilisateur',
      roles: ['ROLE_USER'],
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      reputation: 5.0
    };
  }
};

// --- Fonctions d'authentification ---
export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    console.log('🔐 [UserService] Tentative de connexion JWT...', { email, password: '***' });

    // AJOUT : Log des données envoyées pour debug
    const requestData = {
      email: email,    // ESSAYEZ AVEC "email" D'ABORD
      password: password
    };
    
    console.log('📤 [UserService] Données envoyées au serveur:', requestData);

    // ESSAYEZ LE FORMAT "email" D'ABORD (celui qui marche avec PowerShell)
    let loginResponse;
    
    try {
      // Tentative 1 : Avec le champ "email" (comme PowerShell)
      loginResponse = await api.post<{ token: string }>('/login_check', requestData);
      console.log('✅ [UserService] Connexion réussie avec format "email"');
    } catch (emailFormatError: any) {
      console.log('⚠️ [UserService] Format "email" échoué, tentative avec "username"...');
      
      // Tentative 2 : Avec le champ "username" (format original)
      const requestDataWithUsername = {
        username: email,  // Utilisation de "username" au lieu de "email"
        password: password
      };
      
      loginResponse = await api.post<{ token: string }>('/login_check', requestDataWithUsername);
      console.log('✅ [UserService] Connexion réussie avec format "username"');
    }

    console.log('✅ [UserService] Token JWT reçu');
    const { token } = loginResponse!.data;

    if (!token) {
      throw new UserServiceError('Token non reçu du serveur', 'NO_TOKEN');
    }

    if (isTokenExpired(token)) {
      throw new UserServiceError('Token expiré', 'TOKEN_EXPIRED');
    }

    const user = extractUserFromToken(token, email);
    let completeUser = user;

    try {
      console.log('🔍 [UserService] Tentative de récupération des données complètes...');
      const userResponse = await api.get<User>('/users/me', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      completeUser = userResponse.data;
      console.log('✅ [UserService] Données complètes récupérées');
    } catch (apiError) {
      console.warn('⚠️ [UserService] Endpoint /users/me non disponible, utilisation des données du token');
    }

    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(completeUser));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('authTimestamp', Date.now().toString());

    console.log('💾 [UserService] Données sauvegardées:');
    console.log('   - User:', completeUser.email);
    console.log('   - Roles:', completeUser.roles);

    return { token, user: completeUser };

  } catch (error: any) {
    console.error('❌ [UserService] Erreur de connexion JWT:', error);
    
    // AJOUT : Log détaillé pour debug
    if (error.response) {
      console.error('📊 [UserService] Détails de l\'erreur:');
      console.error('   - Status:', error.response.status);
      console.error('   - Data:', error.response.data);
      console.error('   - URL:', error.response.config?.url);
      console.error('   - Method:', error.response.config?.method);
      console.error('   - Request Data:', error.response.config?.data);
    }
    
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAuthenticated');
    
    if (error.response?.status === 401) {
      throw new UserServiceError('Email ou mot de passe incorrect', 'UNAUTHORIZED', 401);
    }
    
    if (error.response?.status === 400) {
      throw new UserServiceError('Format de requête incorrect. Vérifiez les champs envoyés.', 'BAD_REQUEST', 400);
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new UserServiceError('Impossible de se connecter au serveur', 'NETWORK_ERROR');
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
  console.log('👋 [UserService] Déconnexion utilisateur');
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('authTimestamp');
  console.log('✅ [UserService] Données supprimées du localStorage');
};

export const getCurrentUserFromStorage = (): User | null => {
  try {
    const userStr = localStorage.getItem('currentUser');
    
    if (!userStr) {
      return null;
    }

    if (userStr === 'null' || userStr === 'undefined' || userStr.trim() === '') {
      console.warn('⚠️ [UserService] Données utilisateur invalides, nettoyage...');
      localStorage.removeItem('currentUser');
      return null;
    }

    const user = JSON.parse(userStr);
    
    if (!user || typeof user !== 'object' || !user.email) {
      console.warn('⚠️ [UserService] Structure utilisateur invalide, nettoyage...');
      localStorage.removeItem('currentUser');
      return null;
    }

    console.log('🔍 [UserService] Utilisateur trouvé dans localStorage:', user.email);
    return user;
    
  } catch (error) {
    console.error('❌ [UserService] Erreur parsing user from localStorage:', error);
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('isAuthenticated');
    return null;
  }
};

export const getCurrentUserFromAPI = async (): Promise<User> => {
  try {
    const token = localStorage.getItem('authToken');
    if (!token) {
      throw new UserServiceError('Token non disponible', 'NO_TOKEN');
    }

    console.log('🔍 [UserService] Récupération utilisateur depuis API...');
    const response = await api.get<User>('/users/me', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    console.log('✅ [UserService] Utilisateur récupéré depuis API:', response.data.email);
    return response.data;
  } catch (error: any) {
    console.error('❌ [UserService] Erreur récupération utilisateur API:', error);
    throw new UserServiceError(
      'Impossible de récupérer l\'utilisateur', 
      'FETCH_ERROR', 
      error.response?.status
    );
  }
};

// --- Fonctions utilisateur ---
export const registerUser = async (data: RegisterUserData): Promise<User> => {
  try {
    console.log('📝 [UserService] Début inscription...');
    validateUserData(data);

    const payload = {
      fullName: data.fullName.trim(),
      email: data.email.toLowerCase().trim(),
      phone: data.phone.trim(),
      plainPassword: data.password,
      roles: ['ROLE_USER'],
      isVerified: false,
      reputation: 5.0,
    };

    console.log('📤 [UserService] Envoi inscription...');
    const response = await api.post<User>('/users', payload);
    console.log('✅ [UserService] Inscription réussie:', response.data.email);
    
    return response.data;
  } catch (error: any) {
    console.error('❌ [UserService] Erreur inscription:', error);
    
    if (error.response?.data?.['hydra:description']) {
      throw new UserServiceError(
        error.response.data['hydra:description'], 
        'API_ERROR', 
        error.response.status
      );
    }
    
    if (error.response?.data?.detail) {
      throw new UserServiceError(
        error.response.data.detail, 
        'API_ERROR', 
        error.response.status
      );
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new UserServiceError('Impossible de se connecter au serveur', 'NETWORK_ERROR');
    }
    
    throw new UserServiceError('Erreur lors de l\'inscription', 'UNKNOWN_ERROR');
  }
};

export const promoteToAdmin = async (userId: number): Promise<User> => {
  if (!userId || userId <= 0) {
    throw new UserServiceError('ID utilisateur invalide', 'INVALID_ID');
  }

  try {
    console.log('🔄 [UserService] Promotion en admin:', userId);
    
    const currentUser = await getUserById(userId);
    const newRoles = Array.isArray(currentUser.roles) 
      ? [...currentUser.roles, 'ROLE_ADMIN']
      : ['ROLE_USER', 'ROLE_ADMIN'];

    const response = await api.put<User>(`/users/${userId}`, {
      ...currentUser,
      roles: newRoles
    });

    console.log('✅ [UserService] Utilisateur promu admin:', response.data.email);
    return response.data;

  } catch (error: any) {
    console.error('❌ [UserService] Erreur promotion admin:', error);
    
    if (error.response?.status === 404) {
      throw new UserServiceError('Utilisateur non trouvé', 'NOT_FOUND', 404);
    }
    
    throw new UserServiceError(
      'Impossible de promouvoir l\'utilisateur', 
      'PROMOTION_ERROR', 
      error.response?.status
    );
  }
};

export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('authToken');
  const user = getCurrentUserFromStorage();
  
  if (!token || !user) {
    return false;
  }

  if (isTokenExpired(token)) {
    console.warn('⚠️ [UserService] Token expiré, déconnexion automatique');
    logoutUser();
    return false;
  }

  return true;
};

export const getAuthToken = (): string | null => {
  const token = localStorage.getItem('authToken');
  
  if (token && isTokenExpired(token)) {
    console.warn('⚠️ [UserService] Token expiré, suppression...');
    logoutUser();
    return null;
  }
  
  return token;
};

export const refreshUserData = async (): Promise<User | null> => {
  try {
    console.log('🔄 [UserService] Rafraîchissement données utilisateur...');
    const user = await getCurrentUserFromAPI();
    localStorage.setItem('currentUser', JSON.stringify(user));
    console.log('✅ [UserService] Données utilisateur rafraîchies:', user.email);
    return user;
  } catch (error) {
    console.error('❌ [UserService] Erreur rafraîchissement utilisateur:', error);
    return null;
  }
};

// --- Fonctions supplémentaires ---
export const getUsers = async (page = 1, itemsPerPage = 30): Promise<{ users: User[]; total: number }> => {
  try {
    console.log('🔍 [UserService] Récupération des utilisateurs...', { page, itemsPerPage });
    
    const response = await api.get<any>('/users');
    
    console.log('📦 [UserService] Réponse brute:', response.data);
    
    if (response.data && response.data.member) {
      console.log('✅ [UserService] Utilisateurs trouvés:', response.data.member.length);
      return { 
        users: response.data.member, 
        total: response.data.totalItems || response.data.member.length
      };
    } else if (Array.isArray(response.data)) {
      console.log('✅ [UserService] Tableau simple détecté');
      return { 
        users: response.data, 
        total: response.data.length
      };
    } else {
      console.log('❌ [UserService] Structure inattendue:', response.data);
      throw new UserServiceError('Structure de réponse inattendue', 'UNEXPECTED_STRUCTURE');
    }
    
  } catch (error: any) {
    console.error('❌ [UserService] Erreur récupération utilisateurs:', error);
    
    if (error.response?.status === 401) {
      throw new UserServiceError('Non autorisé', 'UNAUTHORIZED', 401);
    }
    
    if (error.response?.status === 403) {
      throw new UserServiceError('Accès refusé', 'FORBIDDEN', 403);
    }
    
    throw new UserServiceError(
      'Impossible de récupérer les utilisateurs', 
      'FETCH_ERROR', 
      error.response?.status
    );
  }
};

export const getUserById = async (id: number): Promise<User> => {
  if (!id || id <= 0) {
    throw new UserServiceError('ID invalide', 'INVALID_ID');
  }
  
  try {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new UserServiceError('Utilisateur non trouvé', 'NOT_FOUND', 404);
    }
    throw new UserServiceError(
      'Impossible de récupérer l\'utilisateur', 
      'FETCH_ERROR', 
      error.response?.status
    );
  }
};

export const updateUser = async (id: number, data: UpdateUserData): Promise<User> => {
  if (!id || id <= 0) {
    throw new UserServiceError('ID invalide', 'INVALID_ID');
  }

  if (data.email && !validateEmail(data.email)) {
    throw new UserServiceError('Email invalide', 'VALIDATION_ERROR');
  }
  
  if (data.phone && !validatePhone(data.phone)) {
    throw new UserServiceError('Téléphone invalide', 'VALIDATION_ERROR');
  }

  const payload: any = { ...data };
  if (payload.email) payload.email = payload.email.toLowerCase().trim();
  if (payload.fullName) payload.fullName = payload.fullName.trim();
  if (payload.phone) payload.phone = payload.phone.trim();

  try {
    const response = await api.put<User>(`/users/${id}`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new UserServiceError('Utilisateur non trouvé', 'NOT_FOUND', 404);
    }
    throw new UserServiceError(
      'Impossible de mettre à jour l\'utilisateur', 
      'UPDATE_ERROR', 
      error.response?.status
    );
  }
};

export const deleteUser = async (id: number): Promise<void> => {
  if (!id || id <= 0) {
    throw new UserServiceError('ID invalide', 'INVALID_ID');
  }

  try {
    await api.delete(`/users/${id}`);
  } catch (error: any) {
    if (error.response?.status === 404) {
      throw new UserServiceError('Utilisateur non trouvé', 'NOT_FOUND', 404);
    }
    throw new UserServiceError(
      'Impossible de supprimer l\'utilisateur', 
      'DELETE_ERROR', 
      error.response?.status
    );
  }
};

export const checkEmailExists = async (email: string): Promise<boolean> => {
  if (!validateEmail(email)) return false;
  
  try {
    const response = await api.get<{ 'hydra:member': User[] }>(
      `/users?email=${encodeURIComponent(email.toLowerCase())}`
    );
    return response.data['hydra:member'].length > 0;
  } catch {
    return false;
  }
};

export const searchUsersByName = async (query: string): Promise<User[]> => {
  if (!query || query.trim().length < 2) return [];
  
  try {
    const response = await api.get<{ 'hydra:member': User[] }>(
      `/users?fullName=${encodeURIComponent(query.trim())}`
    );
    return response.data['hydra:member'];
  } catch {
    return [];
  }
};

export const testAPIConnection = async (): Promise<{ connected: boolean; message: string }> => {
  try {
    await api.get('/docs', { timeout: 5000 });
    return { connected: true, message: 'Serveur OK' };
  } catch (error) {
    return { connected: false, message: 'Serveur non accessible' };
  }
};

// Export par défaut
export default {
  loginUser,
  logoutUser,
  getCurrentUserFromAPI,
  getCurrentUserFromStorage,
  isAuthenticated,
  getAuthToken,
  refreshUserData,
  registerUser,
  promoteToAdmin,
  testAPIConnection,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  checkEmailExists,
  searchUsersByName,
  UserServiceError,
};