// src/api/UserService.ts - VERSION SIMPLIFIÉE COMME AdService
import api from './axiosConfig';
import type { User } from '../types/User';

// ==================== INTERFACES ====================
export interface RegisterUserData {
  fullName: string;
  email: string;
  phone: string;
  password: string;
}

export interface LoginResponse {
  token: string;
  user: User;
  refresh_token?: string;
}

export interface UpdateUserData {
  fullName?: string;
  email?: string;
  phone?: string;
  reputation?: number;
  isVerified?: boolean;
  roles?: string[];
  isActive?: boolean;
  walletAddress?: string;
  avatarUrl?: string;
}

export interface UserFilters {
  page?: number;
  limit?: number;
  search?: string;
  role?: string;
  isVerified?: boolean;
  isActive?: boolean;
}

export interface UsersResponse {
  users: User[];
  total?: number;
  page?: number;
  pages?: number;
}

export interface UserStats {
  total: number;
  admins: number;
  verified: number;
  active: number;
  inactive: number;
}

// ==================== FONCTION PATCH GÉNÉRIQUE ====================

/**
 * Fonction générique pour les requêtes PATCH avec gestion du Content-Type
 */
const patchWithContentType = async (url: string, data: any, contentType: string = 'application/merge-patch+json'): Promise<any> => {
  try {
    const response = await api.patch(url, data, {
      headers: {
        'Content-Type': contentType
      }
    });
    return response;
  } catch (error: any) {
    console.error(`Erreur avec Content-Type ${contentType}:`, error.response?.status);
    throw error;
  }
};

/**
 * Tente différentes approches pour trouver le bon Content-Type
 */
const tryPatchWithMultipleContentTypes = async (url: string, data: any): Promise<any> => {
  const contentTypes = [
    'application/merge-patch+json',
    'application/json',
    'application/ld+json',
    'application/json-patch+json'
  ];
  
  for (const contentType of contentTypes) {
    try {
      console.log(`🔄 Essai avec Content-Type: ${contentType}`);
      const response = await patchWithContentType(url, data, contentType);
      console.log(`✅ Succès avec Content-Type: ${contentType}`);
      return response;
    } catch (error: any) {
      if (error.response?.status !== 415) {
        // Si c'est une autre erreur que 415, on la propage
        throw error;
      }
      // Si c'est 415, on continue avec le prochain Content-Type
      console.log(`❌ Échec avec Content-Type: ${contentType} (415)`);
    }
  }
  
  // Si aucun Content-Type ne fonctionne, essayer sans Content-Type spécifique
  console.log('🔄 Essai sans Content-Type spécifique');
  try {
    const response = await api.patch(url, data);
    console.log('✅ Succès sans Content-Type spécifique');
    return response;
  } catch (error: any) {
    console.error('❌ Tous les Content-Type ont échoué');
    throw error;
  }
};

/**
 * Génère un message d'erreur personnalisé
 */
const getErrorMessage = (error: any, action: string): string => {
  const status = error.response?.status;
  
  switch (status) {
    case 400:
      return `Données invalides pour ${action}. Vérifiez les champs.`;
    case 401:
      return `Non autorisé à effectuer ${action}. Veuillez vous reconnecter.`;
    case 403:
      return `Permission refusée pour ${action}. Droits insuffisants.`;
    case 404:
      return `Utilisateur non trouvé pour ${action}.`;
    case 409:
      return `Conflit lors de ${action}. L'utilisateur a peut-être déjà été modifié.`;
    case 415:
      return `Format de données non supporté pour ${action}.`;
    case 422:
      const errors = error.response?.data?.violations || error.response?.data?.errors;
      if (errors) {
        const errorList = Array.isArray(errors) 
          ? errors.map((e: any) => e.propertyPath || e.field).join(', ')
          : JSON.stringify(errors);
        return `Erreur de validation pour ${action}: ${errorList}`;
      }
      return `Erreur de validation pour ${action}.`;
    case 500:
      return `Erreur serveur lors de ${action}. Veuillez réessayer plus tard.`;
    default:
      if (error.code === 'ECONNABORTED') {
        return `Délai d'attente dépassé pour ${action}. Vérifiez votre connexion.`;
      }
      if (error.code === 'NETWORK_ERROR') {
        return `Erreur réseau lors de ${action}. Vérifiez votre connexion.`;
      }
      return `Erreur lors de ${action}: ${error.message || 'Erreur inconnue'}`;
  }
};

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Récupère tous les utilisateurs
 */
