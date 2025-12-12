// src/api/AuthService.ts
import api from './axiosConfig';

// ==============================
// INTERFACES
// ==============================

export interface LoginData {
  email: string;
  password: string;
}

export interface User {
  id: number;
  email: string;
  fullName: string;
  phone: string;
  isVerified: boolean;
  roles?: string[];
  createdAt?: string;
  updatedAt?: string;
}

export interface AuthResponse {
  message: string;
  user: User;
  token?: string;
  access_token?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresIn?: number;
}

export interface RegisterData {
  email: string;
  password: string;
  fullName: string;
  phone: string;
}

export class AuthServiceError extends Error {
  public code?: string;
  public status?: number;
  public timestamp: string;

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
    this.status = status;
    this.timestamp = new Date().toISOString();
  }
}

// ==============================
// CONSTANTS
// ==============================

const STORAGE_KEYS = {
  USER: 'user',
  TOKEN: 'authToken',
  REFRESH_TOKEN: 'refreshToken',
  IS_AUTHENTICATED: 'isAuthenticated',
  AUTH_TIMESTAMP: 'authTimestamp',
  TOKEN_EXPIRY: 'tokenExpiry'
} as const;

const TOKEN_KEYS = ['token', 'access_token', 'accessToken', 'jwtToken'];

// ==============================
// STORAGE UTILITIES
// ==============================

const Storage = {
  set: (key: string, value: any): void => {
    try {
      const serialized = typeof value === 'string' ? value : JSON.stringify(value);
      localStorage.setItem(key, serialized);
    } catch (error) {
      console.error(`❌ Erreur lors du stockage de ${key}:`, error);
    }
  },

  get: <T>(key: string, defaultValue: T = null as any): T => {
    try {
      const item = localStorage.getItem(key);
      if (!item) return defaultValue;
      
      try {
        return JSON.parse(item) as T;
      } catch {
        return item as T;
      }
    } catch (error) {
      console.error(`❌ Erreur lors de la récupération de ${key}:`, error);
      return defaultValue;
    }
  },

  remove: (key: string): void => {
    try {
      localStorage.removeItem(key);
    } catch (error) {
      console.error(`❌ Erreur lors de la suppression de ${key}:`, error);
    }
  },

  clearAuth: (): void => {
    Object.values(STORAGE_KEYS).forEach(key => {
      localStorage.removeItem(key);
    });
    console.log('🧹 Stockage d\'authentification nettoyé');
  }
};

// ==============================
// AUTH SERVICE
// ==============================

