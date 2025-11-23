// src/api/UserService.ts
import api from './axiosConfig';

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

// --- Interfaces ---
export interface User {
  id: number;
  fullName: string;
  email: string;
  phone: string;
  reputation?: number;
  isVerified: boolean;
  createdAt: string;
  updatedAt?: string;
  roles?: string[];
  isActive?: boolean;
}

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

/**
 * Décoder le payload JWT sans vérification
 */
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

/**
 * Vérifier si le token est expiré
 */
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

/**
 * Extraire les informations utilisateur du token JWT
 */
const extractUserFromToken = (token: string, email: string): User => {
  try {
    const payload = decodeJWT(token);
    
    if (!payload) {
      throw new UserServiceError('Token invalide', 'INVALID_TOKEN');
    }

    // Créer l'objet utilisateur à partir du payload JWT
    const user: User = {
      id: payload.id || payload.userId || 0,
      email: payload.username || payload.email || email,
      fullName: payload.fullName || payload.fullname || 'Utilisateur',
      phone: payload.phone || '',
      isVerified: payload.isVerified || false,
      reputation: payload.reputation || 5.0,
      roles: Array.isArray(payload.roles) ? payload.roles : 
             (payload.roles ? [payload.roles] : ['ROLE_USER']),
      createdAt: payload.createdAt || new Date().toISOString(),
      isActive: payload.isActive !== undefined ? payload.isActive : true
    };

    console.log('👤 [UserService] Utilisateur extrait du token:', user.email);
    return user;

  } catch (error) {
    console.error('❌ [UserService] Erreur extraction utilisateur du token:', error);
    
    // Fallback: utilisateur basique
    return {
      id: 0,
      email: email,
      fullName: 'Utilisateur',
      phone: '',
      isVerified: false,
      reputation: 5.0,
      roles: ['ROLE_USER'],
      createdAt: new Date().toISOString(),
      isActive: true
    };
  }
};

// --- Fonctions d'authentification ---

/**
 * Connexion utilisateur avec JWT (SOLUTION OPTIMISÉE)
 */
export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    console.log('🔐 [UserService] Tentative de connexion JWT...', { email });

    // Étape 1: Obtenir le token JWT
    const loginResponse = await api.post<{ token: string }>('/login_check', {
      username: email,
      password
    });

    console.log('✅ [UserService] Token JWT reçu');

    const { token } = loginResponse.data;

    if (!token) {
      throw new UserServiceError('Token non reçu du serveur', 'NO_TOKEN');
    }

    // Vérifier que le token est valide
    if (isTokenExpired(token)) {
      throw new UserServiceError('Token expiré', 'TOKEN_EXPIRED');
    }

    // Étape 2: Extraire les données utilisateur du token
    const user = extractUserFromToken(token, email);

    // Étape 3: Tenter de récupérer les données complètes depuis l'API
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
      // On continue avec les données du token
    }

    // Stocker dans localStorage
    localStorage.setItem('authToken', token);
    localStorage.setItem('currentUser', JSON.stringify(completeUser));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('authTimestamp', Date.now().toString());

    // Logs de vérification
    console.log('💾 [UserService] Données sauvegardées:');
    console.log('   - Token:', `PRÉSENT (${token.substring(0, 20)}...)`);
    console.log('   - User:', completeUser.email);
    console.log('   - Roles:', completeUser.roles);

    return { token, user: completeUser };

  } catch (error: any) {
    console.error('❌ [UserService] Erreur de connexion JWT:', error);
    
    // Nettoyage en cas d'erreur
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('isAuthenticated');
    
    if (error.response?.status === 401) {
      throw new UserServiceError('Email ou mot de passe incorrect', 'UNAUTHORIZED', 401);
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

/**
 * Déconnexion utilisateur
 */
export const logoutUser = (): void => {
  console.log('👋 [UserService] Déconnexion utilisateur');
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('authTimestamp');
  console.log('✅ [UserService] Données supprimées du localStorage');
};

/**
 * Récupérer l'utilisateur depuis le localStorage
 */
export const getCurrentUserFromStorage = (): User | null => {
  try {
    const userStr = localStorage.getItem('currentUser');
    
    if (!userStr) {
      return null;
    }

    // Vérifications de sécurité
    if (userStr === 'null' || userStr === 'undefined' || userStr.trim() === '') {
      console.warn('⚠️ [UserService] Données utilisateur invalides, nettoyage...');
      localStorage.removeItem('currentUser');
      return null;
    }

    const user = JSON.parse(userStr);
    
    // Vérifier que l'utilisateur a une structure valide
    if (!user || typeof user !== 'object' || !user.email) {
      console.warn('⚠️ [UserService] Structure utilisateur invalide, nettoyage...');
      localStorage.removeItem('currentUser');
      return null;
    }

    console.log('🔍 [UserService] Utilisateur trouvé dans localStorage:', user.email);
    return user;
    
  } catch (error) {
    console.error('❌ [UserService] Erreur parsing user from localStorage:', error);
    
    // Nettoyage automatique en cas d'erreur
    localStorage.removeItem('currentUser');
    localStorage.removeItem('authToken');
    localStorage.removeItem('isAuthenticated');
    
    return null;
  }
};

/**
 * Récupérer l'utilisateur depuis l'API
 */
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

/**
 * Inscription utilisateur
 */
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

/**
 * Vérifier si l'utilisateur est authentifié
 */
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('authToken');
  const user = getCurrentUserFromStorage();
  
  if (!token || !user) {
    return false;
  }

  // Vérifier que le token n'est pas expiré
  if (isTokenExpired(token)) {
    console.warn('⚠️ [UserService] Token expiré, déconnexion automatique');
    logoutUser();
    return false;
  }

  return true;
};

/**
 * Récupérer le token d'authentification
 */
export const getAuthToken = (): string | null => {
  const token = localStorage.getItem('authToken');
  
  if (token && isTokenExpired(token)) {
    console.warn('⚠️ [UserService] Token expiré, suppression...');
    logoutUser();
    return null;
  }
  
  return token;
};

/**
 * Rafraîchir les données utilisateur
 */
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
    const response = await api.get<{ 'hydra:member': User[]; 'hydra:totalItems': number }>(
      `/users?page=${page}&itemsPerPage=${itemsPerPage}`
    );
    
    return { 
      users: response.data['hydra:member'], 
      total: response.data['hydra:totalItems'] 
    };
  } catch (error: any) {
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

/**
 * Tester la connexion API
 */
export const testAPIConnection = async (): Promise<{ connected: boolean; message: string }> => {
  try {
    await api.get('/users', { timeout: 5000 });
    return { connected: true, message: 'Serveur OK' };
  } catch (error) {
    return { connected: false, message: 'Serveur non accessible' };
  }
};

// Export par défaut pour la compatibilité
export default {
  // Authentification
  loginUser,
  logoutUser,
  getCurrentUserFromAPI,
  getCurrentUserFromStorage,
  isAuthenticated,
  getAuthToken,
  refreshUserData,
  
  // Gestion utilisateurs
  registerUser,
  testAPIConnection,
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  checkEmailExists,
  searchUsersByName,
  
  // Erreurs
  UserServiceError,
};