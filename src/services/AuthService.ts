// src/services/AuthService.ts
import api from '../api/axiosConfig';

// Interfaces
export interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  reputation?: number;
  isVerified: boolean;
  walletAddress?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface LoginResponse {
  user: User;
  token?: string;
  message: string;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

// Erreur personnalisée
export class AuthServiceError extends Error {
  public code?: string;
  public status?: number;
  public details?: any;

  constructor(message: string, code?: string, status?: number, details?: any) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

// Fonctions d'authentification
export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    const response = await api.post<LoginResponse>('auth/login', {
      email,
      password
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data?.message) {
      throw new AuthServiceError(
        error.response.data.message,
        'LOGIN_ERROR',
        error.response.status,
        error.response.data
      );
    }
    throw new AuthServiceError('Erreur lors de la connexion', 'NETWORK_ERROR');
  }
};

export const registerUser = async (userData: RegisterData): Promise<User> => {
  try {
    const response = await api.post<User>('/users', {
      email: userData.email,
      plainPassword: userData.password,
      fullName: userData.fullName,
      phone: userData.phone
    });
    return response.data;
  } catch (error: any) {
    if (error.response?.data) {
      const message = error.response.data['hydra:description'] || error.response.data.message || 'Erreur lors de l\'inscription';
      throw new AuthServiceError(
        message,
        'REGISTER_ERROR',
        error.response.status,
        error.response.data
      );
    }
    throw new AuthServiceError('Erreur lors de l\'inscription', 'NETWORK_ERROR');
  }
};

export const logoutUser = async (): Promise<void> => {
  try {
    // Si vous avez un endpoint de déconnexion
    // await api.post('/auth/logout');
    
    // Pour l'instant, on fait juste une déconnexion côté client
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  } catch (error: any) {
    console.error('Erreur lors de la déconnexion:', error);
    // On nettoie quand même le localStorage même en cas d'erreur
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
  }
};

// Vérification du token
export const verifyToken = async (): Promise<User> => {
  try {
    const response = await api.get<User>('/users/me');
    return response.data;
  } catch (error: any) {
    throw new AuthServiceError('Token invalide', 'TOKEN_ERROR', error.response?.status);
  }
};

// Récupération de l'utilisateur courant
export const getCurrentUser = async (): Promise<User | null> => {
  const token = localStorage.getItem('authToken');
  const userData = localStorage.getItem('userData');
  
  if (!token || !userData) {
    return null;
  }
  
  try {
    // Option 1: Utiliser les données en cache
    return JSON.parse(userData);
    
    // Option 2: Rafraîchir depuis l'API (décommentez si vous voulez)
    // return await verifyToken();
  } catch (error) {
    console.error('Erreur lors de la récupération de l\'utilisateur:', error);
    return null;
  }
};

export default {
  loginUser,
  registerUser,
  logoutUser,
  verifyToken,
  getCurrentUser,
  AuthServiceError
};