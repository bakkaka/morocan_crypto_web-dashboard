// src/api/axiosConfig.ts
import axios from 'axios';

const API_BASE_URL = 'http://localhost:8000/api';

// Configuration Axios globale
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/ld+json, application/json',
  },
  timeout: 15000,
  withCredentials: false,
});

// Intercepteur pour les requêtes
api.interceptors.request.use(
  (config) => {
    const safeLogData = config.data 
      ? { ...config.data, plainPassword: config.data.plainPassword ? '***' : undefined }
      : null;
    
    console.log(`🚀 ${config.method?.toUpperCase()} ${config.baseURL}${config.url}`, {
      headers: config.headers,
      data: safeLogData
    });
    
    return config;
  },
  (error) => {
    console.error('❌ Erreur intercepteur requête:', error);
    return Promise.reject(error);
  }
);

// Intercepteur pour les réponses
api.interceptors.response.use(
  (response) => {
    console.log(`✅ ${response.status} ${response.config.url}`);
    return response;
  },
  (error) => {
    const errorInfo = {
      message: error.message,
      code: error.code,
      status: error.response?.status,
      url: error.config?.url,
      method: error.config?.method,
    };
    
    console.error('❌ Erreur API:', errorInfo);
    
    // Amélioration du message d'erreur pour l'utilisateur
    if (error.code === 'ERR_NETWORK') {
      error.userMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion internet.';
    } else if (error.response?.status === 415) {
      error.userMessage = 'Format de données incompatible avec le serveur.';
    } else if (error.response?.status >= 500) {
      error.userMessage = 'Erreur interne du serveur. Veuillez réessayer plus tard.';
    }
    
    return Promise.reject(error);
  }
);

export default api;