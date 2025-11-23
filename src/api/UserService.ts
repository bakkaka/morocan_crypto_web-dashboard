// src/api/UserService.ts
import api from './axiosConfig';

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

// --- Validation ---
const validateEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const validatePhone = (phone: string) => /^[+]?[(]?[0-9]{1,4}[)]?[-\s.]?[0-9]{1,4}[-\s.]?[0-9]{1,9}$/.test(phone);
const validatePassword = (password: string) => password.length >= 6;

const validateUserData = (data: RegisterUserData) => {
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

// --- Fonctions d'authentification ---

// Connexion utilisateur
export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    console.log('🔐 Tentative de connexion...', { email });

    let response;
    
    try {
      // Route JWT standard (API Platform)
      response = await api.post<LoginResponse>('/authentication_token', {
        email,
        password
      });
    } catch (jwtError) {
      console.log('❌ Route JWT échouée, essai route login custom...');
      // Route login custom
      response = await api.post<LoginResponse>('/login', {
        email,
        password
      });
    }

    console.log('✅ Réponse connexion:', response.data);

    const { token, user } = response.data;

    // Stocker dans localStorage
    if (token) {
      localStorage.setItem('authToken', token);
    }
    if (user) {
      localStorage.setItem('currentUser', JSON.stringify(user));
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('authTimestamp', Date.now().toString());
    }

    return { token, user };

  } catch (error: any) {
    console.error('❌ Erreur de connexion:', error);

    if (error.response?.status === 401) {
      throw new UserServiceError('Email ou mot de passe incorrect', 'UNAUTHORIZED', 401);
    }
    if (error.response?.data?.['hydra:description']) {
      throw new UserServiceError(error.response.data['hydra:description'], 'API_ERROR', error.response.status);
    }
    if (error.code === 'ERR_NETWORK') {
      throw new UserServiceError('Impossible de se connecter au serveur', 'NETWORK_ERROR');
    }

    throw new UserServiceError('Erreur lors de la connexion', 'LOGIN_ERROR');
  }
};

// Déconnexion utilisateur
export const logoutUser = (): void => {
  localStorage.removeItem('authToken');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('authTimestamp');
  console.log('👋 Utilisateur déconnecté');
};

// Récupérer l'utilisateur depuis l'API
export const getCurrentUserFromAPI = async (): Promise<User> => {
  try {
    const response = await api.get<User>('/users/me');
    return response.data;
  } catch (error: any) {
    throw new UserServiceError('Impossible de récupérer l\'utilisateur', 'FETCH_ERROR', error.response?.status);
  }
};

// Récupérer l'utilisateur depuis le localStorage
export const getCurrentUserFromStorage = (): User | null => {
  try {
    const user = localStorage.getItem('currentUser');
    return user ? JSON.parse(user) : null;
  } catch (error) {
    console.error('❌ Erreur parsing user from localStorage');
    return null;
  }
};

// --- Fonctions utilisateur ---

// Inscription utilisateur
export const registerUser = async (data: RegisterUserData): Promise<User> => {
  try {
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

    console.log('📤 Inscription:', { ...payload, plainPassword: '***' });
    const response = await api.post<User>('/users', payload);
    console.log('✅ Inscription réussie:', response.data);
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Erreur inscription:', error);
    
    if (error.response?.data?.['hydra:description']) {
      throw new UserServiceError(error.response.data['hydra:description'], 'API_ERROR', error.response.status);
    }
    if (error.response?.data?.detail) {
      throw new UserServiceError(error.response.data.detail, 'API_ERROR', error.response.status);
    }
    if (error.code === 'ERR_NETWORK') {
      throw new UserServiceError('Impossible de se connecter au serveur', 'NETWORK_ERROR');
    }
    
    throw new UserServiceError('Erreur lors de l\'inscription', 'UNKNOWN_ERROR');
  }
};

