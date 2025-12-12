// src/api/UserService.ts - VERSION SYMFONY
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

// --- Interfaces ---
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

// --- Fonctions d'authentification SYMFONY ---
export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    console.log('🔐 [UserService] Tentative de connexion Symfony...', { email });

    // IMPORTANT: Symfony utilise /login_check avec email/password
    const response = await api.post('/login_check', {
      username: email,  // Symfony attend "username"
      password: password
    });

    console.log('✅ [UserService] Connexion Symfony réussie');
    
    // Symfony ne renvoie pas de token JWT dans le body
    // L'authentification se fait via cookies/session
    
    // Essayez de récupérer l'utilisateur via session
    let user: User;
    
    try {
      // Tentative 1: Via endpoint user si disponible
      const userResponse = await api.get<User>('/users/me');
      user = userResponse.data;
      console.log('✅ [UserService] Utilisateur récupéré via /users/me');
    } catch (meError: any) {
      console.warn('⚠️ [UserService] /users/me non disponible (erreur:', meError.response?.status || meError.message, ')');
      
      // Tentative 2: Créer un utilisateur basique depuis l'email
      user = {
        id: 0, // Temporaire
        email: email,
        fullName: email.split('@')[0], // Nom basé sur email
        roles: ['ROLE_USER'],
        isVerified: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        reputation: 5.0
      };
      console.log('⚠️ [UserService] Utilisation utilisateur temporaire');
    }

    // Stockage dans localStorage
    localStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('isAuthenticated', 'true');
    localStorage.setItem('authMethod', 'symfony_session');
    localStorage.setItem('authTimestamp', Date.now().toString());

    console.log('💾 [UserService] Utilisateur stocké:', user.email);
    
    return { 
      user,
      message: 'Connexion réussie'
    };

  } catch (error: any) {
    console.error('❌ [UserService] Erreur de connexion:', error);
    
    // Log détaillé
    if (error.response) {
      console.error('📊 Détails erreur:', {
        status: error.response.status,
        data: error.response.data,
        url: error.config?.url
      });
    }
    
    // Nettoyage
    localStorage.removeItem('user');
    localStorage.removeItem('isAuthenticated');
    
    // Gestion erreurs
    if (error.response?.status === 401) {
      throw new UserServiceError('Email ou mot de passe incorrect', 'UNAUTHORIZED', 401);
    }
    
    if (error.response?.status === 400) {
      throw new UserServiceError('Format de requête incorrect', 'BAD_REQUEST', 400);
    }
    
    if (error.code === 'ERR_NETWORK') {
      throw new UserServiceError('Impossible de se connecter au serveur', 'NETWORK_ERROR');
    }

    throw new UserServiceError(
      error.response?.data?.message || 'Erreur lors de la connexion', 
      'LOGIN_ERROR', 
      error.response?.status
    );
  }
};

export const logoutUser = (): void => {
  console.log('👋 [UserService] Déconnexion Symfony');
  
  // Appel API de déconnexion Symfony
  api.post('/auth/logout', {}).catch(err => {
    console.warn('⚠️ Erreur déconnexion API:', err.message);
  });
  
  // Nettoyage local
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('authMethod');
  localStorage.removeItem('authTimestamp');
  
  // Nettoyage cookies
  document.cookie.split(';').forEach(cookie => {
    const name = cookie.split('=')[0].trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
  
  console.log('✅ [UserService] Déconnexion complète');
};

export const getCurrentUserFromStorage = (): User | null => {
  try {
    const userStr = localStorage.getItem('user');
    
    if (!userStr) {
      console.log('🔍 [UserService] Aucun utilisateur en storage');
      return null;
    }

    const user = JSON.parse(userStr);
    
    if (!user || typeof user !== 'object' || !user.email) {
      console.warn('⚠️ [UserService] Structure utilisateur invalide');
      return null;
    }

    console.log('🔍 [UserService] Utilisateur trouvé:', user.email);
    return user;
    
  } catch (error) {
    console.error('❌ [UserService] Erreur parsing user:', error);
    return null;
  }
};

export const getCurrentUserFromAPI = async (): Promise<User | null> => {
  try {
    console.log('🔍 [UserService] Tentative /users/me...');
    
    const response = await api.get<User>('/users/me');
    
    console.log('✅ [UserService] Utilisateur API:', response.data.email);
    return response.data;
    
  } catch (error: any) {
    console.warn('⚠️ [UserService] /users/me non disponible:', {
      status: error.response?.status,
      message: error.message
    });
    
    // Fallback: utiliser storage
    return getCurrentUserFromStorage();
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

export const isAuthenticated = (): boolean => {
  const user = getCurrentUserFromStorage();
  const isAuthFlag = localStorage.getItem('isAuthenticated') === 'true';
  const hasSessionCookie = document.cookie.includes('PHPSESSID');
  
  const authenticated = !!(user && isAuthFlag && hasSessionCookie);
  
  console.log('🔍 [UserService] Vérification auth:', {
    hasUser: !!user,
    isAuthFlag,
    hasSessionCookie,
    authenticated
  });
  
  return authenticated;
};

export const refreshUserData = async (): Promise<User | null> => {
  try {
    const user = await getCurrentUserFromAPI();
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
      console.log('✅ [UserService] Données rafraîchies:', user.email);
    }
    return user;
  } catch (error) {
    console.error('❌ [UserService] Erreur rafraîchissement:', error);
    return null;
  }
};

// --- Fonctions supplémentaires ---
export const getUsers = async (page = 1, itemsPerPage = 30): Promise<{ users: User[]; total: number }> => {
  try {
    console.log('🔍 [UserService] Récupération utilisateurs...');
    
    const response = await api.get<any>('/users');
    
    // Gestion format Hydra
    if (response.data && response.data.member) {
      return { 
        users: response.data.member, 
        total: response.data.totalItems || response.data.member.length
      };
    } else if (Array.isArray(response.data)) {
      return { 
        users: response.data, 
        total: response.data.length
      };
    }
    
    throw new UserServiceError('Structure de réponse inattendue', 'UNEXPECTED_STRUCTURE');
    
  } catch (error: any) {
    console.error('❌ [UserService] Erreur récupération utilisateurs:', error);
    
    if (error.response?.status === 401) {
      throw new UserServiceError('Non autorisé', 'UNAUTHORIZED', 401);
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

export const testAPIConnection = async (): Promise<{ connected: boolean; message: string }> => {
  try {
    await api.get('/', { timeout: 5000 });
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
  refreshUserData,
  registerUser,
  testAPIConnection,
  getUsers,
  getUserById,
  updateUser,
  UserServiceError,
};