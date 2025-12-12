// src/api/axiosConfig.ts - VERSION FINALE CORRIGÉE
import axios from 'axios';

// ==============================
// CONFIGURATION AXIOS
// ==============================

const api = axios.create({
  baseURL: 'https://morocancryptobackend-production-f3b6.up.railway.app/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000,
});

// ==============================
// INTERCEPTEUR REQUÊTE
// ==============================

api.interceptors.request.use(
  (config) => {
    // Log de la requête
    console.log(`📤 [API] ${config.method?.toUpperCase()} ${config.url}`);
    
    // N'ajoutez PAS le header Authorization pour login_check
    if (config.url?.includes('login_check')) {
      console.log('🔓 Pas de token pour login_check');
      return config;
    }
    
    // Récupérez le token depuis localStorage
    const token = localStorage.getItem('authToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log(`🔑 Token ajouté: ${token.substring(0, 30)}...`);
    } else {
      console.warn(`⚠️ Pas de token pour ${config.url}`);
      
      // Si c'est une route protégée, prévenez
      const protectedRoutes = ['/user_bank_details', '/me', '/ads', '/dashboard'];
      const isProtected = protectedRoutes.some(route => config.url?.includes(route));
      
      if (isProtected) {
        console.error('❌ Tentative d\'accès à une route protégée sans token!');
      }
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Erreur intercepteur requête:', error);
    return Promise.reject(error);
  }
);

// ==============================
// INTERCEPTEUR RÉPONSE
// ==============================

api.interceptors.response.use(
  (response) => {
    // Log des réponses réussies
    if (response.config.url?.includes('/user_bank_details')) {
      console.log(`✅ [API] ${response.status} ${response.config.url}: Données reçues`);
    }
    return response;
  },
  (error) => {
    // Log détaillé des erreurs
    if (error.response) {
      const { status, data } = error.response;
      const url = error.config?.url;
      
      console.error(`❌ [API] Erreur ${status} ${url}:`, {
        message: data?.message || data?.detail,
        data: data
      });
      
      // Gestion spécifique des erreurs
      if (status === 401) {
        console.error('🔐 Non authentifié - Token expiré ou invalide');
        
        // Nettoyage du localStorage
        localStorage.removeItem('authToken');
        localStorage.removeItem('user');
        localStorage.removeItem('isAuthenticated');
        
        // Redirection vers login si nécessaire
        if (typeof window !== 'undefined' && 
            window.location.pathname !== '/login' && 
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
      
      if (status === 422) {
        console.error('📋 Erreur de validation:', data?.violations);
      }
      
      if (status >= 500) {
        console.error('💥 Erreur serveur');
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
 * Vérifie si l'utilisateur est authentifié
 */
export const checkAuthStatus = (): boolean => {
  const token = localStorage.getItem('authToken');
  const user = localStorage.getItem('user');
  const isAuth = localStorage.getItem('isAuthenticated') === 'true';
  
  console.log('🔍 Vérification auth:', {
    hasToken: !!token,
    hasUser: !!user,
    isAuthFlag: isAuth
  });
  
  return !!(token && user && isAuth);
};

/**
 * Nettoie toutes les données d'authentification
 */
export const clearAuthData = (): void => {
  const keys = ['authToken', 'user', 'isAuthenticated', 'authTimestamp'];
  
  keys.forEach(key => {
    localStorage.removeItem(key);
  });
  
  console.log('🧹 Données d\'authentification nettoyées');
};

/**
 * Teste la connexion à l'API
 */
export const testConnection = async (): Promise<{ connected: boolean; message: string }> => {
  try {
    const response = await api.get('/', { timeout: 5000 });
    return { connected: true, message: `API accessible (${response.status})` };
  } catch (error) {
    return { connected: false, message: 'API non accessible' };
  }
};

// ==============================
// EXPORT
// ==============================

export default api;
//export { checkAuthStatus, clearAuthData, testConnection };