// src/api/AuthService.ts - VERSION SYMFONY
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
  // Note: Symfony ne renvoie généralement PAS de token dans le body
  // L'authentification se fait via les cookies/session
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

  constructor(message: string, code?: string, status?: number) {
    super(message);
    this.name = 'AuthServiceError';
    this.code = code;
    this.status = status;
  }
}

// ==============================
// CONSTANTES
// ==============================

const STORAGE_KEYS = {
  USER: 'user',
  IS_AUTHENTICATED: 'isAuthenticated',
  AUTH_TIMESTAMP: 'authTimestamp',
  AUTH_METHOD: 'authMethod'
} as const;

const AUTH_METHOD = 'symfony_session';

// ==============================
// FONCTIONS UTILITAIRES DE SESSION
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

// ==============================
// SERVICE D'AUTHENTIFICATION SYMFONY
// ==============================

/**
 * Connexion utilisateur avec Symfony
 */
export const loginUser = async (loginData: LoginData): Promise<AuthResponse> => {
  const startTime = Date.now();
  
  try {
    console.group('🔐 Connexion Symfony');
    console.log('📤 Envoi à /auth/login');
    console.log('👤 Email:', loginData.email);
    console.log('🍪 Cookies avant login:', document.cookie);

    // Envoyez la requête avec withCredentials pour les cookies
    const response = await api.post<AuthResponse>('/auth/login', loginData);

    const responseTime = Date.now() - startTime;
    console.log(`✅ Connexion réussie en ${responseTime}ms`);
    
    // Affichez la réponse complète
    console.log('📥 Réponse Symfony:', response.data);
    console.log('📊 Clés disponibles:', Object.keys(response.data));
    
    // Vérifiez les cookies après login
    console.log('🍪 Cookies après login:', document.cookie);
    
    const responseData = response.data;
    
    // Stockage des données utilisateur
    if (responseData.user) {
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(responseData.user));
      localStorage.setItem(STORAGE_KEYS.IS_AUTHENTICATED, 'true');
      localStorage.setItem(STORAGE_KEYS.AUTH_TIMESTAMP, Date.now().toString());
      localStorage.setItem(STORAGE_KEYS.AUTH_METHOD, AUTH_METHOD);
      
      console.log('💾 Utilisateur stocké:', responseData.user.email);
      console.log('🔐 Méthode d\'auth:', AUTH_METHOD);
      
      // Vérifiez que la session est bien établie
      const sessionActive = checkSymfonySession();
      console.log('🛡️ Session Symfony active:', sessionActive);
    } else {
      throw new AuthServiceError('Réponse invalide: utilisateur manquant', 'INVALID_RESPONSE');
    }
    
    console.groupEnd();
    return responseData;

  } catch (error: any) {
    console.groupEnd();
    console.error('❌ Erreur de connexion Symfony:', error);
    
    // Gestion des erreurs spécifiques Symfony
    if (error.response) {
      const { status, data } = error.response;
      
      switch (status) {
        case 401:
          throw new AuthServiceError(
            data?.message || 'Identifiants incorrects',
            'UNAUTHORIZED',
            status
          );
        
        case 403:
          throw new AuthServiceError(
            'Compte non activé ou bloqué',
            'FORBIDDEN',
            status
          );
        
        case 422:
          const violations = data?.violations || [];
          const messages = violations.map((v: any) => v.message).join(', ');
          throw new AuthServiceError(
            messages || 'Données invalides',
            'VALIDATION_ERROR',
            status
          );
        
        case 429:
          throw new AuthServiceError(
            'Trop de tentatives. Réessayez plus tard.',
            'RATE_LIMIT',
            status
          );
        
        default:
          throw new AuthServiceError(
            data?.message || `Erreur serveur (${status})`,
            'HTTP_ERROR',
            status
          );
      }
    }
    
    // Erreurs réseau
    if (error.code === 'ERR_NETWORK') {
      throw new AuthServiceError(
        'Impossible de joindre le serveur',
        'NETWORK_ERROR'
      );
    }
    
    throw new AuthServiceError(
      error.message || 'Erreur inconnue',
      'UNKNOWN_ERROR'
    );
  }
};

/**
 * Déconnexion utilisateur (Symfony)
 */