export const getUsers = async (filters?: UserFilters): Promise<UsersResponse> => {
  try {
    console.log('🔄 Chargement des utilisateurs...');
    
    const params = {
      page: filters?.page || 1,
      itemsPerPage: filters?.limit || 20,
      ...(filters?.search && { search: filters.search }),
      ...(filters?.role && { role: filters.role }),
      ...(filters?.isVerified !== undefined && { isVerified: filters.isVerified }),
      ...(filters?.isActive !== undefined && { isActive: filters.isActive }),
    };

    const response = await api.get('/users', { params });
    
    let usersData: any[] = [];
    const data = response.data;
    
    // Gestion des différents formats de réponse API
    if (Array.isArray(data)) {
      usersData = data;
    } else if (data['hydra:member']) {
      // Format API Platform Hydra
      usersData = data['hydra:member'];
    } else if (data.users && Array.isArray(data.users)) {
      // Format personnalisé { users: [...] }
      usersData = data.users;
    } else if (data.items && Array.isArray(data.items)) {
      // Format paginé { items: [...] }
      usersData = data.items;
    } else if (typeof data === 'object') {
      // Single object case
      usersData = [data];
    } else {
      console.warn('⚠️ Format de réponse API inattendu:', data);
      usersData = [];
    }
    
    // Mapping et normalisation des données
    const mappedUsers: User[] = usersData.map((user: any) => normalizeUser(user));
    
    console.log(`✅ ${mappedUsers.length} utilisateur(s) chargé(s)`);
    
    return {
      users: mappedUsers,
      total: data['hydra:totalItems'] || data.total || mappedUsers.length,
      page: data.page || 1,
      pages: data.pages || 1
    };
    
  } catch (error: any) {
    console.error('❌ Erreur getUsers:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url
    });
    
    throw new Error(
      error.response?.status === 404 
        ? 'Endpoint /users non trouvé. Vérifiez la configuration API.'
        : error.response?.status === 401
        ? 'Non autorisé. Veuillez vous reconnecter.'
        : `Impossible de charger les utilisateurs: ${error.message || 'Erreur réseau'}`
    );
  }
};

/**
 * Normalise un utilisateur depuis différents formats API
 */
const normalizeUser = (userData: any): User => {
  // Extraction des propriétés avec fallbacks
  return {
    id: userData.id || 0,
    email: userData.email || '',
    fullName: userData.fullName || userData.full_name || userData.username || 'Non renseigné',
    phone: userData.phone || 'Non renseigné',
    roles: normalizeRoles(userData.roles || ['ROLE_USER']),
    isVerified: userData.isVerified !== undefined ? Boolean(userData.isVerified) : true,
    reputation: userData.reputation || 5.0,
    walletAddress: userData.walletAddress || userData.wallet_address || '',
    isActive: userData.isActive !== undefined ? Boolean(userData.isActive) : true,
    createdAt: userData.createdAt || userData.created_at || new Date().toISOString(),
    updatedAt: userData.updatedAt || userData.updated_at || userData.createdAt || userData.created_at || new Date().toISOString(),
  };
};

/**
 * Normalise les rôles d'un utilisateur
 */
const normalizeRoles = (roles: any): string[] => {
  if (!roles) return ['ROLE_USER'];
  
  let roleList: string[] = [];
  
  if (Array.isArray(roles)) {
    roleList = roles;
  } else if (typeof roles === 'string') {
    if (roles.includes(',')) {
      roleList = roles.split(',');
    } else {
      roleList = [roles];
    }
  }
  
  // Nettoyer et normaliser
  return roleList
    .filter((role: any): role is string => typeof role === 'string')
    .map((role: string) => role.trim().toUpperCase())
    .filter((role: string) => role.length > 0);
};

/**
 * Récupère un utilisateur par son ID
 */
export const getUserById = async (id: number): Promise<User> => {
  try {
    console.log(`🔍 Récupération de l'utilisateur #${id}`);
    
    const response = await api.get(`/users/${id}`);
    const user = normalizeUser(response.data);
    
    console.log(`✅ Utilisateur #${id} récupéré - Rôles:`, user.roles);
    
    return user;
    
  } catch (error: any) {
    console.error(`❌ Erreur récupération utilisateur #${id}:`, error);
    
    throw new Error(
      getErrorMessage(error, 'la récupération de l\'utilisateur')
    );
  }
};

/**
 * Met à jour un utilisateur
 */
