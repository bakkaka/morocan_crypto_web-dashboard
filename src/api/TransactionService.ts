// src/api/TransactionService.ts - MÊME PATTERN QUE AdService.ts
import api from './axiosConfig';

// ==================== INTERFACES ====================
export interface User {
  id: number;
  fullName: string;
  email: string;
  roles: string[];
  reputation?: number;
  isVerified?: boolean;
}

export interface Ad {
  id: number;
  title: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  user: User;
}

export interface Transaction {
  id: number;
  '@id'?: string;
  ad: Ad | string;
  buyer: User | string;
  seller: User | string;
  usdtAmount: number;
  fiatAmount: number;
  status: 'pending' | 'paid' | 'released' | 'cancelled' | 'completed' | 'disputed';
  createdAt: string;
  updatedAt?: string;
  paidAt?: string;
  releasedAt?: string;
  paymentReference?: string;
  paymentProofImage?: string;
  expiresAt?: string;
  adminNotes?: string;
}

export interface TransactionFilters {
  page?: number;
  itemsPerPage?: number;
  status?: string;
  buyer?: number;
  seller?: number;
  ad?: number;
  'order[createdAt]'?: 'asc' | 'desc';
}

export interface TransactionStats {
  total: number;
  pending: number;
  paid: number;
  released: number;
  completed: number;
  cancelled: number;
  disputed: number;
  totalUsdt: number;
  totalFiat: number;
}

// ==================== FONCTIONS PATCH (comme AdService) ====================

const patchWithContentType = async (url: string, data: any, contentType: string = 'application/merge-patch+json'): Promise<any> => {
  try {
    const response = await api.patch(url, data, {
      headers: { 'Content-Type': contentType }
    });
    return response;
  } catch (error: any) {
    console.error(`Erreur avec Content-Type ${contentType}:`, error.response?.status);
    throw error;
  }
};

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
      if (error.response?.status !== 415) throw error;
      console.log(`❌ Échec avec Content-Type: ${contentType} (415)`);
    }
  }
  
  // Essayer sans Content-Type spécifique
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

// ==================== FONCTIONS PRINCIPALES ====================

/**
 * Récupère toutes les transactions (pour admin) - MÊME PATTERN QUE getAds()
 */
export const getTransactions = async (filters?: TransactionFilters): Promise<{ transactions: Transaction[]; total: number }> => {
  try {
    console.log('🔄 Chargement des transactions...');
    
    const params = {
      page: filters?.page || 1,
      itemsPerPage: filters?.itemsPerPage || 100,
      'order[createdAt]': 'desc',
      ...filters
    };
    
    const response = await api.get('/transactions', { params });
    console.log('✅ Réponse API transactions:', response.data);
    
    let transactionsData: any[] = [];
    const data = response.data;
    
    // MÊME PATTERN QUE AdService.ts
    if (Array.isArray(data)) {
      transactionsData = data;
    } else if (data['hydra:member']) {
      transactionsData = data['hydra:member'];
    } else if (data.transactions && Array.isArray(data.transactions)) {
      transactionsData = data.transactions;
    } else if (data.items && Array.isArray(data.items)) {
      transactionsData = data.items;
    } else if (typeof data === 'object') {
      transactionsData = [data];
    } else {
      console.warn('⚠️ Format de réponse API inattendu pour transactions:', data);
      transactionsData = [];
    }
    
    const mappedTransactions: Transaction[] = transactionsData.map((transaction: any) => normalizeTransaction(transaction));
    
    console.log(`✅ ${mappedTransactions.length} transaction(s) chargée(s)`);
    
    return {
      transactions: mappedTransactions,
      total: data['hydra:totalItems'] || data.total || mappedTransactions.length
    };
    
  } catch (error: any) {
    console.error('❌ Erreur getTransactions:', {
      message: error.message,
      status: error.response?.status,
      url: error.config?.url
    });
    
    throw new Error(
      error.response?.status === 404 
        ? 'Endpoint /transactions non trouvé. Vérifiez la configuration API.'
        : error.response?.status === 401
        ? 'Non autorisé. Veuillez vous reconnecter.'
        : `Impossible de charger les transactions: ${error.message || 'Erreur réseau'}`
    );
  }
};

/**
 * Récupère les transactions d'un utilisateur
 */
