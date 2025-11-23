// src/api/AuthService.ts

import api  from './axiosConfig';

export interface LoginData {
  email: string;
  password: string;
}

export interface AuthResponse {
  message: string;
  user: {
    id: number;
    email: string;
    fullName: string;
    phone: string;
    isVerified: boolean;
  };
}

export class AuthServiceError extends Error {
  public code?: string;
  public status?: number;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
    this.status = status;
  }
}

export const loginUser = async (loginData: LoginData): Promise<AuthResponse> => {
  try {
    console.log('🔐 Tentative de connexion...');

    const response = await api.post<AuthResponse>('/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 10000,
    });

    console.log('✅ Réponse connexion:', response.data);

    // Stocker les infos utilisateur dans le localStorage
    if (response.data.user) {
      localStorage.setItem('user', JSON.stringify(response.data.user));
      localStorage.setItem('isAuthenticated', 'true');
      localStorage.setItem('authTimestamp', Date.now().toString());
    }

    return response.data;

  } catch (error: any) {
    console.error('❌ Erreur de connexion:', error);

    // Gestion des erreurs HTTP
    if (error.response) {
      const { status, data } = error.response;

      switch (status) {
        case 400:
          throw new AuthServiceError(data.message || 'Données invalides', 'BAD_REQUEST', status);
        
        case 401:
          throw new AuthServiceError(data.message || 'Email ou mot de passe incorrect', 'UNAUTHORIZED', status);
        
        case 404:
          throw new AuthServiceError('Service de connexion indisponible', 'NOT_FOUND', status);
        
        case 500:
          throw new AuthServiceError('Erreur interne du serveur', 'SERVER_ERROR', status);
        
        default:
          throw new AuthServiceError(data.message || `Erreur serveur (${status})`, 'HTTP_ERROR', status);
      }
    }

    // Gestion des erreurs réseau
    if (error.code === 'ERR_NETWORK') {
      throw new AuthServiceError('Impossible de se connecter au serveur', 'NETWORK_ERROR');
    }

    if (error.code === 'ECONNABORTED') {
      throw new AuthServiceError('La requête a expiré', 'TIMEOUT_ERROR');
    }

    throw new AuthServiceError(error.message || 'Erreur inconnue', 'UNKNOWN_ERROR');
  }
};

export const logoutUser = (): void => {
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('authTimestamp');
  console.log('👋 Utilisateur déconnecté');
};

export const getCurrentUser = () => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const isAuthenticated = (): boolean => {
  return localStorage.getItem('isAuthenticated') === 'true';
};

export const getAuthToken = (): string | null => {
  return localStorage.getItem('authToken');
};

// Réutilisez la même fonction testAPIConnection que UserService
export { testAPIConnection } from './UserService';