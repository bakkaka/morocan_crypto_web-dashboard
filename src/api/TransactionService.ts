// src/api/TransactionService.ts - VERSION COMPLÈTE AVEC TOUTES LES MÉTHODES
import api from './axiosConfig';

export interface TransactionData {
  ad: string;            // Format: "/api/ads/{id}"
  buyer: string;         // Format: "/api/users/{id}"
  seller: string;        // Format: "/api/users/{id}"
  usdtAmount: number;
  fiatAmount: number;
  status: 'pending' | 'completed' | 'cancelled' | 'disputed';
  paymentReference?: string;
  expiresAt?: string;
}

export interface MessageData {
  transaction: string;   // Format: "/api/transactions/{id}"
  sender: string;        // Format: "/api/users/{id}"
  message: string;
}

class TransactionService {
  /**
   * CRÉER UNE TRANSACTION - FORMAT API PLATFORM
   */
  static async createTransaction(ad: any, userId: number): Promise<any> {
    const totalAmount = ad.amount * ad.price;
    
    const transactionData: TransactionData = {
      ad: `/api/ads/${ad.id}`,
      buyer: ad.type === 'sell' ? `/api/users/${userId}` : `/api/users/${ad.user.id}`,
      seller: ad.type === 'sell' ? `/api/users/${ad.user.id}` : `/api/users/${userId}`,
      usdtAmount: ad.amount,
      fiatAmount: totalAmount,
      status: 'pending',
      paymentReference: `TRX-${Date.now()}-${ad.id}`,
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString()
    };

    console.log('📤 Création transaction:', transactionData);

    try {
      const response = await api.post('/api/transactions', transactionData);
      console.log('✅ Transaction créée:', response.data);
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur création transaction:', error);
      
      // Fallback sans /api
      if (error.response?.status === 400 || error.response?.status === 404) {
        console.log('🔄 Tentative avec format alternatif...');
        try {
          const altData = {
            ...transactionData,
            ad: `api/ads/${ad.id}`,
            buyer: `api/users/${ad.type === 'sell' ? userId : ad.user.id}`,
            seller: `api/users/${ad.type === 'sell' ? ad.user.id : userId}`
          };
          
          const response = await api.post('/transactions', altData);
          return response.data;
        } catch (fallbackError) {
          console.error('❌ Fallback échoué:', fallbackError);
        }
      }
      
      throw error;
    }
  }

