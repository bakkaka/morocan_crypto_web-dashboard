// src/api/axiosConfig.ts
import axios from 'axios';
import type { InternalAxiosRequestConfig, AxiosResponse, AxiosError } from 'axios';

// ==============================
// CONFIGURATION AXIOS POUR SYMFONY
// ==============================

// Créez l'instance axios avec la configuration pour Symfony
const api = axios.create({
  baseURL: 'https://morocancryptobackend-production-f3b6.up.railway.app/api',
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
    'X-Requested-With': 'XMLHttpRequest',
  },
  timeout: 30000,
  withCredentials: true, // ← CRITIQUE : permet d'envoyer/recevoir les cookies (sessions Symfony)
});

// ==============================
// INTERCEPTEURS DE REQUÊTE
// ==============================

api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // Log de la requête
    console.log(`📤 [SYMFONY API] ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`);
    
    // Vérifiez et loguez les cookies disponibles
    const cookies = document.cookie;
    if (cookies) {
      const phpSession = cookies.split(';').find(c => c.trim().startsWith('PHPSESSID'));
      if (phpSession) {
        console.log('🍪 Session PHP active:', phpSession.substring(0, 30) + '...');
      } else {
        console.log('🍪 Aucune session PHP trouvée');
      }
    }
    
    // Pour Symfony, on utilise les cookies, pas le header Authorization
    // NE PAS ajouter Authorization: Bearer ... car Symfony utilise les sessions
    
    // Vérifiez que withCredentials est true pour les requêtes API
    if (config.url && !config.url.startsWith('http')) {
      config.withCredentials = true;
    }
    
    return config;
  },
  (error: AxiosError) => {
    console.error('❌ Erreur intercepteur requête:', error);
    return Promise.reject(error);
  }
);

// ==============================
// INTERCEPTEURS DE RÉPONSE
// ==============================

api.interceptors.response.use(
  (response: AxiosResponse) => {
    // Log de la réponse réussie
    console.log(`✅ [SYMFONY API] ${response.status} ${response.config.url}`);
    
    // Vérifiez les cookies dans les headers de réponse
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      console.log('🍪 Cookies reçus du serveur:', Array.isArray(setCookieHeader) ? setCookieHeader.join(', ') : setCookieHeader);
    }
    
    return response;
  },
  (error: AxiosError) => {
    // Log détaillé de l'erreur
    if (error.response) {
      const { status, statusText, data, headers } = error.response;
      const url = error.config?.url;
      const method = error.config?.method?.toUpperCase();
      
      console.error(`❌ [SYMFONY API] Erreur ${method} ${url}:`, {
        status,
        statusText,
        data,
        headers: headers['set-cookie'] ? 'Cookies présents' : 'Pas de cookies'
      });
      
      // Gestion spécifique des erreurs Symfony
      if (status === 401) {
        console.error('🔐 Non authentifié - Session Symfony expirée ou invalide');
        
        // Nettoyage local
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        
        // Redirection si ce n'est pas déjà la page de login
        if (window.location.pathname !== '/login' && 
            window.location.pathname !== '/register') {
          console.log('🔄 Redirection vers /login');
          setTimeout(() => {
            window.location.href = '/login';
          }, 1500);
        }
      }
      
      if (status === 403) {
        console.error('🚫 Accès interdit - Vérifiez vos permissions');
      }
      
      if (status === 404) {
        console.error('🔍 Endpoint non trouvé');
      }
      
      if (status === 419 || status === 440) {
        console.error('⏰ Session expirée - Page expirée');
      }
      
      if (status === 422) {
        console.error('📋 Erreur de validation:', data);
      }
      
      if (status >= 500) {
        console.error('💥 Erreur serveur Symfony');
      }
    } else if (error.request) {
      console.error('🌐 Pas de réponse du serveur - Vérifiez la connexion');
    } else {
      console.error('⚡ Erreur de configuration:', error.message);
    }
    
    return Promise.reject(error);
  }
);

// ==============================
// FONCTIONS UTILITAIRES
// ==============================

/**
 * Vérifie si une session Symfony est active
 */
export const checkSymfonySession = (): boolean => {
  const hasPhpSession = document.cookie.includes('PHPSESSID');
  const hasUser = !!localStorage.getItem('user');
  
  console.log('🔍 Vérification session Symfony:', {
    hasPhpSession,
    hasUser,
    cookies: document.cookie.split(';').map(c => c.trim())
  });
  
  return hasPhpSession && hasUser;
};

/**
 * Nettoie complètement la session
 */
export const clearSymfonySession = (): void => {
  console.log('🧹 Nettoyage session Symfony...');
  
  // Nettoyage localStorage
  localStorage.removeItem('user');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('authTimestamp');
  
  // Nettoyage cookies
  document.cookie.split(';').forEach(cookie => {
    const name = cookie.split('=')[0].trim();
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  });
  
  console.log('✅ Session nettoyée');
};

/**
 * Teste la connexion à l'API Symfony
 */
export const testSymfonyConnection = async (): Promise<boolean> => {
  try {
    console.log('🧪 Test connexion Symfony API...');
    
    const response = await api.get('/');
    
    console.log('✅ API Symfony accessible:', {
      status: response.status,
      data: response.data
    });
    
    return true;
  } catch (error) {
    console.error('❌ API Symfony inaccessible:', error);
    return false;
  }
};

// ==============================
// EXPORT
// ==============================

export default api;