export const loginUser = async (loginData: LoginData): Promise<AuthResponse> => {
  const startTime = Date.now();
  
  try {
    console.group('🔐 Tentative de connexion');
    console.log('📤 Envoi à:', '/auth/login');
    console.log('📝 Données:', { email: loginData.email, password: '***' });

    const response = await api.post<AuthResponse>('/auth/login', loginData, {
      headers: {
        'Content-Type': 'application/json',
        'X-Request-Start': startTime.toString()
      },
      timeout: 15000,
    });

    const responseTime = Date.now() - startTime;
    console.log(`✅ Connexion réussie en ${responseTime}ms`);
    console.log('📥 Réponse complète:', response.data);
    
    // Analyse de la structure de réponse
    const responseData = response.data;
    console.log('📊 Clés disponibles:', Object.keys(responseData));
    
    // DÉTECTION DU TOKEN
    let token: string | undefined;
    for (const key of TOKEN_KEYS) {
      if (responseData[key as keyof AuthResponse]) {
        token = responseData[key as keyof AuthResponse] as string;
        console.log(`🔍 Token trouvé sous la clé: "${key}"`);
        break;
      }
    }
    
    if (!token) {
      console.warn('⚠️ AUCUN TOKEN DÉTECTÉ dans la réponse!');
      console.warn('Structure complète:', responseData);
      
      // Debug avancé - chercher dans toute la réponse
      const jsonString = JSON.stringify(responseData);
      const tokenPattern = /eyJ[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+\.[a-zA-Z0-9_-]+/;
      const match = jsonString.match(tokenPattern);
      
      if (match) {
        token = match[0];
        console.warn(`🔍 Token extrait via regex: ${token.substring(0, 30)}...`);
      }
    }
    
    // STOCKAGE DES DONNÉES
    if (responseData.user) {
      // Stockage de l'utilisateur
      Storage.set(STORAGE_KEYS.USER, responseData.user);
      Storage.set(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
      Storage.set(STORAGE_KEYS.AUTH_TIMESTAMP, Date.now());
      
      // Stockage du token si disponible
      if (token) {
        Storage.set(STORAGE_KEYS.TOKEN, token);
        console.log(`💾 Token stocké: ${token.substring(0, 30)}...`);
        
        // Calcul de l'expiration (1 heure par défaut)
        const expiryTime = Date.now() + (responseData.expiresIn || 3600) * 1000;
        Storage.set(STORAGE_KEYS.TOKEN_EXPIRY, expiryTime);
        console.log(`⏰ Token expire le: ${new Date(expiryTime).toLocaleTimeString()}`);
      } else {
        // Mode debug: créer un token temporaire
        const debugToken = `debug_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        Storage.set(STORAGE_KEYS.TOKEN, debugToken);
        console.warn(`⚠️ Token debug créé: ${debugToken}`);
      }
      
      // Stockage du refresh token si disponible
      if (responseData.refreshToken) {
        Storage.set(STORAGE_KEYS.REFRESH_TOKEN, responseData.refreshToken);
        console.log('🔄 Refresh token stocké');
      }
      
      // Vérification du stockage
      verifyStorage();
    } else {
      throw new AuthServiceError('Réponse invalide: utilisateur manquant', 'INVALID_RESPONSE');
    }
    
    console.groupEnd();
    return responseData;

  } catch (error: any) {
    const errorTime = Date.now() - startTime;
    console.group('❌ Échec de connexion');
    console.error(`⏱️ Durée: ${errorTime}ms`);
    console.error('💥 Erreur:', error);

    // Gestion des erreurs HTTP
    if (error.response) {
      const { status, data, headers } = error.response;
      
      console.error('📡 Détails de la réponse:');
      console.error('   Status:', status);
      console.error('   Headers:', headers);
      console.error('   Data:', data);

      let errorMessage = data?.message || 'Erreur inconnue';
      
      switch (status) {
        case 400:
          errorMessage = data?.message || 'Données de connexion invalides';
          break;
        
        case 401:
          errorMessage = data?.message || 'Email ou mot de passe incorrect';
          break;
        
        case 403:
          errorMessage = data?.message || 'Accès non autorisé';
          break;
        
        case 404:
          errorMessage = 'Service de connexion indisponible';
          break;
        
        case 422:
          errorMessage = data?.message || 'Validation échouée';
          if (data?.violations) {
            errorMessage = data.violations.map((v: any) => `${v.propertyPath}: ${v.message}`).join(', ');
          }
          break;
        
        case 429:
          errorMessage = 'Trop de tentatives. Veuillez réessayer plus tard.';
          break;
        
        case 500:
          errorMessage = 'Erreur interne du serveur';
          break;
        
        case 502:
        case 503:
        case 504:
          errorMessage = 'Service temporairement indisponible';
          break;
      }
      
      throw new AuthServiceError(errorMessage, `HTTP_${status}`, status);
    }

    // Gestion des erreurs réseau
    if (error.code === 'ERR_NETWORK') {
      throw new AuthServiceError(
        'Impossible de se connecter au serveur. Vérifiez votre connexion internet.',
        'NETWORK_ERROR'
      );
    }

    if (error.code === 'ECONNABORTED') {
      throw new AuthServiceError(
        'La connexion a expiré. Le serveur met trop de temps à répondre.',
        'TIMEOUT_ERROR'
      );
    }

    if (error.message?.includes('Network Error')) {
      throw new AuthServiceError(
        'Erreur réseau. Vérifiez votre connexion et réessayez.',
        'NETWORK_FAILURE'
      );
    }

    console.groupEnd();
    throw new AuthServiceError(
      error.message || 'Une erreur inattendue est survenue',
      'UNKNOWN_ERROR'
    );
  }
};

// ==============================
// AUTH MANAGEMENT
// ==============================

export const logoutUser = (redirectToLogin: boolean = true): void => {
  console.group('👋 Déconnexion');
  
  try {
    // Récupération de l'utilisateur avant déconnexion pour le log
    const currentUser = getCurrentUser();
    console.log('👤 Utilisateur courant:', currentUser?.email || 'Inconnu');
    
    // Nettoyage complet
    Storage.clearAuth();
    
    // Nettoyage additionnel au cas où
    ['currentUser', 'token', 'userData', 'session'].forEach(key => {
      localStorage.removeItem(key);
    });
    
    console.log('✅ Déconnexion réussie');
    
    if (redirectToLogin && typeof window !== 'undefined') {
      console.log('🔄 Redirection vers /login');
      setTimeout(() => {
        window.location.href = '/login';
      }, 100);
    }
    
  } catch (error) {
    console.error('❌ Erreur lors de la déconnexion:', error);
  } finally {
    console.groupEnd();
  }
};

export const registerUser = async (registerData: RegisterData): Promise<any> => {
  try {
    console.group('📝 Inscription utilisateur');
    console.log('📤 Envoi à:', '/auth/register');
    console.log('📝 Données:', { ...registerData, password: '***' });

    const response = await api.post('/auth/register', registerData, {
      headers: {
        'Content-Type': 'application/json'
      },
      timeout: 15000
    });

    console.log('✅ Inscription réussie:', response.data);
    console.groupEnd();
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Erreur d\'inscription:', error);
    
    if (error.response?.data) {
      throw new AuthServiceError(
        error.response.data.message || 'Erreur lors de l\'inscription',
        'REGISTRATION_ERROR',
        error.response.status
      );
    }
    
    throw error;
  }
};

// ==============================
// GETTERS & CHECKERS
// ==============================

export const getCurrentUser = (): User | null => {
  return Storage.get<User>(STORAGE_KEYS.USER);
};

export const getAuthToken = (): string | null => {
  // Essayez différentes clés
  const token = Storage.get<string>(STORAGE_KEYS.TOKEN) || 
                Storage.get<string>('token') ||
                Storage.get<string>('access_token');
  
  if (token) {
    // Vérifiez que c'est un token JWT valide (commence par eyJ)
    if (token.startsWith('eyJ')) {
      return token;
    } else {
      console.warn('⚠️ Token dans un format non JWT:', token.substring(0, 50));
      return token; // Retournez quand même au cas où
    }
  }
  
  return null;
};

export const isAuthenticated = (): boolean => {
  const token = getAuthToken();
  const isAuth = Storage.get<string>(STORAGE_KEYS.IS_AUTHENTICATED) === 'true';
  const user = getCurrentUser();
  
  const authenticated = !!(token && isAuth && user);
  
  console.log('🔍 Vérification authentification:', {
    hasToken: !!token,
    tokenLength: token?.length || 0,
    isAuthFlag: isAuth,
    hasUser: !!user,
    userEmail: user?.email,
    authenticated
  });
  
  return authenticated;
};

export const isTokenExpired = (): boolean => {
  const expiry = Storage.get<number>(STORAGE_KEYS.TOKEN_EXPIRY);
  if (!expiry) return true;
  
  const now = Date.now();
  const expired = now >= expiry;
  
  if (expired) {
    console.warn(`⌛ Token expiré depuis ${Math.round((now - expiry) / 1000)} secondes`);
  }
  
  return expired;
};

export const getAuthHeaders = (): Record<string, string> => {
  const token = getAuthToken();
  
  if (!token) {
    console.warn('⚠️ Tentative de récupération des headers sans token');
    return { 'Content-Type': 'application/json' };
  }
  
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json',
    'X-Auth-Token': token.substring(0, 10) // Pour le debug
  };
};

// ==============================
// DEBUG & VERIFICATION
// ==============================

export const verifyStorage = (): void => {
  console.group('🔍 Vérification du stockage');
  
  Object.values(STORAGE_KEYS).forEach(key => {
    const value = localStorage.getItem(key);
    console.log(`${key}:`, value ? `${value.substring(0, 80)}${value.length > 80 ? '...' : ''}` : 'NULL');
  });
  
  console.groupEnd();
};

export const debugAuth = (): void => {
  console.group('🐛 DEBUG COMPLET AUTHENTIFICATION');
  
  // 1. Stockage local
  console.log('📦 LOCALSTORAGE:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    const value = localStorage.getItem(key!);
    console.log(`   ${key}: ${value?.substring(0, 100)}${value && value.length > 100 ? '...' : ''}`);
  }
  
  // 2. État actuel
  console.log('📊 ÉTAT ACTUEL:');
  console.log('   Utilisateur:', getCurrentUser());
  console.log('   Token:', getAuthToken() ? `${getAuthToken()!.substring(0, 30)}...` : 'NULL');
  console.log('   Authentifié:', isAuthenticated());
  console.log('   Token expiré:', isTokenExpired());
  
  // 3. Test de requête API
  console.log('🧪 TEST API:');
  const token = getAuthToken();
  if (token) {
    console.log('   Token JWT valide:', token.startsWith('eyJ'));
    console.log('   Longueur token:', token.length);
    
    // Test de décodage (partie header)
    try {
      const parts = token.split('.');
      if (parts.length === 3) {
        const header = JSON.parse(atob(parts[0]));
        const payload = JSON.parse(atob(parts[1]));
        console.log('   Header JWT:', header);
        console.log('   Payload JWT:', {
          sub: payload.sub,
          email: payload.email,
          exp: new Date(payload.exp * 1000).toLocaleString(),
          iat: new Date(payload.iat * 1000).toLocaleString()
        });
      }
    } catch (e) {
      console.log('   Token non JWT standard');
    }
  }
  
  console.groupEnd();
};

// ==============================
// SESSION MANAGEMENT
// ==============================

export const checkAndRefreshSession = async (): Promise<boolean> => {
  if (!isAuthenticated() || isTokenExpired()) {
    console.log('🔄 Session expirée ou invalide');
    
    // Tentative de refresh si refreshToken disponible
    const refreshToken = Storage.get<string>(STORAGE_KEYS.REFRESH_TOKEN);
    if (refreshToken) {
      console.log('🔄 Tentative de rafraîchissement du token...');
      try {
        // Implémentez votre logique de refresh ici
        // const response = await api.post('/auth/refresh', { refreshToken });
        // Storage.set(STORAGE_KEYS.TOKEN, response.data.token);
        return true;
      } catch (error) {
        console.error('❌ Échec du rafraîchissement:', error);
        logoutUser();
        return false;
      }
    }
    
    logoutUser();
    return false;
  }
  
  console.log('✅ Session valide');
  return true;
};

// ==============================
// INITIALIZATION
// ==============================

// Vérifie l'état d'authentification au chargement
if (typeof window !== 'undefined') {
  console.log('🚀 AuthService initialisé');
  
  // Vérification automatique au démarrage
  window.addEventListener('load', () => {
    if (isAuthenticated()) {
      console.log('🔍 Vérification automatique de la session...');
      checkAndRefreshSession().catch(console.error);
    }
  });
  
  // Export pour la console debug
  (window as any).debugAuth = debugAuth;
}