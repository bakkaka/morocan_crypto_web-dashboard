// src/api/axiosConfig.ts
import axios from 'axios';

// Détermination de l'URL de base
const getBaseURL = (): string => {
  // 1. Priorité à la variable d'environnement
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL;
  }
  
  // 2. Production -> Railway
  if (import.meta.env.PROD) {
    return 'https://morocancryptobackend-production-f3b6.up.railway.app/api';
  }
  
  // 3. Développement -> Localhost
  return 'http://localhost:8000/api';
};

const baseURL = getBaseURL();

// Log de configuration
console.group('🚀 Configuration API');
console.log(`📊 Environnement: ${import.meta.env.MODE}`);
console.log(`🌐 URL de base: ${baseURL}`);
console.log(`🔧 VITE_API_URL: ${import.meta.env.VITE_API_URL || 'Non définie'}`);
console.groupEnd();

// Création de l'instance axios
const api = axios.create({
  baseURL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  },
  timeout: 30000,
  timeoutErrorMessage: 'La requête a expiré. Veuillez réessayer.',
});

// Intercepteur pour les requêtes sortantes
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Log en développement
    if (import.meta.env.DEV) {
      const method = config.method?.toUpperCase() || 'GET';
      const url = `${config.baseURL}${config.url}`;
      console.log(`📤 [${method}] ${url}`);
    }
    
    return config;
  },
  (error) => {
    console.error('❌ Erreur requête:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses entrantes
api.interceptors.response.use(
  (response) => {
    // Log en développement
    if (import.meta.env.DEV) {
      console.log(`📥 [${response.status}] ${response.config.url}`);
    }
    return response;
  },
  (error) => {
    console.error('❌ Erreur API:', {
      url: error.config?.url,
      method: error.config?.method?.toUpperCase(),
      status: error.response?.status,
      message: error.message,
    });
    
    // Gestion des erreurs spécifiques
    if (error.response?.status === 401) {
      console.warn('🔐 Session expirée');
      localStorage.removeItem('authToken');
      localStorage.removeItem('currentUser');
      localStorage.removeItem('isAuthenticated');
      
      // Redirection vers login
      if (!window.location.pathname.includes('/login')) {
        window.location.href = '/login';
      }
    }
    
    return Promise.reject(error);
  }
);

export default api;