export const logoutUser = (redirect: boolean = true): Promise<void> => {
  return new Promise((resolve) => {
    console.group('👋 Déconnexion Symfony');
    
    try {
      // 1. Appel API de déconnexion Symfony
      console.log('📤 Appel /auth/logout...');
      api.post('/auth/logout', {})
        .then(() => {
          console.log('✅ Déconnexion API réussie');
        })
        .catch(err => {
          console.warn('⚠️ Erreur déconnexion API (peut être normal):', err.message);
        })
        .finally(() => {
          // 2. Nettoyage local
          clearSymfonySession();
          
          // 3. Redirection si demandée
          if (redirect && typeof window !== 'undefined') {
            console.log('🔄 Redirection vers /login');
            setTimeout(() => {
              window.location.href = '/login';
              resolve();
            }, 500);
          } else {
            resolve();
          }
          
          console.groupEnd();
        });
        
    } catch (error) {
      console.error('❌ Erreur lors de la déconnexion:', error);
      clearSymfonySession();
      
      if (redirect && typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      
      resolve();
      console.groupEnd();
    }
  });
};

/**
 * Inscription utilisateur
 */
export const registerUser = async (registerData: RegisterData): Promise<any> => {
  try {
    console.group('📝 Inscription utilisateur');
    
    const response = await api.post('/auth/register', registerData);
    
    console.log('✅ Inscription réussie:', response.data);
    console.groupEnd();
    
    return response.data;
  } catch (error: any) {
    console.error('❌ Erreur d\'inscription:', error);
    throw error;
  }
};

// ==============================
// FONCTIONS DE VÉRIFICATION
// ==============================

/**
 * Récupère l'utilisateur courant depuis le localStorage
 */
export const getCurrentUser = (): User | null => {
  try {
    const userStr = localStorage.getItem(STORAGE_KEYS.USER);
    return userStr ? JSON.parse(userStr) : null;
  } catch (error) {
    console.error('❌ Erreur parsing user:', error);
    return null;
  }
};

/**
 * Vérifie si l'utilisateur est authentifié (Symfony)
 */
export const isAuthenticated = (): boolean => {
  const user = getCurrentUser();
  const isAuthFlag = localStorage.getItem(STORAGE_KEYS.IS_AUTHENTICATED) === 'true';
  const hasPhpSession = document.cookie.includes('PHPSESSID');
  
  const authenticated = !!(user && isAuthFlag && hasPhpSession);
  
  console.log('🔍 Vérification auth Symfony:', {
    hasUser: !!user,
    userEmail: user?.email,
    isAuthFlag,
    hasPhpSession,
    authenticated
  });
  
  return authenticated;
};

/**
 * Vérifie la session Symfony côté serveur
 */
export const verifyServerSession = async (): Promise<boolean> => {
  try {
    console.log('🛡️ Vérification session serveur...');
    
    // Utilisez un endpoint qui nécessite une authentification
    const response = await api.get('/user_bank_details', {
      validateStatus: (status) => status < 500 // Ne pas rejeter les 401/403
    });
    
    const sessionActive = response.status !== 401 && response.status !== 403;
    
    console.log('🔍 Statut session serveur:', {
      status: response.status,
      sessionActive,
      endpoint: '/user_bank_details'
    });
    
    return sessionActive;
  } catch (error) {
    console.error('❌ Erreur vérification session:', error);
    return false;
  }
};

/**
 * Rafraîchit la session si nécessaire
 */
export const refreshSessionIfNeeded = async (): Promise<boolean> => {
  if (!isAuthenticated()) {
    console.log('🔐 Non authentifié localement');
    return false;
  }
  
  const serverSessionActive = await verifyServerSession();
  
  if (!serverSessionActive) {
    console.log('🔐 Session serveur expirée - nettoyage');
    clearSymfonySession();
    return false;
  }
  
  console.log('✅ Session valide des deux côtés');
  return true;
};

// ==============================
// FONCTIONS DE DÉBOGAGE
// ==============================

/**
 * Affiche des informations de débogage complètes
 */
export const debugAuth = (): void => {
  console.group('🐛 DEBUG AUTHENTIFICATION SYMFONY');
  
  console.log('📦 LOCALSTORAGE:');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i)!;
    const value = localStorage.getItem(key);
    console.log(`  ${key}:`, value?.substring(0, 100) + (value && value.length > 100 ? '...' : ''));
  }
  
  console.log('🍪 COOKIES:');
  document.cookie.split(';').forEach(cookie => {
    console.log(`  ${cookie.trim()}`);
  });
  
  console.log('📊 ÉTAT AUTH:');
  console.log('  Utilisateur:', getCurrentUser());
  console.log('  Authentifié (local):', isAuthenticated());
  console.log('  Méthode auth:', localStorage.getItem(STORAGE_KEYS.AUTH_METHOD));
  console.log('  PHPSESSID présent:', document.cookie.includes('PHPSESSID'));
  
  console.groupEnd();
};

/**
 * Teste une requête API protégée
 */
export const testProtectedRequest = async (): Promise<void> => {
  try {
    console.log('🧪 Test requête protégée...');
    
    const response = await api.get('/user_bank_details');
    
    console.log('✅ Requête protégée réussie:', {
      status: response.status,
      data: response.data
    });
    
  } catch (error: any) {
    console.error('❌ Échec requête protégée:', {
      status: error.response?.status,
      message: error.message,
      cookies: document.cookie
    });
  }
};

// ==============================
// INITIALISATION
// ==============================

// Exportez debugAuth pour la console
if (typeof window !== 'undefined') {
  (window as any).debugAuth = debugAuth;
  (window as any).testProtectedRequest = testProtectedRequest;
  
  console.log('🚀 AuthService Symfony initialisé');
  console.log('📝 Commandes disponibles:');
  console.log('  - debugAuth() : Affiche l\'état d\'authentification');
  console.log('  - testProtectedRequest() : Teste une requête protégée');
}

// ==============================
// EXPORTS
// ==============================

// Pas besoin de ré-exporter les fonctions déjà exportées