export const getUserTransactions = async (userId: number): Promise<Transaction[]> => {
  try {
    console.log(`👤 Chargement transactions utilisateur #${userId}...`);
    
    const filters: TransactionFilters = {
      itemsPerPage: 100,
      'order[createdAt]': 'desc'
    };
    
    // Essayer avec buyer ou seller
    let transactions: Transaction[] = [];
    
    try {
      const response = await getTransactions({ ...filters, buyer: userId });
      transactions = response.transactions;
      
      // Essayer aussi avec seller
      const responseSeller = await getTransactions({ ...filters, seller: userId });
      transactions = [...transactions, ...responseSeller.transactions];
      
    } catch {
      // Fallback: toutes les transactions puis filtrer
      const allTransactions = await getTransactions(filters);
      transactions = allTransactions.transactions.filter(t => 
        (typeof t.buyer === 'object' && t.buyer.id === userId) ||
        (typeof t.seller === 'object' && t.seller.id === userId)
      );
    }
    
    // Supprimer les doublons
    const uniqueTransactions = Array.from(new Map(transactions.map(t => [t.id, t])).values());
    
    console.log(`✅ ${uniqueTransactions.length} transactions pour l'utilisateur #${userId}`);
    return uniqueTransactions;
    
  } catch (error: any) {
    console.error(`❌ Erreur getUserTransactions ${userId}:`, error);
    throw error;
  }
};

/**
 * Normalise une transaction - MÊME PATTERN QUE normalizeAd()
 */
const normalizeTransaction = (transactionData: any): Transaction => {
  // Normaliser ad
  let ad = transactionData.ad;
  if (typeof ad === 'string' && ad.includes('/api/ads/')) {
    // C'est un lien IRI
    ad = {
      id: parseInt(ad.split('/').pop() || '0'),
      title: 'Annonce',
      type: 'buy' as 'buy' | 'sell',
      amount: 0,
      price: 0,
      user: { id: 0, fullName: 'Utilisateur', email: '', roles: ['ROLE_USER'] }
    };
  }
  
  // Normaliser buyer
  let buyer = transactionData.buyer;
  if (typeof buyer === 'string' && buyer.includes('/api/users/')) {
    buyer = {
      id: parseInt(buyer.split('/').pop() || '0'),
      fullName: 'Acheteur',
      email: '',
      roles: ['ROLE_USER']
    };
  }
  
  // Normaliser seller
  let seller = transactionData.seller;
  if (typeof seller === 'string' && seller.includes('/api/users/')) {
    seller = {
      id: parseInt(seller.split('/').pop() || '0'),
      fullName: 'Vendeur',
      email: '',
      roles: ['ROLE_USER']
    };
  }
  
  return {
    id: transactionData.id || 0,
    '@id': transactionData['@id'],
    ad,
    buyer,
    seller,
    usdtAmount: parseFloat(transactionData.usdtAmount) || 0,
    fiatAmount: parseFloat(transactionData.fiatAmount) || 0,
    status: (transactionData.status || 'pending') as Transaction['status'],
    createdAt: transactionData.createdAt || new Date().toISOString(),
    updatedAt: transactionData.updatedAt,
    paidAt: transactionData.paidAt,
    releasedAt: transactionData.releasedAt,
    paymentReference: transactionData.paymentReference,
    paymentProofImage: transactionData.paymentProofImage,
    expiresAt: transactionData.expiresAt,
    adminNotes: transactionData.adminNotes
  };
};

/**
 * Récupère une transaction par ID
 */
export const getTransactionById = async (id: number): Promise<Transaction> => {
  try {
    console.log(`🔍 Récupération transaction #${id}`);
    
    const response = await api.get(`/transactions/${id}`);
    const normalizedTransaction = normalizeTransaction(response.data);
    
    console.log(`✅ Transaction #${id} récupérée`);
    return normalizedTransaction;
    
  } catch (error: any) {
    console.error(`❌ Erreur getTransactionById ${id}:`, error);
    throw new Error(`Impossible de récupérer la transaction #${id}: ${error.message || 'Erreur inconnue'}`);
  }
};

/**
 * Crée une transaction
 */
export const createTransaction = async (ad: any, buyerId: number): Promise<Transaction> => {
  try {
    console.log('🔄 Création transaction...');
    
    if (typeof ad.user !== 'object') {
      throw new Error('Format d\'annonce invalide: user doit être un objet');
    }
    
    const sellerId = ad.user.id;
    
    const payload = {
      ad: `/api/ads/${ad.id}`,
      buyer: `/api/users/${buyerId}`,
      seller: `/api/users/${sellerId}`,
      usdtAmount: ad.amount,
      fiatAmount: ad.amount * ad.price,
      status: 'pending'
    };
    
    const response = await api.post('/transactions', payload);
    const normalizedTransaction = normalizeTransaction(response.data);
    
    console.log(`✅ Transaction #${normalizedTransaction.id} créée`);
    return normalizedTransaction;
    
  } catch (error: any) {
    console.error('❌ Erreur createTransaction:', error);
    
    if (error.response?.status === 400) {
      throw new Error('Données invalides pour la création de transaction');
    }
    
    if (error.response?.status === 409) {
      throw new Error('Transaction déjà existante pour cette annonce');
    }
    
    throw error;
  }
};

