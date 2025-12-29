// src/api/AdService.ts - VERSION COMPLÈTE ET OPTIMISÉE
import api from './axiosConfig';

// ==================== INTERFACES ====================
export interface User {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
}

export interface ApprovedBy {
  id: number;
  fullName: string;
  email: string;
}

export interface Ad {
  id: number;
  title: string;
  description: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  paymentMethod: string;
  status: 'pending' | 'approved' | 'published' | 'paused' | 'rejected' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
  approvedAt?: string;
  publishedAt?: string;
  adminNotes?: string;
  approvedBy?: ApprovedBy | null;
  user: User;
}

export interface AdsResponse {
  ads: Ad[];
  total?: number;
  page?: number;
  pages?: number;
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
 * Teste la connexion avec l'API pour déterminer le bon format
 */
export const testApiConnection = async (): Promise<{ success: boolean; supportedContentTypes: string[] }> => {
  try {
    // Test GET d'abord
    await api.get('/ads');
    
    // Test PATCH avec différents Content-Type
    const testAdId = 1; // ID de test
    const testData = { test: 'test' };
    const supportedContentTypes: string[] = [];
    
    const contentTypes = [
      'application/merge-patch+json',
      'application/json',
      'application/ld+json',
      'application/json-patch+json'
    ];
    
    for (const contentType of contentTypes) {
      try {
        await patchWithContentType(`/ads/${testAdId}`, testData, contentType);
        supportedContentTypes.push(contentType);
      } catch (error: any) {
        // Ignorer les erreurs 404, 405, etc. pour le test
        if (error.response?.status !== 415) {
          // Si c'est une autre erreur, le Content-Type est supporté mais l'action échoue
          supportedContentTypes.push(contentType);
        }
      }
    }
    
    return {
      success: true,
      supportedContentTypes
    };
  } catch (error: any) {
    console.error('❌ Test API échoué:', error);
    return {
      success: false,
      supportedContentTypes: []
    };
  }
};

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Récupère toutes les annonces (avec gestion de différents formats de réponse API)
 */
export const getAds = async (): Promise<AdsResponse> => {
  try {
    console.log('🔄 Chargement des annonces...');
    const response = await api.get('/ads');
    
    let adsData: any[] = [];
    const data = response.data;
    
    // Gestion des différents formats de réponse API
    if (Array.isArray(data)) {
      adsData = data;
    } else if (data['hydra:member']) {
      // Format API Platform Hydra
      adsData = data['hydra:member'];
    } else if (data.ads && Array.isArray(data.ads)) {
      // Format personnalisé { ads: [...] }
      adsData = data.ads;
    } else if (data.items && Array.isArray(data.items)) {
      // Format paginé { items: [...] }
      adsData = data.items;
    } else if (typeof data === 'object') {
      // Single object case
      adsData = [data];
    } else {
      console.warn('⚠️ Format de réponse API inattendu:', data);
      adsData = [];
    }
    
    // Mapping et normalisation des données
    const mappedAds: Ad[] = adsData.map((ad: any) => normalizeAd(ad));
    
    console.log(`✅ ${mappedAds.length} annonce(s) chargée(s)`);
    
    return {
      ads: mappedAds,
      total: data['hydra:totalItems'] || data.total || mappedAds.length,
      page: data.page || 1,
      pages: data.pages || 1
    };
    
  } catch (error: any) {
    console.error('❌ Erreur getAds:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url
    });
    
    throw new Error(
      error.response?.status === 404 
        ? 'Endpoint /ads non trouvé. Vérifiez la configuration API.'
        : error.response?.status === 401
        ? 'Non autorisé. Veuillez vous reconnecter.'
        : `Impossible de charger les annonces: ${error.message || 'Erreur réseau'}`
    );
  }
};

/**
 * Normalise une annonce depuis différents formats API
 */
