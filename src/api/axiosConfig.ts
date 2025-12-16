// src/api/axiosConfig.ts - VERSION CORRIGÉE (async/await fix)
import axios from 'axios';
import { clearAuthData } from './UserService';

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
    'Content-Type': 'application/ld+json',
    'Accept': 'application/json',
  },
});

// ==============================
// FONCTIONS UTILITAIRES
// ==============================

const getAuthToken = (): string | null => {
  // Chercher le token dans toutes les clés possibles
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
// INTERCEPTEUR DE REQUÊTES - CORRIGÉ
// ==============================

api.interceptors.request.use(
  (config) => {
    const token = getAuthToken();
    
    if (token) {
      // Format correct du token
      const cleanToken = token.startsWith('Bearer ') ? token.substring(7) : token;
      config.headers.Authorization = `Bearer ${cleanToken}`;
      
      if (IS_DEV) {
        console.log(`🔑 Token ajouté pour ${config.method?.toUpperCase()} ${config.url}`);
        console.log(`📦 Token (extrait): ${cleanToken.substring(0, 20)}...`);
      }
    } else {
      // Vérifier si c'est une route protégée
      const protectedMethods = ['post', 'put', 'patch', 'delete'];
      const isProtectedMethod = config.method && protectedMethods.includes(config.method);
      
      // Routes nécessitant une authentification (hors login/register)
      const protectedRoutes = [
        '/user_bank_details', '/ads', '/currencies', 
        '/users/me', '/users/', '/profile',
        '/transactions', '/bank-accounts', '/wallets'
      ];
      
      const isProtectedRoute = protectedRoutes.some(route => 
        config.url?.includes(route)
      );
      
      if (isProtectedMethod || isProtectedRoute) {
        console.warn(`⚠️ Pas de token pour ${config.method?.toUpperCase()} ${config.url}`);
        
        if (IS_DEV) {
          console.log('🔍 Recherche des tokens dans localStorage:');
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key?.includes('token') || key?.includes('auth')) {
              console.log(`  ${key}: ${localStorage.getItem(key)?.substring(0, 30)}...`);
            }
          }
        }
      }
    }
    
    // Log détaillé en développement
    if (IS_DEV) {
      console.log(`➡️ ${config.method?.toUpperCase()} ${config.url}`, {
        hasToken: !!token,
        timeout: config.timeout,
        headers: {
          Authorization: config.headers.Authorization ? 'PRÉSENT' : 'ABSENT'
        }
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
// INTERCEPTEUR DE RÉPONSES - CORRIGÉ (async ajouté)
// ==============================

api.interceptors.response.use(
  (response) => {
    // Log des réponses réussies en développement
    if (IS_DEV) {
      console.log(`✅ ${response.status} ${response.config.url}`, {
        status: response.status,
        hasData: !!response.data,
        tokenInResponse: !!response.data?.token
      });
    }
    
    // Si la réponse contient un nouveau token, le sauvegarder
    if (response.data?.token) {
      const newToken = response.data.token;
      localStorage.setItem('auth_token', newToken);
      
      if (IS_DEV) {
        console.log(`🔄 Nouveau token reçu pour ${response.config.url}`);
      }
      
      // Mettre à jour les headers pour les prochaines requêtes
      api.defaults.headers.common['Authorization'] = `Bearer ${newToken}`;
    }
    
    return response;
  },
  async (error) => { // ASYNC AJOUTÉ ICI
    const url = error.config?.url;
    const method = error.config?.method?.toUpperCase();
    const status = error.response?.status;
    const data = error.response?.data;
    
    const isMeEndpoint = url && url.includes('/users/me');
    
    // ==============================
    // GESTION SPÉCIALE POUR /users/me (erreur 500 connue)
    // ==============================
    if (isMeEndpoint && status === 500) {
      console.warn('⚠️ [API] /users/me retourne 500 (problème connu côté Symfony)');
      
      // Essayer de récupérer l'utilisateur depuis le stockage
      const userKeys = ['user', 'current_user'];
      let userData = null;
      
      for (const key of userKeys) {
        try {
          const storedUser = localStorage.getItem(key);
          if (storedUser) {
            userData = JSON.parse(storedUser);
            if (userData && userData.email) {
              break;
            }
          }
        } catch (e) {
          // Ignorer les erreurs de parsing
        }
      }
      
      if (userData) {
        console.log('✅ Utilisation des données utilisateur du stockage local');
        return Promise.resolve({
          data: userData,
          status: 200,
          statusText: 'OK',
          headers: {},
          config: error.config
        });
      }
    }
    
    // ==============================
    // LOG DÉTAILLÉ DES AUTRES ERREURS
    // ==============================
    if (error.response) {
      console.error(`❌ [API] Erreur ${status} ${method} ${url}:`, {
        status: status,
        message: data?.message || data?.detail || 'Pas de message',
        violations: data?.violations,
        config: {
          method: method,
          url: url,
          headers: error.config?.headers
        }
      });
      
      // ==============================
      // GESTION DES ERREURS 401 - CRITIQUE
      // ==============================
      if (status === 401 && !isMeEndpoint) {
        console.warn('🚨 401 Unauthorized - Session expirée ou token invalide');
        
        // Vérifier si le token existe mais est peut-être expiré
        const currentToken = getAuthToken();
        if (currentToken) {
          console.log('ℹ️ Token existe mais rejeté par le serveur, probablement expiré');
        }
        
        // Nettoyer les données d'authentification
        clearAuthData();
        
        // Redirection vers login (avec délai pour éviter les boucles)
        if (typeof window !== 'undefined') {
          const currentPath = window.location.pathname;
          const isLoginPage = currentPath.includes('/login');
          const isRegisterPage = currentPath.includes('/register');
          
          if (!isLoginPage && !isRegisterPage) {
            setTimeout(() => {
              console.log('🔄 Redirection vers /login');
              window.location.href = `/login?redirect=${encodeURIComponent(currentPath)}`;
            }, 1000);
          }
        }
      }
      
      // ==============================
      // GESTION DES ERREURS 403
      // ==============================
      else if (status === 403) {
        console.warn('🚫 403 Forbidden - Permissions insuffisantes');
        
        // Vérifier si l'utilisateur est admin
        const userStr = localStorage.getItem('user');
        try {
          const user = userStr ? JSON.parse(userStr) : null;
          if (user && !user.roles?.includes('ROLE_ADMIN')) {
            console.warn('⚠️ Action nécessite les droits administrateur');
          }
        } catch (e) {
          console.error('Erreur parsing user:', e);
        }
      }
      
      // ==============================
      // GESTION DES ERREURS 422 (Validation)
      // ==============================
      else if (status === 422) {
        console.warn('📋 422 Validation Failed');
        
        if (data?.violations) {
          const violations = data.violations.map((v: any) => 
            `${v.propertyPath}: ${v.message}`
          ).join(', ');
          console.log('Détails validation:', violations);
        }
      }
      
      // ==============================
      // GESTION DES ERREURS 429 (Rate Limiting)
      // ==============================
      else if (status === 429) {
        console.warn('⏰ 429 Too Many Requests - Ralentissez vos requêtes');
        const retryAfter = error.response.headers['retry-after'];
        if (retryAfter) {
          console.log(`Réessayez après ${retryAfter} secondes`);
        }
      }
      
      // ==============================
      // GESTION DES ERREURS 500 (Serveur)
      // ==============================
      else if (status === 500 && !isMeEndpoint) {
        console.error('💥 500 Internal Server Error - Problème côté serveur');
        
        // Essayer une seule fois de récupérer
        if (!error.config._retry) {
          error.config._retry = true;
          console.log('🔄 Tentative de reprise pour erreur 500');
          
          // Attendre 2 secondes avant de réessayer
          await new Promise(resolve => setTimeout(resolve, 2000));
          return api(error.config);
        }
      }
      
    } else if (error.request) {
      // ==============================
      // ERREURS DE RÉSEAU
      // ==============================
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
      
      // Vérifier si c'est une erreur CORS
      if (error.message?.includes('CORS') || error.message?.includes('Network Error')) {
        console.error('🛡️ Problème CORS détecté. Vérifiez:');
        console.error('1. Le serveur autorise les requêtes depuis votre domaine');
        console.error('2. Les headers CORS sont correctement configurés');
        console.error('3. Le certificat SSL est valide');
      }
      
    } else {
      // ==============================
      // ERREURS DE CONFIGURATION
      // ==============================
      console.error('⚙️ Erreur de configuration axios:', error.message);
    }
    
    // ==============================
    // RENVOYER L'ERREUR POUR QUE LES COMPOSANTS PUISSENT LA GÉRER
    // ==============================
    return Promise.reject({
      ...error,
      userMessage: getErrorMessage(error)
    });
  }
);

// ==============================
// FONCTION POUR FORMATER LES MESSAGES D'ERREUR
// ==============================

function getErrorMessage(error: any): string {
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  
  if (error.response?.data?.title) {
    return error.response.data.title;
  }
  
  if (error.response?.status === 401) {
    return 'Session expirée. Veuillez vous reconnecter.';
  }
  
  if (error.response?.status === 403) {
    return 'Vous n\'avez pas les permissions nécessaires.';
  }
  
  if (error.response?.status === 404) {
    return 'Ressource non trouvée.';
  }
  
  if (error.response?.status === 422) {
    return 'Données invalides. Veuillez vérifier les informations saisies.';
  }
  
  if (error.response?.status === 429) {
    return 'Trop de tentatives. Veuillez patienter quelques instants.';
  }
  
  if (error.response?.status === 500) {
    return 'Erreur serveur. Veuillez réessayer plus tard.';
  }
  
  if (error.code === 'ECONNABORTED') {
    return 'Le serveur met trop de temps à répondre.';
  }
  
  if (error.code === 'ERR_NETWORK') {
    return 'Problème de connexion réseau. Vérifiez votre internet.';
  }
  
  return 'Une erreur est survenue. Veuillez réessayer.';
}

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
  message: string;
}> => {
  const startTime = Date.now();
  
  try {
    const response = await api.get('/', { timeout: 10000 });
    const responseTime = Date.now() - startTime;
    
    return {
      connected: true,
      responseTime,
      status: response.status,
      message: 'API accessible'
    };
  } catch (error: any) {
    const responseTime = Date.now() - startTime;
    
    return {
      connected: false,
      responseTime,
      status: error.response?.status || 0,
      message: getErrorMessage(error)
    };
  }
};

// ==============================
// FONCTION POUR DÉBOGUER L'AUTH
// ==============================

export const debugAuthState = (): void => {
  console.group('🔍 DEBUG ÉTAT AUTHENTIFICATION');
  
  console.log('=== TOKENS ===');
  const tokenKeys = ['auth_token', 'jwt_token', 'token'];
  tokenKeys.forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`${key}: ${value ? value.substring(0, 30) + '...' : 'NON TROUVÉ'}`);
  });
  
  console.log('=== UTILISATEUR ===');
  const userKeys = ['user', 'current_user'];
  userKeys.forEach(key => {
    const value = localStorage.getItem(key);
    if (value) {
      try {
        const user = JSON.parse(value);
        console.log(`${key}:`, { 
          email: user.email, 
          id: user.id,
          roles: user.roles 
        });
      } catch (e) {
        console.log(`${key}: ERREUR PARSING`);
      }
    } else {
      console.log(`${key}: NON TROUVÉ`);
    }
  });
  
  console.log('=== CONFIG AXIOS ===');
  console.log('Base URL:', api.defaults.baseURL);
  console.log('Authorization Header:', api.defaults.headers.common.Authorization);
  
  console.groupEnd();
};

// ==============================
// FONCTION POUR RAFFRAÎCHIR LE TOKEN
// ==============================

export const updateAuthToken = (token: string): void => {
  // Sauvegarder dans localStorage
  localStorage.setItem('auth_token', token);
  
  // Mettre à jour les headers axios
  api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  
  if (IS_DEV) {
    console.log('🔄 Token mis à jour dans axios');
  }
};

// ==============================
// EXPORT PAR DÉFAUT
// ==============================

export default api;