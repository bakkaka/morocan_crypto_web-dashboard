// src/api/TransactionService.ts - SERVICE UNIFIÉ POUR LES TRANSACTIONS
import api from './axiosConfig';

export interface TransactionData {
  ad: string;            // Format: "/ads/{id}"
  buyer: string;         // Format: "/users/{id}"
  seller: string;        // Format: "/users/{id}"
  usdtAmount: number;
  fiatAmount: number;
  status: 'pending' | 'completed' | 'cancelled' | 'disputed';
  paymentReference?: string;
  expiresAt?: string;
}

export interface MessageData {
  transaction: string;   // Format: "/transactions/{id}"
  sender: string;        // Format: "/users/{id}"
  message: string;
}

class TransactionService {
  /**
   * CRÉER UNE TRANSACTION
   * Fonctionne avec API Platform Symfony
   */
  static async createTransaction(ad: any, userId: number): Promise<any> {
    const totalAmount = ad.amount * ad.price;
    
    // ✅ FORMAT CORRECT POUR API PLATFORM
    const transactionData: TransactionData = {
      ad: `/ads/${ad.id}`,
      buyer: ad.type === 'sell' ? `/users/${userId}` : `/users/${ad.user.id}`,
      seller: ad.type === 'sell' ? `/users/${ad.user.id}` : `/users/${userId}`,
      usdtAmount: ad.amount,
      fiatAmount: totalAmount,
      status: 'pending',
      paymentReference: `TRX-${Date.now()}-${ad.id}`,
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString()
    };

    console.log('📤 Création transaction:', transactionData);

    try {
      const response = await api.post('/transactions', transactionData);
      console.log('✅ Transaction créée:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur création transaction:', error);
      
      // Fallback pour debugging
      if (error.response?.status === 404) {
        console.log('🔄 Tentative avec endpoint alternatif...');
        try {
          const response = await api.post('/api/transactions', transactionData);
          return response.data;
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  /**
   * ENVOYER UN MESSAGE
   * Fonctionne avec l'entité ChatMessage
   */
  static async sendMessage(transactionId: number, userId: number, message: string): Promise<any> {
    const messageData: MessageData = {
      transaction: `/transactions/${transactionId}`,
      sender: `/users/${userId}`,
      message: message.trim()
    };

    console.log('📤 Envoi message:', messageData);

    try {
      const response = await api.post('/chat_messages', messageData);
      console.log('✅ Message envoyé:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur envoi message:', error);
      
      // Fallback pour debugging
      if (error.response?.status === 404) {
        console.log('🔄 Tentative avec endpoint alternatif...');
        try {
          const response = await api.post('/api/chat_messages', messageData);
          return response.data;
        } catch (fallbackError) {
          throw fallbackError;
        }
      }
      
      throw error;
    }
  }

  /**
   * RÉCUPÉRER LES TRANSACTIONS D'UN UTILISATEUR
   */
  static async getUserTransactions(userId: number): Promise<any[]> {
    try {
      const response = await api.get('/transactions');
      
      let transactions: any[] = [];
      if (response.data['hydra:member']) {
        transactions = response.data['hydra:member'];
      } else if (Array.isArray(response.data)) {
        transactions = response.data;
      }

      // Filtrer par utilisateur
      return transactions.filter(tx => {
        const buyerId = typeof tx.buyer === 'object' ? tx.buyer.id : tx.buyer;
        const sellerId = typeof tx.seller === 'object' ? tx.seller.id : tx.seller;
        return buyerId === userId || sellerId === userId;
      });
      
    } catch (error) {
      console.error('❌ Erreur récupération transactions:', error);
      
      // Fallback
      try {
        const response = await api.get('/api/transactions');
        let transactions: any[] = [];
        if (response.data['hydra:member']) {
          transactions = response.data['hydra:member'];
        }
        
        return transactions.filter(tx => {
          const buyerId = typeof tx.buyer === 'object' ? tx.buyer.id : tx.buyer;
          const sellerId = typeof tx.seller === 'object' ? tx.seller.id : tx.seller;
          return buyerId === userId || sellerId === userId;
        });
      } catch (fallbackError) {
        console.error('❌ Fallback échoué:', fallbackError);
        return [];
      }
    }
  }

  /**
   * RÉCUPÉRER LES MESSAGES D'UNE TRANSACTION
   */
  static async getTransactionMessages(transactionId: number): Promise<any[]> {
    try {
      const response = await api.get('/chat_messages', {
        params: {
          'transaction.id': transactionId,
          'order[createdAt]': 'asc'
        }
      });
      
      if (response.data['hydra:member']) {
        return response.data['hydra:member'];
      } else if (Array.isArray(response.data)) {
        return response.data;
      }
      
      return [];
      
    } catch (error) {
      console.error(`❌ Erreur récupération messages transaction ${transactionId}:`, error);
      
      // Fallback
      try {
        const response = await api.get('/api/chat_messages', {
          params: {
            'transaction.id': transactionId
          }
        });
        
        if (response.data['hydra:member']) {
          return response.data['hydra:member'];
        }
        
        return [];
      } catch (fallbackError) {
        console.error('❌ Fallback échoué:', fallbackError);
        return [];
      }
    }
  }

  /**
   * METTRE À JOUR LE STATUT D'UNE TRANSACTION
   */
  static async updateTransactionStatus(transactionId: number, status: string): Promise<any> {
    try {
      const response = await api.put(`/transactions/${transactionId}`, { status });
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur mise à jour transaction ${transactionId}:`, error);
      throw error;
    }
  }

  /**
   * FORMATER UNE URL POUR API PLATFORM
   * Utilitaire pour créer les URLs correctes
   */
  static formatApiUrl(resource: string, id: number): string {
    // Ne pas ajouter /api - axios le fait déjà
    return `/${resource}/${id}`;
  }
}

export default TransactionService;