/**
 * Met à jour une transaction
 */
export const updateTransaction = async (id: number, data: Partial<Transaction>): Promise<Transaction> => {
  try {
    console.log(`✏️ Mise à jour transaction #${id}:`, data);
    
    const response = await tryPatchWithMultipleContentTypes(`/transactions/${id}`, data);
    const normalizedTransaction = normalizeTransaction(response.data);
    
    console.log(`✅ Transaction #${id} mise à jour`);
    return normalizedTransaction;
    
  } catch (error: any) {
    console.error(`❌ Erreur updateTransaction ${id}:`, {
      message: error.message,
      status: error.response?.status,
      data: error.response?.data
    });
    
    const errorMessage = getErrorMessage(error, 'mise à jour transaction');
    throw new Error(errorMessage);
  }
};

/**
 * Marque comme payée
 */
export const markAsPaid = async (id: number, paymentReference?: string): Promise<Transaction> => {
  try {
    console.log(`💰 Marquage transaction #${id} comme payée`);
    
    return await updateTransaction(id, {
      status: 'paid',
      paidAt: new Date().toISOString(),
      paymentReference
    });
    
  } catch (error: any) {
    console.error(`❌ Erreur markAsPaid ${id}:`, error);
    throw error;
  }
};

/**
 * Libère les fonds
 */
export const releaseFunds = async (id: number): Promise<Transaction> => {
  try {
    console.log(`✅ Libération fonds transaction #${id}`);
    
    return await updateTransaction(id, {
      status: 'released',
      releasedAt: new Date().toISOString()
    });
    
  } catch (error: any) {
    console.error(`❌ Erreur releaseFunds ${id}:`, error);
    throw error;
  }
};

/**
 * Annule une transaction
 */
export const cancelTransaction = async (id: number): Promise<Transaction> => {
  try {
    console.log(`❌ Annulation transaction #${id}`);
    
    return await updateTransaction(id, {
      status: 'cancelled'
    });
    
  } catch (error: any) {
    console.error(`❌ Erreur cancelTransaction ${id}:`, error);
    throw error;
  }
};

/**
 * Statistiques des transactions
 */
export const getTransactionStats = async (): Promise<TransactionStats> => {
  try {
    console.log('📈 Calcul statistiques transactions...');
    
    const response = await getTransactions({ itemsPerPage: 1000 });
    const transactions = response.transactions;
    
    return {
      total: transactions.length,
      pending: transactions.filter(t => t.status === 'pending').length,
      paid: transactions.filter(t => t.status === 'paid').length,
      released: transactions.filter(t => t.status === 'released').length,
      completed: transactions.filter(t => t.status === 'completed').length,
      cancelled: transactions.filter(t => t.status === 'cancelled').length,
      disputed: transactions.filter(t => t.status === 'disputed').length,
      totalUsdt: transactions.reduce((sum, t) => sum + t.usdtAmount, 0),
      totalFiat: transactions.reduce((sum, t) => sum + t.fiatAmount, 0)
    };
    
  } catch (error: any) {
    console.error('❌ Erreur getTransactionStats:', error);
    return {
      total: 0,
      pending: 0,
      paid: 0,
      released: 0,
      completed: 0,
      cancelled: 0,
      disputed: 0,
      totalUsdt: 0,
      totalFiat: 0
    };
  }
};

// ==================== FONCTIONS UTILITAIRES ====================

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
      return `Transaction non trouvée pour ${action}.`;
    case 409:
      return `Conflit lors de ${action}. La transaction a peut-être déjà été modifiée.`;
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

/**
 * Envoie un message dans une transaction
 */
export const sendMessage = async (transactionId: number, userId: number, message: string): Promise<void> => {
  try {
    console.log(`💬 Envoi message transaction #${transactionId}`);
    
    const payload = {
      transaction: `/api/transactions/${transactionId}`,
      sender: `/api/users/${userId}`,
      content: message,
      isSystem: false
    };
    
    await api.post('/messages', payload);
    console.log(`✅ Message envoyé transaction #${transactionId}`);
    
  } catch (error: any) {
    console.error(`❌ Erreur sendMessage ${transactionId}:`, error);
    console.warn('⚠️ Message non envoyé');
  }
};

// ==================== EXPORT PRINCIPAL ====================

const TransactionService = {
  getTransactions,
  getUserTransactions,
  getTransactionById,
  createTransaction,
  updateTransaction,
  markAsPaid,
  releaseFunds,
  cancelTransaction,
  getTransactionStats,
  sendMessage
};

export default TransactionService;