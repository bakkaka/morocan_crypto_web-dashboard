// TRANSACTION SERVICE - selon votre pattern AdService
import api from './axiosConfig';

export interface Transaction {
  id: number;
  '@id'?: string;
  ad: any;
  buyer: any;
  seller: any;
  usdtAmount: number;
  fiatAmount: number;
  status: 'pending' | 'paid' | 'released' | 'cancelled' | 'completed' | 'disputed';
  createdAt: string;
  paidAt?: string;
  releasedAt?: string;
  paymentReference?: string;
  paymentProofImage?: string;
  expiresAt?: string;
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

/**
 * Récupère toutes les transactions (pour admin)
 */
export const getTransactions = async (filters?: TransactionFilters): Promise<{ transactions: Transaction[]; total: number }> => {
  try {
    console.log('📊 Chargement transactions avec filtres:', filters);
    
    const params = {
      page: 1,
      itemsPerPage: 100,
      'order[createdAt]': 'desc',
      ...filters
    };
    
    const response = await api.get('/transactions', { params });
    
    let transactionsData: any[] = [];
    const data = response.data;
    
    if (data['hydra:member']) {
      transactionsData = data['hydra:member'];
    } else if (Array.isArray(data)) {
      transactionsData = data;
    } else if (data.transactions && Array.isArray(data.transactions)) {
      transactionsData = data.transactions;
    } else if (data.items && Array.isArray(data.items)) {
      transactionsData = data.items;
    }
    
    const normalizedTransactions = transactionsData.map(normalizeTransaction);
    
    console.log(`✅ ${normalizedTransactions.length} transactions chargées`);
    
    return {
      transactions: normalizedTransactions,
      total: data['hydra:totalItems'] || data.total || normalizedTransactions.length
    };
    
  } catch (error: any) {
    console.error('❌ Erreur getTransactions:', error);
    throw new Error(`Impossible de charger les transactions: ${error.message || 'Erreur réseau'}`);
  }
};

/**
 * Récupère les transactions d'un utilisateur
 */
export const getUserTransactions = async (userId: number): Promise<Transaction[]> => {
  try {
    console.log(`👤 Chargement transactions utilisateur #${userId}`);
    
    const response = await getTransactions({ buyer: userId });
    return response.transactions;
    
  } catch (error: any) {
    console.error(`❌ Erreur getUserTransactions ${userId}:`, error);
    throw error;
  }
};

/**
 * Récupère une transaction par ID
 */
export const getTransactionById = async (id: number): Promise<Transaction> => {
  try {
    console.log(`🔍 Chargement transaction #${id}`);
    
    const response = await api.get(`/transactions/${id}`);
    return normalizeTransaction(response.data);
    
  } catch (error: any) {
    console.error(`❌ Erreur getTransactionById ${id}:`, error);
    throw new Error(`Transaction #${id} non trouvée: ${error.message || 'Erreur réseau'}`);
  }
};

/**
 * Crée une transaction
 */
export const createTransaction = async (ad: any, buyerId: number): Promise<Transaction> => {
  try {
    console.log('🔄 Création transaction...');
    
    const payload = {
      ad: `/api/ads/${ad.id}`,
      buyer: `/api/users/${buyerId}`,
      seller: `/api/users/${ad.user.id}`,
      usdtAmount: ad.amount,
      fiatAmount: ad.amount * ad.price,
      status: 'pending'
    };
    
    const response = await api.post('/transactions', payload);
    return normalizeTransaction(response.data);
    
  } catch (error: any) {
    console.error('❌ Erreur createTransaction:', error);
    throw new Error(`Impossible de créer la transaction: ${error.message || 'Erreur réseau'}`);
  }
};

/**
 * Met à jour une transaction
 */
export const updateTransaction = async (id: number, data: Partial<Transaction>): Promise<Transaction> => {
  try {
    console.log(`✏️ Mise à jour transaction #${id}:`, data);
    
    const response = await api.patch(`/transactions/${id}`, data, {
      headers: { 'Content-Type': 'application/merge-patch+json' }
    });
    
    return normalizeTransaction(response.data);
    
  } catch (error: any) {
    console.error(`❌ Erreur updateTransaction ${id}:`, error);
    
    // Essayer avec JSON simple
    try {
      const response = await api.patch(`/transactions/${id}`, data, {
        headers: { 'Content-Type': 'application/json' }
      });
      return normalizeTransaction(response.data);
    } catch {
      throw new Error(`Impossible de mettre à jour la transaction: ${error.message || 'Erreur réseau'}`);
    }
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

/**
 * Normalise une transaction
 */
const normalizeTransaction = (data: any): Transaction => {
  return {
    id: data.id || 0,
    '@id': data['@id'],
    ad: data.ad,
    buyer: data.buyer,
    seller: data.seller,
    usdtAmount: parseFloat(data.usdtAmount) || 0,
    fiatAmount: parseFloat(data.fiatAmount) || 0,
    status: (data.status || 'pending') as Transaction['status'],
    createdAt: data.createdAt || new Date().toISOString(),
    paidAt: data.paidAt,
    releasedAt: data.releasedAt,
    paymentReference: data.paymentReference,
    paymentProofImage: data.paymentProofImage,
    expiresAt: data.expiresAt
  };
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
    
  } catch (error: any) {
    console.error(`❌ Erreur sendMessage ${transactionId}:`, error);
    // Ne pas bloquer si le message échoue
  }
};

/**
 * Export par défaut (comme AdService)
 */
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