const normalizeAd = (adData: any): Ad => {
  // Extraction des propriétés avec fallbacks
  const userData = adData.user || {};
  const approvedByData = adData.approvedBy || adData.approved_by;
  
  return {
    id: adData.id || 0,
    title: adData.title || 'Sans titre',
    description: adData.description || '',
    type: (adData.type === 'sell' ? 'sell' : 'buy') as 'buy' | 'sell',
    amount: Number(adData.amount) || 0,
    price: Number(adData.price) || 0,
    paymentMethod: adData.paymentMethod || adData.payment_method || 'Non spécifié',
    status: normalizeStatus(adData.status),
    createdAt: adData.createdAt || adData.created_at || new Date().toISOString(),
    updatedAt: adData.updatedAt || adData.updated_at || adData.createdAt || adData.created_at || new Date().toISOString(),
    approvedAt: adData.approvedAt || adData.approved_at,
    publishedAt: adData.publishedAt || adData.published_at,
    adminNotes: adData.adminNotes || adData.admin_notes,
    approvedBy: approvedByData ? normalizeApprovedBy(approvedByData) : null,
    user: normalizeUser(userData, adData.user_id)
  };
};

/**
 * Normalise le statut d'une annonce
 */
const normalizeStatus = (status: any): Ad['status'] => {
  const validStatuses: Ad['status'][] = [
    'pending', 'approved', 'published', 'paused', 'rejected', 'completed', 'cancelled'
  ];
  
  const statusStr = String(status).toLowerCase();
  return validStatuses.includes(statusStr as any) 
    ? statusStr as Ad['status'] 
    : 'pending';
};

/**
 * Normalise l'utilisateur qui a approuvé
 */
const normalizeApprovedBy = (approvedByData: any): ApprovedBy => {
  if (typeof approvedByData === 'object' && approvedByData !== null) {
    return {
      id: approvedByData.id || 0,
      fullName: approvedByData.fullName || approvedByData.full_name || approvedByData.username || 'Admin',
      email: approvedByData.email || 'admin@system.com'
    };
  }
  
  return {
    id: Number(approvedByData) || 0,
    fullName: 'Admin',
    email: 'admin@system.com'
  };
};

/**
 * Normalise les données utilisateur
 */
const normalizeUser = (userData: any, userId?: number): User => {
  return {
    id: userData.id || userId || 0,
    fullName: userData.fullName || userData.full_name || userData.username || 'Utilisateur',
    email: userData.email || 'email@inconnu.com',
    roles: Array.isArray(userData.roles) 
      ? userData.roles 
      : (userData.role ? [userData.role] : ['ROLE_USER'])
  };
};

// ==================== ACTIONS ADMIN ====================

/**
 * Approuve une annonce
 * @param id - ID de l'annonce
 * @param approvedById - ID de l'utilisateur qui approuve
 */
