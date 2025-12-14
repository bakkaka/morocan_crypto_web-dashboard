// src/api/axiosConfig.ts - VERSION SANS process.env
import axios from 'axios';

const API_URL = 'https://morocancryptobackend-production-f3b6.up.railway.app/api';

// Déterminer si on est en développement
const IS_DEV = 
  typeof window !== 'undefined' && 
  (window.location.hostname === 'localhost' || 
   window.location.hostname === '127.0.0.1' ||
   window.location.hostname.includes('local'));

// Configuration de base d'axios
const api = axios.create({
  baseURL: API_URL,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
});

// ==============================
// INTERCEPTEUR DE REQUÊTES
// ==============================

api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('jwt_token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      
      // Log en développement
      if (IS_DEV) {
        console.log(`🔑 Token ajouté pour: ${config.url}`);
      }
    } else {
      const protectedRoutes = ['/users/me', '/user_bank_details', '/ads', '/currencies'];
      const isProtectedRoute = protectedRoutes.some(route => 
        config.url?.includes(route) && config.method !== 'get'
      );
      
      if (isProtectedRoute) {
        console.warn(`⚠️ Pas de token pour ${config.method?.toUpperCase()} ${config.url}`);
      }
    }
    
    // Log détaillé en développement
    if (IS_DEV) {
      console.log(`➡️ ${config.method?.toUpperCase()} ${config.url}`, {
        hasToken: !!token,
        timeout: config.timeout
      });
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Erreur dans l\'intercepteur de requête:', error);
    return Promise.reject(error);
  }
);

// ==============================
// INTERCEPTEUR DE RÉPONSES
// ==============================

api.interceptors.response.use(
  (response) => {
    // Log des réponses réussies en développement
    if (IS_DEV) {
      console.log(`✅ ${response.status} ${response.config.url}`, {
        data: response.data,
        status: response.status
      });
    }
    
    return response;
  },
  (error) => {
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    const status = error.response?.status;
    const data = error.response?.data;
    
    const isMeEndpoint = url && url.includes('/users/me');
    
    // GESTION SPÉCIALE POUR /users/me (erreur 500 connue)
    if (isMeEndpoint && status === 500) {
      console.warn('⚠️ [API] /users/me retourne 500 (problème connu côté Symfony)');
      
      const storedUser = localStorage.getItem('user');
      let userData = null;
      
      try {
        userData = storedUser ? JSON.parse(storedUser) : null;
      } catch (e) {
        console.warn('⚠️ Impossible de parser l\'utilisateur stocké');
      }
      
      return Promise.resolve({
        data: {
          user: userData,
          message: 'Données utilisateur récupérées depuis le stockage local'
        },
        status: 200,
        statusText: 'OK',
        headers: {},
        config: error.config
      });
    }
    
    // LOG DÉTAILLÉ DES AUTRES ERREURS
    if (error.response) {
      console.error(`❌ [API] Erreur ${status} ${method} ${url}:`, {
        status: status,
        data: data,
        config: {
          method: method,
          url: url,
          data: error.config?.data ? JSON.parse(error.config.data) : null
        }
      });
      
      // 401 Unauthorized
      if (status === 401 && !isMeEndpoint) {
        console.warn('🚨 Session expirée ou token invalide');
        
        setTimeout(() => {
          localStorage.removeItem('jwt_token');
          localStorage.removeItem('user');
          console.log('🧹 Données d\'authentification nettoyées');
          
          if (!window.location.pathname.includes('/login')) {
            window.location.href = '/login';
          }
        }, 1000);
      }
      
      // 403 Forbidden
      else if (status === 403) {
        console.warn('🚫 Accès refusé - Permissions insuffisantes');
      }
      
      // 404 Not Found
      else if (status === 404) {
        console.warn('🔍 Ressource non trouvée');
      }
      
      // 429 Too Many Requests
      else if (status === 429) {
        console.warn('⏰ Trop de requêtes - Attendez quelques secondes');
      }
      
      // 500 Internal Server Error (général)
      else if (status === 500 && !isMeEndpoint) {
        console.error('💥 Erreur serveur interne');
      }
      
    } else if (error.request) {
      console.error('🌐 Pas de réponse du serveur. Vérifiez:', {
        message: error.message,
        url: url,
        possibleCauses: [
          'Connexion internet perdue',
          'Serveur hors ligne',
          'Problème CORS',
          'Timeout de la requête'
        ]
      });
    } else {
      console.error('⚙️ Erreur de configuration axios:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// ==============================
// FONCTIONS UTILITAIRES EXPORTÉES
// ==============================

export const testConnection = async (): Promise<boolean> => {
  try {
    const response = await api.get('/', { timeout: 5000 });
    return response.status === 200;
  } catch (error) {
    console.warn('⚠️ Test de connexion échoué:', error);
    return false;
  }
};

export const getApiStatus = async (): Promise<{
  connected: boolean;
  responseTime: number;
  status: number;
}> => {
  const startTime = Date.now();
  
  try {
    const response = await api.get('/', { timeout: 10000 });
    const responseTime = Date.now() - startTime;
    
    return {
      connected: true,
      responseTime,
      status: response.status
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      connected: false,
      responseTime,
      status: error.response?.status || 0
    };
  }
};

// ==============================
// EXPORT PAR DÉFAUT
// ==============================

export default api;