export const updateUser = async (id: number, userData: Partial<User>): Promise<void> => {
  try {
    console.log(`✏️ Mise à jour de l'utilisateur #${id}:`, userData);
    
    const payload: any = {};
    
    if (userData.email !== undefined) payload.email = userData.email;
    if (userData.fullName !== undefined) payload.fullName = userData.fullName;
    if (userData.phone !== undefined) payload.phone = userData.phone;
    if (userData.reputation !== undefined) payload.reputation = userData.reputation;
    if (userData.isVerified !== undefined) payload.isVerified = userData.isVerified;
    if (userData.roles !== undefined) {
      // S'assurer que les rôles sont un tableau de strings
      payload.roles = Array.isArray(userData.roles) ? userData.roles : [userData.roles];
      console.log('📤 Rôles envoyés à l\'API:', payload.roles);
    }
    if (userData.isActive !== undefined) payload.isActive = userData.isActive;
    if (userData.walletAddress !== undefined) payload.walletAddress = userData.walletAddress;
    
    // Essayer avec différents Content-Type
    await tryPatchWithMultipleContentTypes(`/users/${id}`, payload);
    
    console.log(`✅ Utilisateur #${id} mis à jour avec succès`);
    
  } catch (error: any) {
    console.error(`❌ Erreur updateUser #${id}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    throw new Error(
      getErrorMessage(error, 'la mise à jour de l\'utilisateur')
    );
  }
};

/**
 * Supprime un utilisateur
 */
export const deleteUser = async (id: number): Promise<void> => {
  try {
    console.log(`🗑️ Tentative de suppression utilisateur #${id}`);
    
    await api.delete(`/users/${id}`);
    
    console.log(`✅ Utilisateur #${id} supprimé avec succès`);
    
  } catch (error: any) {
    console.error(`❌ Erreur suppression utilisateur #${id}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    throw new Error(
      getErrorMessage(error, 'la suppression de l\'utilisateur')
    );
  }
};

/**
 * Promouvoir un utilisateur en admin - VERSION SIMPLIFIÉE
 */
export const promoteToAdmin = async (userId: number): Promise<void> => {
  try {
    console.log(`👑 Promotion de l'utilisateur #${userId} en admin`);
    
    // 1. Récupérer l'utilisateur actuel
    const currentUser = await getUserById(userId);
    
    // 2. Vérifier s'il est déjà admin
    const currentRoles = currentUser.roles || ['ROLE_USER'];
    const isAlreadyAdmin = currentRoles.some(role => role.toUpperCase() === 'ROLE_ADMIN');
    
    if (isAlreadyAdmin) {
      console.log(`ℹ️ Utilisateur #${userId} est déjà admin`);
      return;
    }
    
    // 3. Ajouter ROLE_ADMIN
    const newRoles = [...currentRoles, 'ROLE_ADMIN'];
    
    console.log(`➕ Ajout du rôle ADMIN - Nouveaux rôles:`, newRoles);
    
    // 4. Mettre à jour l'utilisateur (sans attendre la réponse détaillée)
    await updateUser(userId, { roles: newRoles });
    
    console.log(`✅ Utilisateur #${userId} promu administrateur`);
    
  } catch (error: any) {
    console.error(`❌ Erreur promotion utilisateur #${userId}:`, error);
    
    throw new Error(
      getErrorMessage(error, 'la promotion de l\'utilisateur')
    );
  }
};

/**
 * Rétrograder un admin en utilisateur normal
 */
export const demoteFromAdmin = async (userId: number): Promise<void> => {
  try {
    console.log(`⬇️ Rétrogradation de l'utilisateur #${userId} (admin → user)`);
    
    // Récupérer l'utilisateur actuel
    const currentUser = await getUserById(userId);
    
    // Préparer les nouveaux rôles (sans admin)
    const currentRoles = currentUser.roles || ['ROLE_USER', 'ROLE_ADMIN'];
    const newRoles = currentRoles.filter((role: string) => role.toUpperCase() !== 'ROLE_ADMIN');
    
    // Si plus de rôles, garder ROLE_USER
    if (newRoles.length === 0) {
      newRoles.push('ROLE_USER');
    }
    
    console.log(`➖ Suppression rôle ADMIN - Nouveaux rôles:`, newRoles);
    
    // Mettre à jour l'utilisateur
    await updateUser(userId, { roles: newRoles });
    
    console.log(`✅ Utilisateur #${userId} rétrogradé`);
    
  } catch (error: any) {
    console.error(`❌ Erreur rétrogradation utilisateur #${userId}:`, error);
    
    throw new Error(
      getErrorMessage(error, 'la rétrogradation de l\'utilisateur')
    );
  }
};

/**
 * Vérifie un utilisateur
 */
export const verifyUser = async (userId: number): Promise<void> => {
  try {
    console.log(`✅ Vérification de l'utilisateur #${userId}`);
    
    await updateUser(userId, { isVerified: true });
    
    console.log(`✅ Utilisateur #${userId} vérifié`);
    
  } catch (error: any) {
    console.error(`❌ Erreur vérification utilisateur #${userId}:`, error);
    
    throw new Error(
      getErrorMessage(error, 'la vérification de l\'utilisateur')
    );
  }
};

/**
 * Désactive un utilisateur
 */
export const deactivateUser = async (userId: number): Promise<void> => {
  try {
    console.log(`⏸️ Désactivation de l'utilisateur #${userId}`);
    
    await updateUser(userId, { isActive: false });
    
    console.log(`✅ Utilisateur #${userId} désactivé`);
    
  } catch (error: any) {
    console.error(`❌ Erreur désactivation utilisateur #${userId}:`, error);
    
    throw new Error(
      getErrorMessage(error, 'la désactivation de l\'utilisateur')
    );
  }
};

/**
 * Réactive un utilisateur
 */
export const activateUser = async (userId: number): Promise<void> => {
  try {
    console.log(`▶️ Activation de l'utilisateur #${userId}`);
    
    await updateUser(userId, { isActive: true });
    
    console.log(`✅ Utilisateur #${userId} activé`);
    
  } catch (error: any) {
    console.error(`❌ Erreur activation utilisateur #${userId}:`, error);
    
    throw new Error(
      getErrorMessage(error, 'l\'activation de l\'utilisateur')
    );
  }
};

/**
 * Statistiques des utilisateurs
 */
export const getUserStats = async (): Promise<UserStats> => {
  try {
    const { users } = await getUsers();
    
    const admins = users.filter(user => {
      return user.roles.some(role => role.toUpperCase() === 'ROLE_ADMIN');
    }).length;
    
    return {
      total: users.length,
      admins: admins,
      verified: users.filter(u => u.isVerified).length,
      active: users.filter(u => u.isActive).length,
      inactive: users.filter(u => !u.isActive).length
    };
    
  } catch (error: any) {
    console.error('❌ Erreur calcul statistiques:', error);
    return {
      total: 0,
      admins: 0,
      verified: 0,
      active: 0,
      inactive: 0
    };
  }
};

// ==================== GESTION D'AUTHENTIFICATION ====================

/**
 * Connexion utilisateur
 */
export const loginUser = async (email: string, password: string): Promise<LoginResponse> => {
  try {
    console.log('🔑 Connexion utilisateur:', email);
    
    const response = await api.post('/login_check', { 
      email: email.trim().toLowerCase(), 
      password: password 
    });
    
    const token = response.data.token || response.data.access_token;
    const refreshToken = response.data.refresh_token;
    
    if (!token) {
      throw new Error('Token non reçu');
    }
    
    // Créer un utilisateur local (l'API pourrait ne pas retourner les données user)
    const user: User = {
      id: 0,
      email: email.trim().toLowerCase(),
      fullName: email.split('@')[0] || 'Utilisateur',
      roles: ['ROLE_USER'], // Par défaut
      isVerified: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      isActive: true,
      phone: '',
      walletAddress: '',
      reputation: 5.0
    };
    
    console.log('✅ Connexion réussie');
    
    return { 
      token, 
      user,
      refresh_token: refreshToken
    };
    
  } catch (error: any) {
    console.error('❌ Erreur connexion:', error);
    
    if (error.response?.status === 401) {
      throw new Error('Email ou mot de passe incorrect');
    }
    
    throw new Error(
      error.response?.data?.message || 'Erreur lors de la connexion'
    );
  }
};

/**
 * Vérifie si un utilisateur est admin
 */
export const checkUserIsAdmin = (user: User | null): boolean => {
  if (!user || !user.roles) return false;
  return user.roles.some(role => role.toUpperCase() === 'ROLE_ADMIN');
};

// ==================== EXPORT PRINCIPAL ====================

const UserService = {
  // Gestion des utilisateurs
  getUsers,
  getUserById,
  updateUser,
  deleteUser,
  promoteToAdmin,
  demoteFromAdmin,
  verifyUser,
  deactivateUser,
  activateUser,
  getUserStats,
  
  // Auth
  loginUser,
  checkUserIsAdmin,
  
  // Utilitaires
  tryPatchWithMultipleContentTypes,
};

export default UserService;