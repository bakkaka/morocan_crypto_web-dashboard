// src/components/PublicAdList.tsx - VERSION COMPLÈTEMENT CORRIGÉE
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';
import TransactionService from '../api/TransactionService';

// ============================================
// INTERFACES
// ============================================

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

// 🔴 CORRECTION : Aligner les statuts avec l'API
interface Ad {
  id: number;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  currency: Currency;
  status: 'published' | 'pending' | 'approved' | 'rejected' | 'paused' | 'completed' | 'cancelled'; // ✅ CORRIGÉ
  paymentMethod: string;
  user: User;
  createdAt: string;
  terms?: string;
  minAmountPerTransaction?: number;
  maxAmountPerTransaction?: number;
  timeLimitMinutes?: number;
}

interface Notification {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  id: number;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const PublicAdList: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [processingTransaction, setProcessingTransaction] = useState<number | null>(null);
  
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // 🔔 SYSTÈME DE NOTIFICATIONS
  const showNotification = useCallback((type: Notification['type'], message: string) => {
    const id = Date.now();
    setNotifications(prev => [...prev, { type, message, id }]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // 📥 CHARGEMENT DES ANNONCES - VERSION CORRIGÉE
  const loadAds = useCallback(async () => {
    try {
      setLoading(true);
      
      console.log('🌐 Chargement des annonces PUBLIÉES...');
      
      // Essayer avec /api/ads d'abord (ApiPlatform)
      let response;
      try {
        response = await api.get('/api/ads', {
          params: {
            page: 1,
            itemsPerPage: 100,
            'order[createdAt]': 'desc',
            status: 'published' // ✅ Filtre correct
          }
        });
        console.log('✅ API Platform format détecté');
      } catch (apiError: any) {
        // Si /api/ads échoue, essayer /ads (API REST standard)
        console.log('⚠️ /api/ads échoué, essai avec /ads');
        response = await api.get('/ads', {
          params: {
            page: 1,
            itemsPerPage: 100,
            orderBy: 'createdAt',
            orderDirection: 'desc',
            status: 'published' // ✅ Filtre correct
          }
        });
      }

      let adsData: any[] = [];
      
      // Gestion des différents formats de réponse
      if (response.data['hydra:member']) {
        adsData = response.data['hydra:member'];
      } else if (response.data.items) {
        adsData = response.data.items;
      } else if (Array.isArray(response.data)) {
        adsData = response.data;
      }
      
      console.log(`📊 ${adsData.length} annonces récupérées`);

      // 🔴 CORRECTION : Transformation CORRECTE
      const formattedAds: Ad[] = adsData
        .map((item: any) => {
          // 🔴 GESTION CORRECTE DES LIENS API PLATFORM
          let currencyObj: Currency = { 
            code: 'USDT', 
            name: 'Tether USD', 
            type: 'crypto' 
          };
          
          let userObj: User = {
            id: 0,
            fullName: 'Utilisateur',
            reputation: 5.0,
            isVerified: false
          };
          
          // 🔴 Gestion de currency (peut être un lien ou un objet)
          if (item.currency) {
            if (typeof item.currency === 'string' && item.currency.includes('/api/currencies/')) {
              // C'est un lien API Platform, extraire l'ID
              const currencyId = item.currency.split('/').pop();
              currencyObj = {
                code: currencyId === '1' ? 'USDT' : currencyId === '2' ? 'BTC' : 'CRYPTO',
                name: currencyId === '1' ? 'Tether USD' : currencyId === '2' ? 'Bitcoin' : 'Crypto',
                type: 'crypto'
              };
            } else if (typeof item.currency === 'object') {
              // C'est déjà un objet
              currencyObj = {
                code: item.currency.code || 'USDT',
                name: item.currency.name || 'Tether USD',
                type: item.currency.type || 'crypto'
              };
            }
          }
          
          // 🔴 Gestion de user (peut être un lien ou un objet)
          if (item.user) {
            if (typeof item.user === 'string' && item.user.includes('/api/users/')) {
              // C'est un lien API Platform, extraire l'ID
              const userId = parseInt(item.user.split('/').pop() || '0');
              userObj = {
                id: userId,
                fullName: 'Utilisateur',
                reputation: 5.0,
                isVerified: false
              };
            } else if (typeof item.user === 'object') {
              // C'est déjà un objet
              userObj = {
                id: item.user.id || 0,
                fullName: item.user.fullName || item.user.full_name || item.user.name || 'Utilisateur',
                reputation: parseFloat(item.user.reputation) || 5.0,
                phone: item.user.phone || item.user.phoneNumber,
                isVerified: item.user.isVerified || item.user.verified || false
              };
            }
          }
          
          // 🔴 CORRECTION CRITIQUE : Garder le statut 'published' tel quel
          const status = item.status || 'published';
          
          return {
            id: item.id || 0,
            type: (item.type || 'buy') as 'buy' | 'sell',
            amount: parseFloat(item.amount) || 0,
            price: parseFloat(item.price) || 0,
            currency: currencyObj,
            status: status as Ad['status'], // ✅ Garde 'published' correctement
            paymentMethod: item.paymentMethod || item.payment_method || item.paymentMethodName || 'Non spécifié',
            user: userObj,
            createdAt: item.createdAt || item.created_at || new Date().toISOString(),
            terms: item.terms || item.description,
            minAmountPerTransaction: item.minAmountPerTransaction || item.min_amount,
            maxAmountPerTransaction: item.maxAmountPerTransaction || item.max_amount,
            timeLimitMinutes: item.timeLimitMinutes || 60
          };
        })
        // 🔴 FILTRER UNIQUEMENT LES ANNONCES PUBLIÉES (double sécurité)
        .filter(ad => ad.status === 'published');

      // Filtrer les annonces invalides
      const validAds = formattedAds.filter(ad => 
        ad.id > 0 && 
        ad.user.id > 0 && 
        ad.amount > 0 && 
        ad.price > 0
      );

      setAds(validAds);
      
      console.log(`✅ ${validAds.length} annonces publiées valides chargées`);
      
      if (validAds.length !== formattedAds.length) {
        console.warn(`⚠️ ${formattedAds.length - validAds.length} annonces invalides filtrées`);
      }
      
    } catch (error: any) {
      console.error('❌ Erreur chargement annonces:', {
        message: error.message,
        status: error.response?.status,
        data: error.response?.data
      });
      
      showNotification('error', 'Impossible de charger les annonces');
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [showNotification]);

  // Effet de chargement
  useEffect(() => {
    loadAds();
    
    // Auto-refresh toutes les 2 minutes
    const interval = setInterval(() => {
      loadAds();
    }, 120000);
    
    return () => clearInterval(interval);
  }, [loadAds]);

  // 💰 CRÉATION DE TRANSACTION
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

      // ✅ CRÉATION DE LA TRANSACTION
      const transaction = await TransactionService.createTransaction(ad, user.id);
      
      showNotification('success', 'Transaction créée avec succès !');

      // ✅ ENVOI DU MESSAGE INITIAL
      try {
        const messageText = `Bonjour ! Je suis intéressé par votre annonce #${ad.id}.\n\n` +
          `Détails: ${ad.type === 'sell' ? 'Achat' : 'Vente'} de ${ad.amount} ${ad.currency.code}\n` +
          `Prix: ${ad.price} MAD/${ad.currency.code}\n` +
          `Total: ${ad.amount * ad.price} MAD`;
        
        await TransactionService.sendMessage(transaction.id, user.id, messageText);
        console.log('✅ Message initial envoyé');
      } catch (messageError: any) {
        console.warn('⚠️ Message initial non envoyé:', messageError.message || messageError);
        showNotification('info', 'Transaction créée, mais message initial non envoyé');
      }

      // Redirection vers la messagerie
      setTimeout(() => {
        navigate('/dashboard/messages', {
          state: {
            transactionId: transaction.id,
            recipientId: ad.user.id,
            recipientName: ad.user.fullName,
            autoSelect: true
          }
        });
      }, 1000);

    } catch (error: any) {
      console.error('❌ Erreur création transaction:', error);
      
      let errorMsg = 'Erreur lors de la création de la transaction';
      
      if (error.message?.includes('400')) {
        errorMsg = 'Données invalides pour la transaction';
      } else if (error.message?.includes('401')) {
        errorMsg = 'Session expirée, veuillez vous reconnecter';
        navigate('/login');
      } else if (error.message?.includes('404')) {
        errorMsg = 'Service temporairement indisponible';
      } else if (error.message?.includes('409')) {
        errorMsg = 'Transaction déjà en cours pour cette annonce';
      }
      
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
    
    let internationalPhone = phone;
    if (phone.startsWith('0')) {
      internationalPhone = '212' + phone.substring(1);
    } else if (!phone.startsWith('212')) {
      internationalPhone = '212' + phone;
    }

    const message = encodeURIComponent(
      `Bonjour ${ad.user.fullName},\n\n` +
      `Je suis intéressé par votre annonce #${ad.id} sur CryptoMaroc P2P.\n` +
      `• Type: ${ad.type === 'sell' ? 'Achat' : 'Vente'} de ${ad.amount} ${ad.currency.code}\n` +
      `• Prix: ${ad.price} MAD/${ad.currency.code}\n` +
      `• Total: ${(ad.amount * ad.price).toLocaleString('fr-MA')} MAD\n` +
      `• Méthode: ${ad.paymentMethod}\n\n` +
      `Pouvons-nous discuter de cette transaction ?`
    );
    
    const whatsappUrl = `https://wa.me/${internationalPhone}?text=${message}`;
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // 🔍 FILTRAGE ET RECHERCHE (optimisé avec useMemo)
  const filteredAds = useMemo(() => {
    return ads.filter(ad => {
      // Filtre par type
      if (typeFilter !== 'all' && ad.type !== typeFilter) {
        return false;
      }
      
      // Filtre par recherche
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          ad.currency.code.toLowerCase().includes(term) ||
          ad.currency.name.toLowerCase().includes(term) ||
          ad.paymentMethod.toLowerCase().includes(term) ||
          ad.user.fullName.toLowerCase().includes(term) ||
          (ad.terms && ad.terms.toLowerCase().includes(term))
        );
      }
      
      return true;
    });
  }, [ads, searchTerm, typeFilter]);

  // 📊 FONCTIONS D'AFFICHAGE (optimisées)
  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      
      if (diffMins < 1) return 'À l\'instant';
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffMins < 1440) return `Il y a ${Math.floor(diffMins / 60)} h`;
      
      return date.toLocaleDateString('fr-MA', {
        day: '2-digit',
        month: 'short',
        year: date.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
      });
    } catch {
      return '--/--';
    }
  }, []);

  const calculateTotal = useCallback((ad: Ad): number => {
    return ad.amount * ad.price;
  }, []);

  const getStatusColor = useCallback((status: string): string => {
    switch (status) {
      case 'published': return 'success';
      case 'pending': return 'warning';
      case 'approved': return 'info';
      case 'paused': return 'secondary';
      case 'completed': return 'primary';
      case 'cancelled': return 'danger';
      case 'rejected': return 'dark';
      default: return 'info';
    }
  }, []);

  const getStatusLabel = useCallback((status: string): string => {
    switch (status) {
      case 'published': return 'PUBLIÉ';
      case 'pending': return 'EN ATTENTE';
      case 'approved': return 'APPROUVÉ';
      case 'paused': return 'PAUSÉ';
      case 'completed': return 'TERMINÉ';
      case 'cancelled': return 'ANNULÉ';
      case 'rejected': return 'REJETÉ';
      default: return status.toUpperCase();
    }
  }, []);

  // 🎨 RENDU DU CHARGEMENT
  if (loading && ads.length === 0) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}}></div>
          <h4 className="text-dark mb-2">Chargement du marketplace...</h4>
          <p className="text-muted">Récupération des annonces publiées</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      {/* Notifications */}
      <div className="position-fixed top-0 end-0 p-3" style={{zIndex: 1050}}>
        {notifications.map(notif => (
          <div key={notif.id} className={`toast show mb-2 border-0 shadow ${notif.type === 'success' ? 'bg-success' : notif.type === 'error' ? 'bg-danger' : notif.type === 'warning' ? 'bg-warning' : 'bg-info'}`}>
            <div className="toast-body text-white d-flex align-items-center">
              <i className={`bi ${
                notif.type === 'success' ? 'bi-check-circle-fill' :
                notif.type === 'error' ? 'bi-exclamation-triangle-fill' :
                notif.type === 'warning' ? 'bi-exclamation-circle-fill' :
                'bi-info-circle-fill'
              } me-2 fs-5`}></i>
              <div className="flex-grow-1">{notif.message}</div>
              <button 
                type="button" 
                className="btn-close btn-close-white ms-2"
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notif.id))}
              ></button>
            </div>
          </div>
        ))}
      </div>

      {/* En-tête */}
      <div className="mb-4">
        <div className="d-flex justify-content-between align-items-start flex-wrap gap-3">
          <div>
            <h1 className="display-6 fw-bold text-dark">
              <i className="bi bi-shop me-2 text-primary"></i>
              Marketplace P2P
            </h1>
            <p className="lead text-muted mb-0">
              Échangez des cryptomonnaies en MAD avec la communauté marocaine
            </p>
          </div>
          <div className="d-flex align-items-center">
            <span className="badge bg-primary bg-opacity-10 text-primary fs-6 px-3 py-2">
              <i className="bi bi-coin me-1"></i>
              {ads.length} annonce{ads.length !== 1 ? 's' : ''} publiée{ads.length !== 1 ? 's' : ''}
            </span>
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body p-4">
          <div className="row g-3">
            <div className="col-md-7 col-lg-8">
              <div className="input-group">
                <span className="input-group-text bg-light border-end-0">
                  <i className="bi bi-search text-muted"></i>
                </span>
                <input
                  type="text"
                  className="form-control border-start-0"
                  placeholder="Rechercher par crypto, méthode de paiement, vendeur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>
            <div className="col-md-5 col-lg-4">
              <div className="d-flex gap-2">
                <select
                  className="form-select flex-grow-1"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                >
                  <option value="all">Tous les types</option>
                  <option value="buy">Achat seulement</option>
                  <option value="sell">Vente seulement</option>
                </select>
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => loadAds()}
                  disabled={loading}
                  title="Actualiser"
                >
                  <i className={`bi ${loading ? 'bi-arrow-clockwise spin' : 'bi-arrow-clockwise'}`}></i>
                </button>
              </div>
            </div>
          </div>
          
          {(searchTerm || typeFilter !== 'all') && (
            <div className="mt-3">
              <span className="badge bg-light text-dark fs-6">
                {filteredAds.length} résultat{filteredAds.length !== 1 ? 's' : ''} 
                {searchTerm && ` pour "${searchTerm}"`}
                {typeFilter !== 'all' && ` (${typeFilter === 'buy' ? 'achats' : 'ventes'})`}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Liste des annonces */}
      {filteredAds.length === 0 ? (
        <div className="text-center py-5">
          <div className="card shadow-sm border-0">
            <div className="card-body py-5">
              <div className="text-muted mb-4">
                <i className="bi bi-inbox display-1"></i>
              </div>
              <h4 className="text-dark mb-3">
                {searchTerm ? 'Aucune annonce trouvée' : 'Aucune annonce publiée disponible'}
              </h4>
              <p className="text-muted mb-4">
                {searchTerm 
                  ? 'Ajustez vos critères de recherche ou réessayez plus tard'
                  : 'Les annonces apparaissent ici une fois publiées par les administrateurs'}
              </p>
              {searchTerm && (
                <button 
                  className="btn btn-outline-primary"
                  onClick={() => setSearchTerm('')}
                >
                  <i className="bi bi-arrow-counterclockwise me-1"></i>
                  Réinitialiser la recherche
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="row row-cols-1 row-cols-md-2 row-cols-lg-3 g-4">
          {filteredAds.map(ad => {
            const isUserAd = user && ad.user.id === user.id;
            const total = calculateTotal(ad);
            const statusColor = getStatusColor(ad.status);
            const isProcessing = processingTransaction === ad.id;
            
            return (
              <div key={ad.id} className="col">
                <div className="card h-100 shadow-sm border-0 hover-lift transition-all">
                  <div className="card-body d-flex flex-column">
                    {/* En-tête */}
                    <div className="d-flex justify-content-between align-items-start mb-3">
                      <div>
                        <span className={`badge ${ad.type === 'buy' ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'} border ${ad.type === 'buy' ? 'border-success border-opacity-25' : 'border-danger border-opacity-25'} px-3 py-2`}>
                          <i className={`bi ${ad.type === 'buy' ? 'bi-arrow-down-circle' : 'bi-arrow-up-circle'} me-1`}></i>
                          {ad.type === 'buy' ? 'ACHAT' : 'VENTE'}
                        </span>
                        <span className={`badge bg-${statusColor} bg-opacity-10 text-${statusColor} border border-${statusColor} border-opacity-25 ms-2 px-3 py-2`}>
                          {getStatusLabel(ad.status)}
                        </span>
                      </div>
                      <div className="text-end">
                        <div className="h3 fw-bold text-primary mb-0">
                          {ad.price.toLocaleString('fr-MA')} MAD
                        </div>
                        <small className="text-muted">/{ad.currency.code}</small>
                      </div>
                    </div>

                    {/* Détails */}
                    <h5 className="card-title fw-bold text-dark mb-3">
                      {ad.type === 'buy' ? 'Achat de' : 'Vente de'} {ad.amount} {ad.currency.code}
                    </h5>
                    
                    <div className="mb-3">
                      <div className="d-flex align-items-center text-muted">
                        <i className="bi bi-credit-card me-2"></i>
                        <span className="fw-medium">{ad.paymentMethod}</span>
                      </div>
                    </div>

                    {ad.terms && (
                      <div className="mb-3">
                        <div className="bg-light rounded p-3">
                          <small className="text-muted d-block mb-1">
                            <i className="bi bi-chat-left-text me-1"></i>
                            Conditions
                          </small>
                          <p className="mb-0 small" style={{maxHeight: '4em', overflow: 'hidden'}}>
                            {ad.terms}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Total */}
                    <div className="mb-4">
                      <div className="d-flex justify-content-between align-items-center bg-primary bg-opacity-5 rounded p-3">
                        <div>
                          <span className="text-muted small d-block">Montant total</span>
                          <span className="h4 fw-bold text-dark">
                            {total.toLocaleString('fr-MA')} MAD
                          </span>
                        </div>
                        <div className="text-end">
                          <span className="badge bg-primary bg-opacity-25 text-primary">
                            <i className="bi bi-calculator me-1"></i>
                            {ad.amount} × {ad.price}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Utilisateur */}
                    <div className="border-top pt-3 mt-auto">
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="d-flex align-items-center">
                          <div className="rounded-circle bg-light d-flex align-items-center justify-content-center" style={{width: '40px', height: '40px'}}>
                            <i className="bi bi-person text-muted"></i>
                          </div>
                          <div className="ms-3">
                            <div className="small text-muted">
                              {ad.type === 'buy' ? 'Acheteur' : 'Vendeur'}
                            </div>
                            <div className="fw-semibold">
                              {ad.user.fullName}
                              {ad.user.isVerified && (
                                <i className="bi bi-patch-check-fill text-success ms-1" title="Vérifié"></i>
                              )}
                            </div>
                            <div className="text-warning small">
                              <i className="bi bi-star-fill me-1"></i>
                              {ad.user.reputation?.toFixed(1) || '5.0'}
                            </div>
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="small text-muted">ID Annonce</div>
                          <div className="fw-bold text-primary">#{ad.id}</div>
                        </div>
                      </div>
                    </div>

                    {/* Boutons d'action */}
                    <div className="mt-4 pt-3 border-top">
                      {isUserAd ? (
                        <div className="alert alert-info mb-0 py-2 d-flex align-items-center">
                          <i className="bi bi-person-check me-2"></i>
                          <span>Votre annonce</span>
                        </div>
                      ) : isAuthenticated ? (
                        <>
                          <button
                            className={`btn w-100 mb-2 ${ad.type === 'sell' ? 'btn-success' : 'btn-warning'} ${isProcessing ? 'disabled' : ''}`}
                            onClick={() => handleCreateTransaction(ad)}
                            disabled={isProcessing}
                          >
                            {isProcessing ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Création en cours...
                              </>
                            ) : (
                              <>
                                <i className={`bi ${ad.type === 'sell' ? 'bi-cart-check' : 'bi-cash'} me-2`}></i>
                                {ad.type === 'sell' ? 'Acheter maintenant' : 'Vendre maintenant'}
                              </>
                            )}
                          </button>

                          <div className="row g-2">
                            <div className="col">
                              <button
                                className="btn btn-outline-success w-100 d-flex align-items-center justify-content-center"
                                onClick={() => handleWhatsAppContact(ad)}
                                disabled={!ad.user.phone}
                                title={ad.user.phone ? `Contacter via WhatsApp` : 'Numéro non disponible'}
                              >
                                <i className="bi bi-whatsapp me-2"></i>
                                WhatsApp
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <button
                          className="btn btn-warning w-100 d-flex align-items-center justify-content-center"
                          onClick={() => navigate('/login', { state: { from: '/market' } })}
                        >
                          <i className="bi bi-shield-lock me-2"></i>
                          Connectez-vous pour échanger
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="card-footer bg-transparent border-top text-muted small d-flex justify-content-between align-items-center py-2">
                    <div>
                      <i className="bi bi-calendar me-1"></i>
                      {formatDate(ad.createdAt)}
                    </div>
                    {ad.minAmountPerTransaction && (
                      <div className="text-end">
                        <small title="Limites de transaction">
                          <i className="bi bi-arrows-collapse me-1"></i>
                          {ad.minAmountPerTransaction.toLocaleString('fr-MA')} - {ad.maxAmountPerTransaction?.toLocaleString('fr-MA') || '∞'} {ad.currency.code}
                        </small>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Styles CSS */}
      <style>
        {`
          .hover-lift {
            transition: transform 0.2s ease, box-shadow 0.2s ease;
          }
          .hover-lift:hover {
            transform: translateY(-4px);
            box-shadow: 0 .5rem 1.5rem rgba(0,0,0,.15) !important;
          }
          .spin {
            animation: spin 1s linear infinite;
          }
          @keyframes spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
          .toast {
            min-width: 300px;
            max-width: 400px;
          }
        `}
      </style>
    </div>
  );
};

export default PublicAdList;