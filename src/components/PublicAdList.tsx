// src/components/PublicAdList.tsx - VERSION CORRIGÉE ET OPTIMISÉE
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

interface User {
  id: number;
  fullName: string;
  reputation: number;
  phone?: string;
  isVerified?: boolean;
}

interface Currency {
  code: string;
  name: string;
  type: 'crypto' | 'fiat';
}

interface Ad {
  id: number;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  currency: Currency;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  paymentMethod: string;
  user: User;
  createdAt: string;
  terms?: string;
  minAmountPerTransaction?: number;
  maxAmountPerTransaction?: number;
}

interface Notification {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  id: number;
}

// 🔧 SERVICE DE TRANSACTION SIMPLIFIÉ
class TransactionService {
  static async createTransaction(ad: Ad, userId: number) {
    const totalAmount = ad.amount * ad.price;
    
    // ✅ FORMAT CORRECT - Sans /api dans les URLs
    const transactionData = {
      ad: `/ads/${ad.id}`,
      buyer: ad.type === 'sell' ? `/users/${userId}` : `/users/${ad.user.id}`,
      seller: ad.type === 'sell' ? `/users/${ad.user.id}` : `/users/${userId}`,
      usdtAmount: ad.amount,
      fiatAmount: totalAmount,
      status: 'pending',
      paymentReference: `TRX-${Date.now()}-${ad.id}`,
      expiresAt: new Date(Date.now() + 30 * 60000).toISOString()
    };

    console.log('📦 Transaction payload:', transactionData);

    // Essayer SANS /api d'abord (axios ajoute déjà /api)
    const endpoints = ['/transactions', '/api/transactions'];
    
    for (const endpoint of endpoints) {
      try {
        console.log(`🔄 POST vers: ${endpoint}`);
        const response = await api.post(endpoint, transactionData);
        console.log(`✅ Transaction créée via ${endpoint}`);
        return response.data;
      } catch (err: any) {
        console.log(`❌ Échec avec ${endpoint}:`, err.response?.status);
        continue;
      }
    }
    
    throw new Error('Impossible de créer la transaction');
  }

  static async sendMessage(transactionId: number, userId: number, recipientId: number, ad: Ad) {
    const messageData = {
      transaction: `/transactions/${transactionId}`,
      sender: `/users/${userId}`,
      message: `Bonjour ! Je suis intéressé par votre annonce #${ad.id}.\n\n` +
              `Détails: ${ad.type === 'sell' ? 'Achat' : 'Vente'} de ${ad.amount} ${ad.currency.code}\n` +
              `Prix: ${ad.price} MAD/${ad.currency.code}\n` +
              `Total: ${ad.amount * ad.price} MAD`
    };

    const endpoints = ['/chat_messages', '/api/chat_messages'];
    
    for (const endpoint of endpoints) {
      try {
        await api.post(endpoint, messageData);
        console.log(`✅ Message envoyé via ${endpoint}`);
        return true;
      } catch (err: any) {
        console.log(`❌ Échec message ${endpoint}:`, err.response?.status);
        continue;
      }
    }
    
    throw new Error('Impossible d\'envoyer le message');
  }
}