// Tester la connexion API
export const testAPIConnection = async (): Promise<{ connected: boolean; message: string }> => {
  try {
    await api.get('/users', { timeout: 5000 });
    return { connected: true, message: 'Serveur OK' };
  } catch {
    return { connected: false, message: 'Serveur non accessible' };
  }
};

// Récupérer tous les utilisateurs (pagination)
export const getUsers = async (page = 1, itemsPerPage = 30): Promise<{ users: User[]; total: number }> => {
  try {
    const response = await api.get<{ 'hydra:member': User[]; 'hydra:totalItems': number }>(
      `/users?page=${page}&itemsPerPage=${itemsPerPage}`
    );
    return { users: response.data['hydra:member'], total: response.data['hydra:totalItems'] };
  } catch (error: any) {
    throw new UserServiceError('Impossible de récupérer les utilisateurs', 'FETCH_ERROR', error.response?.status);
  }
};

// Récupérer un utilisateur par ID
export const getUserById = async (id: number): Promise<User> => {
  if (!id || id <= 0) throw new UserServiceError('ID invalide', 'INVALID_ID');
  try {
    const response = await api.get<User>(`/users/${id}`);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) throw new UserServiceError('Utilisateur non trouvé', 'NOT_FOUND', 404);
    throw new UserServiceError('Impossible de récupérer l\'utilisateur', 'FETCH_ERROR', error.response?.status);
  }
};

// Mettre à jour un utilisateur
export const updateUser = async (id: number, data: UpdateUserData): Promise<User> => {
  if (!id || id <= 0) throw new UserServiceError('ID invalide', 'INVALID_ID');

  if (data.email && !validateEmail(data.email)) throw new UserServiceError('Email invalide');
  if (data.phone && !validatePhone(data.phone)) throw new UserServiceError('Téléphone invalide');

  const payload: any = { ...data };
  if (payload.email) payload.email = payload.email.toLowerCase().trim();
  if (payload.fullName) payload.fullName = payload.fullName.trim();
  if (payload.phone) payload.phone = payload.phone.trim();

  try {
    const response = await api.put<User>(`/users/${id}`, payload);
    return response.data;
  } catch (error: any) {
    if (error.response?.status === 404) throw new UserServiceError('Utilisateur non trouvé', 'NOT_FOUND', 404);
    throw new UserServiceError('Impossible de mettre à jour l\'utilisateur', 'UPDATE_ERROR', error.response?.status);
  }
};

// Supprimer un utilisateur
export const deleteUser = async (id: number): Promise<void> => {
  if (!id || id <= 0) throw new UserServiceError('ID invalide', 'INVALID_ID');

  try {
    await api.delete(`/users/${id}`);
  } catch (error: any) {
    if (error.response?.status === 404) throw new UserServiceError('Utilisateur non trouvé', 'NOT_FOUND', 404);
    throw new UserServiceError('Impossible de supprimer l\'utilisateur', 'DELETE_ERROR', error.response?.status);
  }
};

// Vérifier si un email existe
export const checkEmailExists = async (email: string): Promise<boolean> => {
  if (!validateEmail(email)) return false;
  try {
    const response = await api.get<{ 'hydra:member': User[] }>(`/users?email=${encodeURIComponent(email.toLowerCase())}`);
    return response.data['hydra:member'].length > 0;
  } catch {
    return false;
  }
};

// Rechercher utilisateur par nom
export const searchUsersByName = async (query: string): Promise<User[]> => {
  if (!query || query.trim().length < 2) return [];
  try {
    const response = await api.get<{ 'hydra:member': User[] }>(`/users?fullName=${encodeURIComponent(query.trim())}`);
    return response.data['hydra:member'];
  } catch {
    return [];
  }
};

// Vérifier si l'utilisateur est authentifié
export const isAuthenticated = (): boolean => {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('currentUser');
  return !!(token && user);
};

// Récupérer le token d'authentification
export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

export default {
  // Authentification
  loginUser,
  logoutUser,
  getCurrentUserFromAPI,
  getCurrentUserFromStorage,
  isAuthenticated,
  getAuthToken,
  
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