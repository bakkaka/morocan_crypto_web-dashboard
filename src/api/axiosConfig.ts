// src/api/axiosConfig.ts - VERSION SANS DUPLICATION
import axios from 'axios';
import { clearAuthData } from './UserService';

// ==============================
// CONFIGURATION DE BASE
// ==============================

// URL de l'API - Production vs Développement
const API_URL = import.meta.env.VITE_API_URL || 'https://morocancryptobackend-production-f3b6.up.railway.app/api';

// Vérification environnement
const IS_DEV = typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.includes('local'));

// ==============================
// CONFIGURATION AXIOS
// ==============================

const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Accept': 'application/ld+json', // ⭐ CRITIQUE : Format ApiPlatform
  },
});

// ==============================
// FONCTIONS UTILITAIRES
// ==============================

/**
 * Récupère le token JWT depuis le localStorage
 */
const getAuthToken = (): string | null => {
  const tokenKeys = ['auth_token', 'jwt_token', 'token'];
  
  for (const key of tokenKeys) {
    const token = localStorage.getItem(key);
    if (token) {
      return token;
    }
  }
  return null;
};

// ==============================
// INTERCEPTEUR DE REQUÊTES
// ==============================

api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    
    // Ajouter le token d'authentification
    if (token) {
      const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
      config.headers.Authorization = `Bearer ${cleanToken}`;
      
      if (IS_DEV) {
        console.log(`🔑 Token ajouté pour ${config.method?.toUpperCase()} ${config.url}`);
      }
    }
    
    // Ajouter Content-Type pour les requêtes avec corps
    if (['post', 'put', 'patch'].includes(config.method?.toLowerCase() || '')) {
      config.headers['Content-Type'] = 'application/json';
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Erreur intercepteur requête:', error);
    return Promise.reject(error);
  }
);

// ==============================
// INTERCEPTEUR DE RÉPONSES
// ==============================

api.interceptors.response.use(
  (response) => {
    // Sauvegarder nouveau token si présent
    if (response.data?.token) {
      localStorage.setItem('auth_token', response.data.token);
      api.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
    }
    
    return response;
  },
  async (error) => {
    const { config, response } = error;
    const url = config?.url;
    const status = response?.status;
    
    // Gestion spécifique pour /users/me 500
    if (url?.includes('/users/me') && status === 500) {
      const userKeys = ['user', 'current_user'];
      for (const key of userKeys) {
        try {
          const stored = localStorage.getItem(key);
          if (stored) {
            const userData = JSON.parse(stored);
            if (userData?.email) {
              return Promise.resolve({
                data: userData,
                status: 200,
                statusText: 'OK',
                headers: {},
                config
              });
            }
          }
        } catch (e) {
          continue;
        }
      }
    }
    
    // Gestion erreur 401
    if (status === 401 && !url?.includes('/users/me')) {
      clearAuthData();
      if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
        setTimeout(() => {
          window.location.href = `/login?redirect=${encodeURIComponent(window.location.pathname)}`;
        }, 1000);
      }
    }
    
    return Promise.reject(error);
  }
);

// ==============================
// FONCTIONS D'UTILITÉ (EXPORTÉES)
// ==============================

/**
 * Teste la connexion à l'API
 */
export const testConnection = async (): Promise<boolean> => {
  try {
    const response = await api.get('/currencies', { timeout: 5000 });
    return response.status === 200;
  } catch {
    return false;
  }
};

/**
 * Obtient le statut de l'API
 */
export const getApiStatus = async () => {
  const start = Date.now();
  
  try {
    const response = await api.get('/currencies', { timeout: 10000 });
    return {
      connected: true,
      responseTime: Date.now() - start,
      status: response.status,
      url: API_URL
    };
  } catch (error: any) {
    return {
      connected: false,
      responseTime: Date.now() - start,
      status: error.response?.status || 0,
      url: API_URL,
      error: error.message
    };
  }
};

/**
 * Débogue l'état d'authentification
 */
export const debugAuth = (): void => {
  console.group('🔍 DÉBOGAGE AUTH');
  console.log('API_URL:', API_URL);
  console.log('Tokens:', {
    auth_token: localStorage.getItem('auth_token') ? '✓' : '✗',
    jwt_token: localStorage.getItem('jwt_token') ? '✓' : '✗'
  });
  console.groupEnd();
};

/**
 * Met à jour le token d'authentification
 */
export const updateToken = (token: string): void => {
  localStorage.setItem('auth_token', token);
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
};

// ==============================
// EXPORT PAR DÉFAUT
// ==============================

export default api;
export { API_URL, IS_DEV };