  /**
   * ENVOYER UN MESSAGE
   */
  static async sendMessage(transactionId: number, userId: number, message: string): Promise<any> {
    const messageData: MessageData = {
      transaction: `/api/transactions/${transactionId}`,
      sender: `/api/users/${userId}`,
      message: message.trim()
    };

    console.log('📤 Envoi message:', messageData);

    try {
      const response = await api.post('/api/chat_messages', messageData);
      console.log('✅ Message envoyé');
      return response.data;
    } catch (error: any) {
      console.error('❌ Erreur envoi message:', error);
      
      // Fallback
      if (error.response?.status === 400 || error.response?.status === 404) {
        try {
          const fallbackData = {
            transaction: `api/transactions/${transactionId}`,
            sender: `api/users/${userId}`,
            message: message.trim()
          };
          
          const response = await api.post('/chat_messages', fallbackData);
          return response.data;
        } catch (fallbackError) {
          console.error('❌ Fallback échoué:', fallbackError);
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
      const response = await api.get('/api/transactions');
      
      let transactions: any[] = [];
      if (response.data['hydra:member']) {
        transactions = response.data['hydra:member'];
      } else if (Array.isArray(response.data)) {
        transactions = response.data;
      }

      // Filtrer par utilisateur
      return transactions.filter(tx => {
        const extractUserId = (userField: any): number | null => {
          if (!userField) return null;
          
          if (typeof userField === 'object') {
            return userField.id;
          }
          
          if (typeof userField === 'string') {
            const match = userField.match(/\/(\d+)$/);
            return match ? parseInt(match[1]) : null;
          }
          
          return null;
        };
        
        const buyerId = extractUserId(tx.buyer);
        const sellerId = extractUserId(tx.seller);
        
        return (buyerId === userId) || (sellerId === userId);
      });
      
    } catch (error) {
      console.error('❌ Erreur récupération transactions:', error);
      
      // Fallback sans /api
      try {
        const response = await api.get('/transactions');
        let transactions: any[] = [];
        
        if (response.data['hydra:member']) {
          transactions = response.data['hydra:member'];
        } else if (Array.isArray(response.data)) {
          transactions = response.data;
        }
        
        return transactions.filter(tx => {
          const extractUserId = (userField: any): number | null => {
            if (!userField) return null;
            
            if (typeof userField === 'object') {
              return userField.id;
            }
            
            if (typeof userField === 'string') {
              const match = userField.match(/\/(\d+)$/);
              return match ? parseInt(match[1]) : null;
            }
            
            return null;
          };
          
          const buyerId = extractUserId(tx.buyer);
          const sellerId = extractUserId(tx.seller);
          
          return (buyerId === userId) || (sellerId === userId);
        });
      } catch (fallbackError) {
        console.error('❌ Fallback échoué:', fallbackError);
        return [];
      }
    }
  }

  /**
   * RÉCUPÉRER LES MESSAGES D'UNE TRANSACTION - MÉTHODE MANQUANTE
   */
  static async getTransactionMessages(transactionId: number): Promise<any[]> {
    try {
      console.log(`📨 Chargement messages transaction ${transactionId}`);
      
      const response = await api.get('/api/chat_messages', {
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
      console.error(`❌ Erreur récupération messages:`, error);
      
      // Fallback sans /api
      try {
        const response = await api.get('/chat_messages', {
          params: {
            transaction: transactionId
          }
        });
        
        if (response.data['hydra:member']) {
          return response.data['hydra:member'];
        } else if (Array.isArray(response.data)) {
          return response.data;
        }
        
        return [];
      } catch (fallbackError) {
        console.error('❌ Fallback échoué:', fallbackError);
        return [];
      }
    }
  }

  /**
   * GÉNÉRER UN LIEN WHATSAPP
   */
  static generateWhatsAppLink(phoneNumber: string, ad: any, user: any): string {
    if (!phoneNumber) return '#';
    
    // Nettoyer le numéro
    let cleanNumber = phoneNumber.replace(/\D/g, '');
    
    // Formater pour WhatsApp Maroc
    if (cleanNumber.startsWith('0')) {
      cleanNumber = '212' + cleanNumber.substring(1);
    } else if (!cleanNumber.startsWith('212')) {
      cleanNumber = '212' + cleanNumber;
    }
    
    // Vérifier la longueur
    if (cleanNumber.length !== 12) return '#';
    
    const message = `Bonjour ${ad.user.fullName},\n\n` +
                   `Je suis intéressé par votre annonce #${ad.id} sur CryptoMaroc P2P.\n` +
                   `- ${ad.type === 'sell' ? 'Achat' : 'Vente'} de ${ad.amount} ${ad.currency.code}\n` +
                   `- Prix: ${ad.price} MAD/${ad.currency.code}\n` +
                   `- Total: ${ad.amount * ad.price} MAD\n` +
                   `- Méthode: ${ad.paymentMethod}\n\n` +
                   `Pouvons-nous discuter de cette transaction ?`;
    
    const encodedMessage = encodeURIComponent(message);
    return `https://wa.me/${cleanNumber}?text=${encodedMessage}`;
  }

  /**
   * METTRE À JOUR LE STATUT D'UNE TRANSACTION
   */
  static async updateTransactionStatus(transactionId: number, status: string): Promise<any> {
    try {
      const response = await api.put(`/api/transactions/${transactionId}`, { status });
      return response.data;
    } catch (error) {
      console.error(`❌ Erreur mise à jour transaction:`, error);
      
      // Fallback
      try {
        const response = await api.put(`/transactions/${transactionId}`, { status });
        return response.data;
      } catch (fallbackError) {
        console.error('❌ Fallback échoué:', fallbackError);
        throw error;
      }
    }
  }
}

export default TransactionService;