export const approveAd = async (id: number, approvedById: number): Promise<void> => {
  try {
    console.log(`✅ Tentative d'approbation annonce #${id}`);
    
    const payload = {
      status: 'approved',
      approvedBy: approvedById,
      adminNotes: 'Approuvé par l\'administrateur',
      approvedAt: new Date().toISOString()
    };
    
    // Essayer avec différents Content-Type
    await tryPatchWithMultipleContentTypes(`/ads/${id}`, payload);
    
    console.log(`✅ Annonce #${id} approuvée avec succès`);
    
  } catch (error: any) {
    console.error(`❌ Erreur approbation annonce #${id}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    const errorMessage = getErrorMessage(error, 'approbation');
    throw new Error(errorMessage);
  }
};

/**
 * Publie une annonce
 * @param id - ID de l'annonce
 */
export const publishAd = async (id: number): Promise<void> => {
  try {
    console.log(`📢 Tentative de publication annonce #${id}`);
    
    const payload = {
      status: 'published',
      publishedAt: new Date().toISOString()
    };
    
    // Essayer avec différents Content-Type
    await tryPatchWithMultipleContentTypes(`/ads/${id}`, payload);
    
    console.log(`✅ Annonce #${id} publiée avec succès`);
    
  } catch (error: any) {
    console.error(`❌ Erreur publication annonce #${id}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    const errorMessage = getErrorMessage(error, 'publication');
    throw new Error(errorMessage);
  }
};

/**
 * Rejette une annonce
 * @param id - ID de l'annonce
 * @param reason - Raison du rejet (optionnel)
 */
export const rejectAd = async (id: number, reason?: string | null): Promise<void> => {
  try {
    console.log(`❌ Tentative de rejet annonce #${id}, raison: "${reason || 'Non spécifiée'}"`);
    
    const payload = {
      status: 'rejected',
      adminNotes: reason || 'Rejeté par l\'administrateur'
    };
    
    // Essayer avec différents Content-Type
    await tryPatchWithMultipleContentTypes(`/ads/${id}`, payload);
    
    console.log(`✅ Annonce #${id} rejetée avec succès`);
    
  } catch (error: any) {
    console.error(`❌ Erreur rejet annonce #${id}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    const errorMessage = getErrorMessage(error, 'rejet');
    throw new Error(errorMessage);
  }
};

/**
 * Met en pause une annonce
 * @param id - ID de l'annonce
 */
export const pauseAd = async (id: number): Promise<void> => {
  try {
    console.log(`⏸️ Tentative de mise en pause annonce #${id}`);
    
    const payload = {
      status: 'paused'
    };
    
    // Essayer avec différents Content-Type
    await tryPatchWithMultipleContentTypes(`/ads/${id}`, payload);
    
    console.log(`✅ Annonce #${id} mise en pause avec succès`);
    
  } catch (error: any) {
    console.error(`❌ Erreur mise en pause annonce #${id}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    const errorMessage = getErrorMessage(error, 'mise en pause');
    throw new Error(errorMessage);
  }
};

/**
 * Supprime une annonce
 * @param id - ID de l'annonce
 */
export const deleteAd = async (id: number): Promise<void> => {
  try {
    console.log(`🗑️ Tentative de suppression annonce #${id}`);
    
    await api.delete(`/ads/${id}`);
    
    console.log(`✅ Annonce #${id} supprimée avec succès`);
    
  } catch (error: any) {
    console.error(`❌ Erreur suppression annonce #${id}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    const errorMessage = getErrorMessage(error, 'suppression');
    throw new Error(errorMessage);
  }
};

/**
 * Met à jour une annonce avec des données personnalisées
 * @param id - ID de l'annonce
 * @param data - Données à mettre à jour
 */
export const updateAd = async (id: number, data: Partial<Ad>): Promise<void> => {
  try {
    console.log(`✏️ Mise à jour personnalisée annonce #${id}:`, data);
    
    // Essayer avec différents Content-Type
    await tryPatchWithMultipleContentTypes(`/ads/${id}`, data);
    
    console.log(`✅ Annonce #${id} mise à jour avec succès`);
    
  } catch (error: any) {
    console.error(`❌ Erreur mise à jour annonce #${id}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    const errorMessage = getErrorMessage(error, 'mise à jour');
    throw new Error(errorMessage);
  }
};

// ==================== FONCTIONS UTILITAIRES ====================

/**
 * Génère un message d'erreur personnalisé selon le type d'erreur
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
      return `Annonce non trouvée pour ${action}.`;
    case 409:
      return `Conflit lors de ${action}. L'annonce a peut-être déjà été modifiée.`;
    case 415:
      return `Format de données non supporté pour ${action}. L'API ne supporte aucun format PATCH connu.`;
    case 422:
      const errors = error.response?.data?.violations || error.response?.data?.errors;
      if (errors) {
        const errorList = Array.isArray(errors) 
          ? errors.map((e: any) => e.propertyPath || e.field).join(', ')
          : JSON.stringify(errors);
        return `Erreur de validation pour ${action}: ${errorList}`;
      }
      return `Erreur de validation pour ${action}.`;
    case 429:
      return `Trop de tentatives de ${action}. Veuillez patienter.`;
    case 500:
      return `Erreur serveur lors de ${action}. Veuillez réessayer plus tard.`;
    case 502:
    case 503:
    case 504:
      return `Service temporairement indisponible pour ${action}. Veuillez réessayer.`;
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

/**
 * Obtient une annonce par son ID
 */
export const getAdById = async (id: number): Promise<Ad> => {
  try {
    console.log(`🔍 Récupération annonce #${id}`);
    
    const response = await api.get(`/ads/${id}`);
    const normalizedAd = normalizeAd(response.data);
    
    console.log(`✅ Annonce #${id} récupérée`);
    return normalizedAd;
    
  } catch (error: any) {
    console.error(`❌ Erreur récupération annonce #${id}:`, error);
    throw new Error(`Impossible de récupérer l'annonce #${id}: ${error.message || 'Erreur inconnue'}`);
  }
};

/**
 * Filtre les annonces par statut
 */
export const getAdsByStatus = async (status: Ad['status']): Promise<Ad[]> => {
  try {
    console.log(`🔍 Filtrage annonces par statut: ${status}`);
    
    const response = await getAds();
    const filteredAds = response.ads.filter(ad => ad.status === status);
    
    console.log(`✅ ${filteredAds.length} annonce(s) avec statut "${status}"`);
    return filteredAds;
    
  } catch (error: any) {
    console.error(`❌ Erreur filtrage par statut "${status}":`, error);
    throw error; // Propager l'erreur originale
  }
};

/**
 * Statistiques des annonces
 */
export interface AdsStats {
  total: number;
  pending: number;
  approved: number;
  published: number;
  rejected: number;
  paused: number;
  completed: number;
  cancelled: number;
}

export const getAdsStats = async (): Promise<AdsStats> => {
  try {
    const response = await getAds();
    const ads = response.ads;
    
    return {
      total: ads.length,
      pending: ads.filter(a => a.status === 'pending').length,
      approved: ads.filter(a => a.status === 'approved').length,
      published: ads.filter(a => a.status === 'published').length,
      rejected: ads.filter(a => a.status === 'rejected').length,
      paused: ads.filter(a => a.status === 'paused').length,
      completed: ads.filter(a => a.status === 'completed').length,
      cancelled: ads.filter(a => a.status === 'cancelled').length
    };
    
  } catch (error: any) {
    console.error('❌ Erreur calcul statistiques:', error);
    return {
      total: 0,
      pending: 0,
      approved: 0,
      published: 0,
      rejected: 0,
      paused: 0,
      completed: 0,
      cancelled: 0
    };
  }
};

/**
 * Solution d'urgence - Utilise PUT au lieu de PATCH
 */
export const approveAdWithPut = async (id: number, approvedById: number): Promise<void> => {
  try {
    console.log(`🔄 Approbation avec PUT annonce #${id}`);
    
    // 1. Récupérer l'annonce actuelle
    const response = await api.get(`/ads/${id}`);
    const currentAd = response.data;
    
    // 2. Mettre à jour les champs nécessaires
    currentAd.status = 'approved';
    currentAd.approvedBy = approvedById;
    currentAd.adminNotes = 'Approuvé par l\'administrateur';
    currentAd.approvedAt = new Date().toISOString();
    
    // 3. Envoyer avec PUT
    await api.put(`/ads/${id}`, currentAd);
    
    console.log(`✅ Annonce #${id} approuvée avec PUT`);
    
  } catch (error: any) {
    console.error(`❌ Erreur approbation PUT annonce #${id}:`, error);
    throw new Error(`Erreur lors de l'approbation avec PUT: ${error.message || 'Erreur inconnue'}`);
  }
};

// ==================== EXPORT PRINCIPAL ====================

const AdService = {
  getAds,
  getAdById,
  getAdsByStatus,
  getAdsStats,
  approveAd,
  publishAd,
  rejectAd,
  pauseAd,
  deleteAd,
  updateAd,
  approveAdWithPut,
  testApiConnection,
  tryPatchWithMultipleContentTypes
};

export default AdService;