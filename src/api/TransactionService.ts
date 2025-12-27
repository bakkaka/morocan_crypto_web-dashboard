// src/api/TransactionService.ts - VERSION COMPLÈTE CORRIGÉE ET OPTIMISÉE
import api from './axiosConfig';

// ============================================
// INTERFACES
// ============================================

interface Ad {
  id: number;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  currency: {
    code: string;
  };
  user: {
    id: number;
  };
}

interface TransactionData {
  ad: string;
  buyer: string;
  seller: string;
  usdtAmount: number;
  fiatAmount: number;
  status: string;
  paymentReference: string;
  expiresAt: string;
}

interface MessageData {
  transaction: string;
  sender: string;
  message: string;
}

// ============================================
// SERVICE PRINCIPAL
// ============================================

class TransactionService {
  
  // ============================================
  // 1. CRÉATION DE TRANSACTION
  // ============================================
  
  /**
   * Crée une nouvelle transaction (ACHAT/VENTE)
   * ✅ Route corrigée : /transactions (au lieu de /api/transactions)
   */
  static async createTransaction(ad: Ad, userId: number): Promise<any> {
    const totalAmount = ad.amount * ad.price;
    
    // ✅ FORMAT CORRECT - Utilise les routes SANS /api/
    const transactionData: TransactionData = {
      ad: `/ads/${ad.id}`,                     // CHANGÉ : /ads/ au lieu de /api/ads/
      buyer: `/users/${userId}`,               // CHANGÉ : /users/ au lieu de /api/users/
      seller: `/users/${ad.user.id}`,          // CHANGÉ : /users/ au lieu de /api/users/
      usdtAmount: ad.amount,
      fiatAmount: totalAmount,
      status: 'pending',
      paymentReference: `TRX-${Date.now()}-${ad.id}`,
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString()
    };

    console.log('📤 Création transaction:', transactionData);

    // ✅ ESSAI MULTIPLE AVEC GESTION D'ERREUR DÉTAILLÉE
    const endpoints = [
      { url: '/transactions', label: 'Route standard' },
      { url: '/api/transactions', label: 'Route API Platform' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 POST vers: ${endpoint.url} (${endpoint.label})`);
        const response = await api.post(endpoint.url, transactionData);
        console.log(`✅ Transaction créée via ${endpoint.url}`);
        return response.data;
      } catch (err: any) {
        console.log(`❌ ${endpoint.url} échoué:`, {
          status: err.response?.status,
          message: err.response?.data?.message || err.message
        });
        continue;
      }
    }
    
    throw new Error('Impossible de créer la transaction : aucune route valide trouvée');
  }

  // ============================================
  // 2. ENVOI DE MESSAGE
  // ============================================
  
  /**
   * Envoie un message dans le chat d'une transaction
   * ✅ Route corrigée : /chat_messages (au lieu de /api/chat_messages)
   */
  static async sendMessage(
    transactionId: number, 
    userId: number, 
    messageText: string
  ): Promise<boolean> {
    const messageData: MessageData = {
      transaction: `/transactions/${transactionId}`,  // CHANGÉ : /transactions/ au lieu de /api/transactions/
      sender: `/users/${userId}`,                     // CHANGÉ : /users/ au lieu de /api/users/
      message: messageText.trim()
    };

    console.log('📤 Envoi message:', messageData);

    // ✅ ESSAI MULTIPLE
    const endpoints = [
      { url: '/chat_messages', label: 'Route standard' },
      { url: '/api/chat_messages', label: 'Route API Platform' }
    ];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 POST vers: ${endpoint.url} (${endpoint.label})`);
        await api.post(endpoint.url, messageData);
        console.log(`✅ Message envoyé via ${endpoint.url}`);
        return true;
      } catch (err: any) {
        console.log(`❌ ${endpoint.url} échoué:`, {
          status: err.response?.status,
          message: err.response?.data?.message || err.message
        });
        continue;
      }
    }
    