const PublicAdList: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [processingTransaction, setProcessingTransaction] = useState<number | null>(null);
  
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // 🔔 SYSTEME DE NOTIFICATIONS
  const showNotification = useCallback((type: Notification['type'], message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { type, message, id }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // 📥 CHARGEMENT DES ANNONCES - SIMPLIFIÉ
  const loadAds = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('🌐 Chargement des annonces...');
      
      // ✅ ENDPOINT CORRECT - axios ajoute /api automatiquement
      const response = await api.get('/ads', {
        params: {
          page: 1,
          itemsPerPage: 100,
          'order[createdAt]': 'desc',
          status: 'active'
        }
      });

      let adsData: any[] = [];
      
      // Gestion des différents formats de réponse API Platform
      if (response.data['hydra:member']) {
        adsData = response.data['hydra:member'];
      } else if (Array.isArray(response.data)) {
        adsData = response.data;
      }
      
      console.log(`📊 ${adsData.length} annonces récupérées`);

      // Transformation simple des données
      const formattedAds: Ad[] = adsData.map((item: any) => ({
        id: item.id,
        type: item.type || 'buy',
        amount: parseFloat(item.amount) || 0,
        price: parseFloat(item.price) || 0,
        currency: {
          code: item.currency?.code || 'USDT',
          name: item.currency?.name || 'Tether USD',
          type: item.currency?.type || 'crypto'
        },
        status: item.status || 'active',
        paymentMethod: item.paymentMethod || item.payment_method || 'Non spécifié',
        user: {
          id: item.user?.id || 0,
          fullName: item.user?.fullName || item.user?.full_name || 'Utilisateur',
          reputation: item.user?.reputation || 5.0,
          phone: item.user?.phone,
          isVerified: item.user?.isVerified
        },
        createdAt: item.createdAt || item.created_at,
        terms: item.terms,
        minAmountPerTransaction: item.minAmountPerTransaction,
        maxAmountPerTransaction: item.maxAmountPerTransaction
      }));

      setAds(formattedAds);
      
    } catch (error: any) {
      console.error('❌ Erreur chargement annonces:', error);
      showNotification('error', 'Impossible de charger les annonces');
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  // 💰 CRÉATION DE TRANSACTION - OPTIMISÉE
  const handleCreateTransaction = async (ad: Ad) => {
    if (!isAuthenticated || !user) {
      showNotification('warning', 'Connectez-vous pour créer une transaction');
      navigate('/login', { state: { from: '/market' } });
      return;
    }

    if (ad.user.id === user.id) {
      showNotification('warning', 'Vous ne pouvez pas échanger avec votre propre annonce');
      return;
    }

    if (processingTransaction === ad.id) return;

    try {
      setProcessingTransaction(ad.id);
      showNotification('info', 'Création de la transaction en cours...');

      // ✅ UTILISATION DU SERVICE CORRIGÉ
      const transaction = await TransactionService.createTransaction(ad, user.id);
      
      showNotification('success', 'Transaction créée ! Redirection vers le chat...');

      // ✅ ENVOI DU MESSAGE INITIAL
      await TransactionService.sendMessage(transaction.id, user.id, ad.user.id, ad);

      // Redirection vers la messagerie
      setTimeout(() => {
        navigate('/dashboard/messages', {
          state: {
            transactionId: transaction.id,
            recipientId: ad.user.id,
            recipientName: ad.user.fullName
          }
        });
      }, 1500);

    } catch (error: any) {
      console.error('❌ Erreur création transaction:', error);
      
      let errorMsg = 'Erreur lors de la création de la transaction';
      if (error.response?.status === 400) errorMsg = 'Données invalides';
      if (error.response?.status === 401) errorMsg = 'Session expirée';
      if (error.response?.status === 404) errorMsg = 'Endpoint non trouvé';
      
      showNotification('error', errorMsg);
      
    } finally {
      setProcessingTransaction(null);
    }
  };

  // 📞 CONTACT WHATSAPP
  const handleWhatsAppContact = (ad: Ad) => {
    if (!ad.user?.phone) {
      showNotification('warning', 'Numéro de téléphone non disponible');
      return;
    }

    const phone = ad.user.phone.replace(/\D/g, '');
    const message = encodeURIComponent(
      `Bonjour ${ad.user.fullName},\n\n` +
      `Je suis intéressé par votre annonce #${ad.id} sur CryptoMaroc P2P.\n` +
      `Détails: ${ad.type === 'sell' ? 'Achat' : 'Vente'} de ${ad.amount} ${ad.currency.code}\n` +
      `Prix: ${ad.price} MAD/${ad.currency.code}\n` +
      `Total: ${ad.amount * ad.price} MAD\n\n` +
      `Pouvons-nous discuter de cette transaction ?`
    );
    
    window.open(`https://wa.me/${phone}?text=${message}`, '_blank');
  };

  // 🔍 FILTRAGE SIMPLE
  const filteredAds = ads.filter(ad => {
    const matchesSearch = !searchTerm || 
      ad.currency.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ad.user.fullName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || ad.type === typeFilter;
    
    return matchesSearch && matchesType;
  });

  // 📊 FONCTIONS D'AFFICHAGE
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('fr-MA', {
        day: '2-digit',
        month: 'short'
      });
    } catch {
      return '--/--';
    }
  };

  const calculateTotal = (ad: Ad) => ad.amount * ad.price;

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}></div>
          <h4>Chargement du marketplace...</h4>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Notifications */}
      <div className="position-fixed top-0 end-0 p-3" style={{zIndex: 1050}}>
        {notifications.map(notif => (
          <div key={notif.id} className={`toast show mb-2 bg-${notif.type} text-white`}>
            <div className="toast-body">
              <i className={`bi ${
                notif.type === 'success' ? 'bi-check-circle' :
                notif.type === 'error' ? 'bi-exclamation-triangle' :
                'bi-info-circle'
              } me-2`}></i>
              {notif.message}
            </div>
          </div>
        ))}
      </div>

      {/* En-tête */}
      <div className="mb-4">
        <h1 className="display-5 fw-bold">
          <i className="bi bi-shop me-2"></i>
          Marketplace P2P
        </h1>
        <p className="lead text-muted">
          Échangez des cryptomonnaies en MAD avec la communauté marocaine
        </p>
      </div>

      {/* Filtres */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-8">
              <input
                type="text"
                className="form-control"
                placeholder="Rechercher par crypto, méthode de paiement, vendeur..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="col-md-4">
              <select
                className="form-select"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <option value="all">Tous les types</option>
                <option value="buy">Achat</option>
                <option value="sell">Vente</option>
              </select>
            </div>
          </div>
          <div className="mt-3">
            <span className="badge bg-primary fs-6">
              {filteredAds.length} annonce{filteredAds.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Liste des annonces */}
      {filteredAds.length === 0 ? (
        <div className="text-center py-5">
          <div className="card shadow-sm">
            <div className="card-body py-5">
              <i className="bi bi-inbox fs-1 text-muted mb-3"></i>
              <h4>Aucune annonce trouvée</h4>
              <p className="text-muted">
                {searchTerm ? 'Ajustez vos critères de recherche' : 'Aucune annonce active pour le moment'}
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {filteredAds.map(ad => {
            const isUserAd = user && ad.user.id === user.id;
            const total = calculateTotal(ad);
            
            return (
              <div key={ad.id} className="col">
                <div className="card h-100 shadow-sm hover-shadow">
                  <div className="card-body">
                    {/* En-tête */}
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <span className={`badge ${ad.type === 'buy' ? 'bg-success' : 'bg-danger'}`}>
                          {ad.type === 'buy' ? 'ACHAT' : 'VENTE'}
                        </span>
                        <span className="badge bg-secondary ms-2">
                          {ad.status}
                        </span>
                      </div>
                      <div className="text-end">
                        <div className="h4 fw-bold text-primary">
                          {ad.price.toLocaleString('fr-MA')} MAD
                        </div>
                        <small className="text-muted">/{ad.currency.code}</small>
                      </div>
                    </div>

                    {/* Détails */}
                    <h5 className="card-title fw-bold">
                      {ad.type === 'buy' ? 'Achat de' : 'Vente de'} {ad.amount} {ad.currency.code}
                    </h5>
                    
                    <div className="mb-3">
                      <i className="bi bi-credit-card text-muted me-2"></i>
                      <span>{ad.paymentMethod}</span>
                    </div>

                    {ad.terms && (
                      <div className="mb-3">
                        <p className="text-muted small mb-0" style={{maxHeight: '3em', overflow: 'hidden'}}>
                          <i className="bi bi-chat-left-text me-1"></i>
                          {ad.terms}
                        </p>
                      </div>
                    )}

                    {/* Total */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center">
                        <span className="text-muted">Montant total</span>
                        <span className="h4 fw-bold">
                          {total.toLocaleString('fr-MA')} MAD
                        </span>
                      </div>
                    </div>

                    {/* Utilisateur */}
                    <div className="border-top pt-3">
                      <div className="d-flex justify-content-between align-items-center">
                        <div>
                          <div className="small text-muted">
                            {ad.type === 'buy' ? 'Acheteur' : 'Vendeur'}
                          </div>
                          <div className="fw-semibold">
                            {ad.user.fullName}
                            {ad.user.isVerified && (
                              <i className="bi bi-patch-check-fill text-success ms-1"></i>
                            )}
                          </div>
                          <div className="text-warning small">
                            <i className="bi bi-star-fill me-1"></i>
                            {ad.user.reputation?.toFixed(1) || '5.0'}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="small text-muted">ID</div>
                          <div className="fw-bold">#{ad.id}</div>
                        </div>
                      </div>
                    </div>

                    {/* Boutons d'action */}
                    <div className="mt-4">
                      {isUserAd ? (
                        <div className="alert alert-info mb-0 py-2">
                          <i className="bi bi-person me-2"></i>
                          Votre annonce
                        </div>
                      ) : isAuthenticated ? (
                        <>
                          {/* Bouton principal */}
                          <button
                            className={`btn w-100 mb-2 ${ad.type === 'sell' ? 'btn-success' : 'btn-warning'}`}
                            onClick={() => handleCreateTransaction(ad)}
                            disabled={processingTransaction === ad.id}
                          >
                            {processingTransaction === ad.id ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Création...
                              </>
                            ) : (
                              <>
                                <i className={`bi ${ad.type === 'sell' ? 'bi-cart-check' : 'bi-cash'} me-2`}></i>
                                {ad.type === 'sell' ? 'Acheter maintenant' : 'Vendre maintenant'}
                              </>
                            )}
                          </button>

                          {/* Boutons de contact */}
                          <div className="row g-2">
                            <div className="col">
                              <button
                                className="btn btn-outline-success w-100"
                                onClick={() => handleWhatsAppContact(ad)}
                                disabled={!ad.user.phone}
                              >
                                <i className="bi bi-whatsapp me-2"></i>
                                WhatsApp
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <button
                          className="btn btn-warning w-100"
                          onClick={() => navigate('/login', { state: { from: '/market' } })}
                        >
                          <i className="bi bi-shield-lock me-2"></i>
                          Connectez-vous pour échanger
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="card-footer bg-transparent text-muted small">
                    <i className="bi bi-calendar me-1"></i>
                    Publiée {formatDate(ad.createdAt)}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default PublicAdList;