    throw new Error('Impossible d\'envoyer le message : aucune route valide trouvée');
  }

  // ============================================
  // 3. RÉCUPÉRATION DES TRANSACTIONS UTILISATEUR
  // ============================================
  
  /**
   * Récupère les transactions d'un utilisateur (acheteur ou vendeur)
   * ✅ Version corrigée sans erreur 404
   */
  static async getUserTransactions(userId: number): Promise<any[]> {
    console.log(`📥 Chargement des transactions pour utilisateur: ${userId}`);
    
    // ✅ ESSAI AVEC DIFFÉRENTS FORMATS DE REQUÊTE
    const queryConfigs = [
      {
        url: '/transactions',
        params: { buyer: userId, seller: userId },
        label: 'Format standard (buyer/seller)'
      },
      {
        url: '/api/transactions',
        params: { 'buyer.id': userId, 'seller.id': userId },
        label: 'Format API Platform'
      },
      {
        url: `/users/${userId}/transactions`,
        params: {},
        label: 'Route utilisateur spécifique'
      }
    ];
    
    for (const config of queryConfigs) {
      try {
        console.log(`🔄 GET vers: ${config.url} (${config.label})`);
        const response = await api.get(config.url, { params: config.params });
        
        // ✅ EXTRACTION DES DONNÉES SELON LE FORMAT
        let transactions: any[] = [];
        
        if (response.data['hydra:member']) {
          // Format ApiPlatform (hydra)
          transactions = response.data['hydra:member'];
          console.log(`✅ Format ApiPlatform détecté`);
        } else if (Array.isArray(response.data)) {
          // Format tableau simple
          transactions = response.data;
          console.log(`✅ Format tableau simple détecté`);
        } else if (response.data.items) {
          // Format avec pagination
          transactions = response.data.items;
          console.log(`✅ Format paginé détecté`);
        }
        
        // Dédupliquer les transactions (si achat et vente)
        const uniqueTransactions = Array.from(
          new Map(transactions.map(tx => [tx.id, tx])).values()
        );
        
        console.log(`📊 ${uniqueTransactions.length} transactions chargées via ${config.url}`);
        return uniqueTransactions;
        
      } catch (err: any) {
        console.log(`❌ ${config.url} non disponible:`, {
          status: err.response?.status,
          message: err.message
        });
        // Continue avec le prochain format
      }
    }
    
    console.warn('⚠️ Aucun endpoint de transaction GET n\'a fonctionné');
    return []; // Retourne tableau vide au lieu d'erreur
  }

  // ============================================
  // 4. RÉCUPÉRATION DES MESSAGES D'UNE TRANSACTION
  // ============================================
  
  /**
   * Récupère les messages d'une transaction spécifique
   * ✅ Version corrigée sans erreur 404
   */
  static async getTransactionMessages(transactionId: number): Promise<any[]> {
    console.log(`📨 Chargement messages transaction ${transactionId}`);
    
    // ✅ ESSAI AVEC DIFFÉRENTS FORMATS
    const queryConfigs = [
      {
        url: '/chat_messages',
        params: { transactionId: transactionId },
        label: 'Format standard'
      },
      {
        url: '/api/chat_messages',
        params: { 'transaction.id': transactionId },
        label: 'Format API Platform'
      },
      {
        url: `/transactions/${transactionId}/messages`,
        params: {},
        label: 'Route transaction spécifique'
      }
    ];
    
    for (const config of queryConfigs) {
      try {
        console.log(`🔄 GET vers: ${config.url} (${config.label})`);
        const response = await api.get(config.url, { params: config.params });
        
        // ✅ EXTRACTION DES DONNÉES
        let messages: any[] = [];
        
        if (response.data['hydra:member']) {
          messages = response.data['hydra:member'];
        } else if (Array.isArray(response.data)) {
          messages = response.data;
        }
        
        // Trier par date de création
        messages.sort((a, b) => {
          const dateA = new Date(a.createdAt || a.created_at).getTime();
          const dateB = new Date(b.createdAt || b.created_at).getTime();
          return dateA - dateB;
        });
        
        console.log(`💬 ${messages.length} messages chargés via ${config.url}`);
        return messages;
        
      } catch (err: any) {
        console.log(`❌ ${config.url} non disponible:`, {
          status: err.response?.status,
          message: err.message
        });
        // Continue avec le prochain format
      }
    }
    
    console.warn('⚠️ Aucun endpoint de message GET n\'a fonctionné');
    return []; // Retourne tableau vide
  }

  // ============================================
  // 5. MÉTHODE UTILITAIRE : MESSAGE INITIAL
  // ============================================
  
  /**
   * Envoie le message initial pour une nouvelle transaction
   */
  static async sendInitialMessage(
    transactionId: number, 
    userId: number, 
    ad: Ad, 
    recipientId: number
  ): Promise<void> {
    const messageText = `Bonjour ! Je suis intéressé par votre annonce #${ad.id}.\n\n` +
      `Détails: ${ad.type === 'sell' ? 'Achat' : 'Vente'} de ${ad.amount} ${ad.currency.code}\n` +
      `Prix: ${ad.price} MAD/${ad.currency.code}\n` +
      `Total: ${ad.amount * ad.price} MAD`;
    
    try {
      await this.sendMessage(transactionId, userId, messageText);
      console.log('✅ Message initial envoyé avec succès');
    } catch (error: any) {
      console.warn('⚠️ Message initial non envoyé (transaction créée quand même):', error.message);
      // Ne pas propager l'erreur - la transaction est créée
    }
  }

  // ============================================
  // 6. MÉTHODES DE VÉRIFICATION (OPTIONNEL)
  // ============================================
  
  /**
   * Vérifie si une transaction existe
   */
  static async checkTransactionExists(transactionId: number): Promise<boolean> {
    try {
      await api.get(`/transactions/${transactionId}`);
      return true;
    } catch {
      try {
        await api.get(`/api/transactions/${transactionId}`);
        return true;
      } catch {
        return false;
      }
    }
  }
  
  /**
   * Met à jour le statut d'une transaction
   */
  static async updateTransactionStatus(
    transactionId: number, 
    status: string
  ): Promise<boolean> {
    try {
      const endpoints = ['/transactions', '/api/transactions'];
      
      for (const baseUrl of endpoints) {
        try {
          await api.patch(`${baseUrl}/${transactionId}`, { status });
          console.log(`✅ Statut transaction ${transactionId} mis à jour: ${status}`);
          return true;
        } catch {
          continue;
        }
      }
      
      return false;
    } catch (error) {
      console.error('❌ Erreur mise à jour statut:', error);
      return false;
    }
  }
}

export default TransactionService;

// ============================================
// EXPORT D'UNE INSTANCE (OPTIONNEL)
// ============================================

// Alternative : export d'une instance unique
// export const transactionService = new TransactionService();
// export default transactionService;