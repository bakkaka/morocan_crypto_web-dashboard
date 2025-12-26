// src/components/PublicAdList.tsx - VERSION FINALE COMPLÈTE
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

// ============================================
// INTERFACES
// ============================================

interface User {
  id: number;
  fullName: string;
  username?: string;
  reputation: number;
  email?: string;
  isActive?: boolean;
  phone?: string;
  isVerified?: boolean;
}

interface Currency {
  id: number;
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
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'pending';
  paymentMethod: string;
  user: User;
  createdAt: string;
  updatedAt?: string;
  timeLimitMinutes?: number;
  terms?: string;
  minAmountPerTransaction?: number;
  maxAmountPerTransaction?: number;
  '@id'?: string;
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
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('active');
  const [sortBy, setSortBy] = useState<'price' | 'amount' | 'created' | 'reputation'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [creatingTransaction, setCreatingTransaction] = useState<number | null>(null);
  const [activeTransactions, setActiveTransactions] = useState<Set<number>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [modifyingAd, setModifyingAd] = useState<number | null>(null);
  const { isAuthenticated, user, isAdmin } = useAuth();
  const navigate = useNavigate();

  // ============================================
  // FONCTIONS UTILITAIRES
  // ============================================

  const showNotification = useCallback((type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now();
    const notification: Notification = { type, message, id };
    setNotifications(prev => [...prev, notification]);
    
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) return 'À l\'instant';
      if (diffMins < 60) return `Il y a ${diffMins} min`;
      if (diffHours < 24) return `Il y a ${diffHours} h`;
      if (diffDays === 1) return 'Hier';
      if (diffDays < 7) return `Il y a ${diffDays} j`;
      
      return date.toLocaleDateString('fr-MA', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date inconnue';
    }
  };

  const calculateTotal = (ad: Ad): number => ad.amount * ad.price;

  const formatPrice = (price: number): string => {
    return price.toLocaleString('fr-MA', {
      minimumFractionDigits: price < 1 ? 4 : 2,
      maximumFractionDigits: price < 1 ? 4 : 2
    });
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active': return { class: 'bg-success', text: 'Actif', icon: 'bi-check-circle-fill' };
      case 'paused': return { class: 'bg-warning text-dark', text: 'En pause', icon: 'bi-pause-circle-fill' };
      case 'pending': return { class: 'bg-info', text: 'En attente', icon: 'bi-clock-fill' };
      case 'completed': return { class: 'bg-secondary', text: 'Terminé', icon: 'bi-check-all' };
      case 'cancelled': return { class: 'bg-danger', text: 'Annulé', icon: 'bi-x-circle-fill' };
      default: return { class: 'bg-secondary', text: 'Inconnu', icon: 'bi-question-circle-fill' };
    }
  };

  // ============================================
  // FONCTIONS WHATSAPP ET MESSAGERIE
  // ============================================

  const handleWhatsAppContact = (ad: Ad) => {
    if (!ad.user?.phone) {
      showNotification('warning', 'Numéro de téléphone non disponible');
      return;
    }
    
    let phone = ad.user.phone.replace(/\s+/g, '').replace('+', '');
    
    if (phone.startsWith('0')) {
      phone = '212' + phone.substring(1);
    } else if (!phone.startsWith('212')) {
      phone = '212' + phone;
    }
    
    const message = encodeURIComponent(
      `Bonjour ${ad.user.fullName},\n\n` +
      `Je suis intéressé par votre annonce sur CryptoMaroc P2P :\n` +
      `- ${ad.type === 'buy' ? 'Achat' : 'Vente'} de ${ad.amount} ${ad.currency.code}\n` +
      `- Prix : ${ad.price} MAD/${ad.currency.code}\n` +
      `- Total : ${calculateTotal(ad)} MAD\n` +
      `- Méthode : ${ad.paymentMethod}\n\n` +
      `Pouvons-nous discuter de cette transaction ?`
    );
    
    const whatsappUrl = `https://wa.me/${phone}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const handlePrivateMessage = async (ad: Ad) => {
    if (!isAuthenticated || !user) {
      showNotification('warning', 'Connectez-vous pour envoyer un message !');
      navigate('/login', { state: { from: '/market' } });
      return;
    }

    // Créer d'abord une transaction
    try {
      const transactionData = {
        ad: ad['@id'] || `/api/ads/${ad.id}`,
        buyer: ad.type === 'sell' ? `/api/users/${user.id}` : `/api/users/${ad.user.id}`,
        seller: ad.type === 'sell' ? `/api/users/${ad.user.id}` : `/api/users/${user.id}`,
        usdtAmount: ad.amount,
        fiatAmount: calculateTotal(ad),
        status: 'pending',
        paymentReference: `CHAT-${Date.now()}`
      };

      showNotification('info', 'Création de la transaction...');
      
      const transactionResponse = await api.post('/api/transactions', transactionData);
      const transaction = transactionResponse.data;
      
      // Maintenant créer un message dans la base de données
      const messageData = {
        transaction: `/api/transactions/${transaction.id}`,
        sender: `/api/users/${user.id}`,
        message: `Bonjour ${ad.user.fullName}, je suis intéressé par votre annonce #${ad.id}`
      };
      
      await api.post('/api/chat_messages', messageData);
      
      // Rediriger vers la page de messages avec la transaction créée
      navigate('/dashboard/messages', { 
        state: { 
          transactionId: transaction.id,
          recipientId: ad.user.id,
          recipientName: ad.user.fullName,
          adId: ad.id,
          autoFocus: true
        }
      });
      
      showNotification('success', 'Conversation créée ! Vous pouvez maintenant discuter avec le vendeur.');
      
    } catch (err: any) {
      console.error('❌ Erreur création conversation:', err);
      showNotification('error', 'Erreur lors de la création de la conversation');
    }
  };

  // ============================================
  // CHARGEMENT DES ANNONCES
  // ============================================

  const loadAds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🌐 Chargement des annonces...');
      
      const endpoints = [
        '/api/ads',
        '/ads',
        '/api/public/ads',
        '/public/ads'
      ];

      const params: any = {
        page: 1,
        itemsPerPage: 100,
        'order[createdAt]': 'desc',
        'exists[user]': true
      };

      if (!isAdmin) {
        params.status = 'active';
      } else if (statusFilter !== 'all') {
        params.status = statusFilter;
      }

      let response = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔍 Test endpoint: ${endpoint}`);
          response = await api.get(endpoint, { params });
          console.log(`✅ Succès avec ${endpoint}`);
          break;
        } catch (err: any) {
          console.log(`❌ ${endpoint}: ${err.response?.status || 'Error'}`);
          continue;
        }
      }

      if (!response) {
        throw new Error('Impossible de charger les annonces');
      }

      const responseData = response.data;
      let adsData: any[] = [];
      
      if (responseData['hydra:member']) {
        adsData = responseData['hydra:member'];
      } else if (Array.isArray(responseData)) {
        adsData = responseData;
      } else if (responseData.data && Array.isArray(responseData.data)) {
        adsData = responseData.data;
      }
      
      console.log(`📊 ${adsData.length} annonces récupérées`);

      // TRANSFORMATION DES DONNÉES
      const formattedAds: Ad[] = adsData.map((ad: any) => {
        // Utilisateur
        let userData: User = { 
          id: 0, 
          fullName: 'Anonyme', 
          reputation: 5.0 
        };
        
        if (ad.user) {
          if (typeof ad.user === 'object') {
            userData = {
              id: ad.user.id || 0,
              fullName: ad.user.fullName || ad.user.full_name || ad.user.username || 'Utilisateur',
              username: ad.user.username,
              reputation: ad.user.reputation || 5.0,
              email: ad.user.email,
              phone: ad.user.phone,
              isVerified: ad.user.isVerified || false,
              isActive: ad.user.isActive !== false
            };
          }
        }
        
        // Devise
        let currencyData: Currency = { 
          id: 0, 
          code: 'USDT', 
          name: 'Tether USD', 
          type: 'crypto' 
        };
        
        if (ad.currency) {
          if (typeof ad.currency === 'object') {
            currencyData = {
              id: ad.currency.id || 0,
              code: ad.currency.code || 'USDT',
              name: ad.currency.name || 'Tether USD',
              type: ad.currency.type || 'crypto'
            };
          } else if (typeof ad.currency === 'string') {
            currencyData.code = ad.currency;
            currencyData.name = ad.currency;
          }
        }
        
        return {
          id: ad.id || 0,
          '@id': ad['@id'] || `/api/ads/${ad.id}`,
          type: ad.type || 'buy',
          amount: parseFloat(ad.amount) || 0,
          price: parseFloat(ad.price) || 0,
          currency: currencyData,
          status: ad.status || 'active',
          paymentMethod: ad.paymentMethod || ad.payment_method || 'Non spécifié',
          user: userData,
          createdAt: ad.createdAt || ad.created_at || new Date().toISOString(),
          updatedAt: ad.updatedAt || ad.updated_at,
          timeLimitMinutes: ad.timeLimitMinutes || ad.time_limit_minutes,
          terms: ad.terms,
          minAmountPerTransaction: ad.minAmountPerTransaction || ad.min_amount_per_transaction,
          maxAmountPerTransaction: ad.maxAmountPerTransaction || ad.max_amount_per_transaction
        };
      }).filter(ad => ad.id > 0); // Filtrer les annonces valides

      console.log(`✅ ${formattedAds.length} annonces formatées`);
      setAds(formattedAds);

    } catch (err: any) {
      console.error('❌ Erreur chargement annonces:', err);
      
      let errorMsg = 'Impossible de charger les annonces';
      if (err.response?.status === 404) {
        errorMsg = 'Aucune annonce disponible pour le moment.';
        setAds([]);
        setError(null);
      }
      
      setError(errorMsg);
      setAds([]);
      showNotification('error', errorMsg);
      
    } finally {
      setLoading(false);
    }
  }, [isAdmin, statusFilter, showNotification]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  // ============================================
  // CRÉATION DE TRANSACTION + MESSAGE
  // ============================================

  const handleCreateTransaction = async (ad: Ad) => {
    if (!isAuthenticated || !user) {
      showNotification('warning', 'Connectez-vous pour créer une transaction !');
      navigate('/login', { state: { from: '/market' } });
      return;
    }

    if (activeTransactions.has(ad.id)) {
      showNotification('info', 'Transaction déjà en cours...');
      return;
    }

    if (ad.user.id === user.id) {
      showNotification('warning', 'Vous ne pouvez pas échanger avec votre propre annonce !');
      return;
    }

    const actionType = ad.type === 'sell' ? 'l\'achat' : 'la vente';
    if (!window.confirm(
      `Confirmer ${actionType} de ${ad.amount} ${ad.currency.code} ?\n\n` +
      `Prix: ${ad.price} MAD/${ad.currency.code}\n` +
      `Total: ${calculateTotal(ad).toLocaleString('fr-MA')} MAD\n` +
      `${ad.type === 'sell' ? 'Vendeur' : 'Acheteur'}: ${ad.user.fullName}\n` +
      `Méthode: ${ad.paymentMethod}\n\n` +
      `Une transaction sera créée et vous serez redirigé vers le chat.`
    )) {
      return;
    }

    try {
      setActiveTransactions(prev => new Set(prev).add(ad.id));
      setCreatingTransaction(ad.id);

      showNotification('info', 'Création de la transaction...');

      // 1. Créer la transaction
      const transactionData = {
        ad: ad['@id'] || `/api/ads/${ad.id}`,
        buyer: ad.type === 'sell' ? `/api/users/${user.id}` : `/api/users/${ad.user.id}`,
        seller: ad.type === 'sell' ? `/api/users/${ad.user.id}` : `/api/users/${user.id}`,
        usdtAmount: ad.amount,
        fiatAmount: calculateTotal(ad),
        status: 'pending',
        paymentReference: `TRX-${Date.now()}-${ad.id}`,
        expiresAt: new Date(Date.now() + 30 * 60000).toISOString() // 30 minutes
      };

      console.log('🔄 Création transaction:', transactionData);

      const transactionResponse = await api.post('/api/transactions', transactionData);
      const transaction = transactionResponse.data;
      
      console.log('✅ Transaction créée:', transaction);

      // 2. Créer le premier message dans la base de données
      const messageData = {
        transaction: `/api/transactions/${transaction.id}`,
        sender: `/api/users/${user.id}`,
        message: `Bonjour ${ad.user.fullName} !\n\n` +
                `Je souhaite ${ad.type === 'sell' ? 'acheter' : 'vous vendre'} ${ad.amount} ${ad.currency.code}.\n` +
                `Prix: ${ad.price} MAD/${ad.currency.code}\n` +
                `Total: ${calculateTotal(ad)} MAD\n` +
                `Méthode: ${ad.paymentMethod}\n\n` +
                `Pouvons-nous discuter des détails ?`
      };

      await api.post('/api/chat_messages', messageData);
      console.log('✅ Message créé dans la BDD');

      showNotification('success', 
        `Transaction créée !\nID: ${transaction.id}\nRedirection vers le chat...`
      );

      // 3. Rediriger vers la page de messages
      setTimeout(() => {
        navigate('/dashboard/messages', { 
          state: { 
            transactionId: transaction.id,
            recipientId: ad.user.id,
            recipientName: ad.user.fullName,
            adId: ad.id,
            autoFocus: true,
            initialMessage: `Transaction #${transaction.id} - ${ad.type === 'sell' ? 'Achat' : 'Vente'} ${ad.amount} ${ad.currency.code}`
          }
        });
      }, 1500);

    } catch (err: any) {
      console.error('❌ Erreur création transaction:', err);
      
      let errorMessage = 'Erreur lors de la création de la transaction';
      if (err.response?.status === 400) errorMessage = 'Données invalides';
      if (err.response?.status === 401) errorMessage = 'Session expirée';
      if (err.response?.status === 403) errorMessage = 'Permission refusée';
      if (err.response?.status === 404) errorMessage = 'Annonce non trouvée';
      if (err.response?.status === 409) errorMessage = 'Transaction déjà existante';
      if (err.code === 'ERR_NETWORK') errorMessage = 'Erreur de connexion';
      if (err.response?.data?.detail) errorMessage = err.response.data.detail;
      if (err.response?.data?.message) errorMessage = err.response.data.message;
      
      showNotification('error', errorMessage);
      
    } finally {
      setActiveTransactions(prev => {
        const newSet = new Set(prev);
        newSet.delete(ad.id);
        return newSet;
      });
      setCreatingTransaction(null);
    }
  };

  // ============================================
  // FILTRAGE ET TRI
  // ============================================

  const filteredAds = ads
    .filter(ad => {
      const matchesSearch = searchTerm === '' || 
        (ad.currency?.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (ad.paymentMethod?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (ad.terms?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (ad.user?.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (ad.user?.username?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        ad.id.toString().includes(searchTerm);
      
      const matchesType = typeFilter === 'all' || ad.type === typeFilter;
      const matchesCurrency = currencyFilter === 'all' || 
        (ad.currency?.code?.toLowerCase() || '') === currencyFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || ad.status === statusFilter;
      
      if (!isAdmin && statusFilter === 'all') {
        return matchesSearch && matchesType && matchesCurrency && ad.status === 'active';
      }
      
      return matchesSearch && matchesType && matchesCurrency && matchesStatus;
    })
    .sort((a, b) => {
      let comparison = 0;
      
      switch (sortBy) {
        case 'price':
          comparison = a.price - b.price;
          break;
        case 'amount':
          comparison = a.amount - b.amount;
          break;
        case 'reputation':
          comparison = (a.user?.reputation || 0) - (b.user?.reputation || 0);
          break;
        case 'created':
        default:
          comparison = new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
      
      return sortOrder === 'asc' ? comparison : -comparison;
    });

  const uniqueCurrencies = Array.from(
    new Set(ads.map(ad => ad.currency?.code).filter(Boolean))
  ).sort();

  // ============================================
  // RENDU
  // ============================================

  if (loading) {
    return (
      <div className="min-vh-100 bg-light py-5">
        <div className="container py-5">
          <div className="text-center py-5">
            <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <h3 className="text-dark mb-2">Chargement du marketplace...</h3>
            <p className="text-muted">Récupération des annonces en cours</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 bg-light">
      {/* Notifications */}
      <div className="position-fixed top-0 end-0 p-3" style={{zIndex: 1050}}>
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`toast show mb-2 ${notification.type === 'success' ? 'bg-success' :
              notification.type === 'error' ? 'bg-danger' :
              notification.type === 'warning' ? 'bg-warning text-dark' :
              'bg-info'}`}
            role="alert"
          >
            <div className="toast-body d-flex align-items-center">
              <i className={`bi ${
                notification.type === 'success' ? 'bi-check-circle-fill' :
                notification.type === 'error' ? 'bi-exclamation-circle-fill' :
                notification.type === 'warning' ? 'bi-exclamation-triangle-fill' :
                'bi-info-circle-fill'
              } me-3 fs-5`}></i>
              <div className="flex-grow-1">
                <div className="fw-medium" style={{whiteSpace: 'pre-line'}}>
                  {notification.message}
                </div>
              </div>
              <button 
                className="btn-close btn-close-white ms-2"
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              ></button>
            </div>
          </div>
        ))}
      </div>

      {/* Hero Section */}
      <div className="bg-primary text-white py-5">
        <div className="container">
          <div className="text-center">
            <h1 className="display-5 fw-bold mb-3">
              <i className="bi bi-shop me-2"></i>
              Marketplace Crypto P2P
            </h1>
            <p className="lead mb-4">
              Échangez des cryptomonnaies en MAD avec la communauté marocaine
            </p>
            
            <div className="row justify-content-center mb-4">
              <div className="col-md-3 col-sm-6 mb-3">
                <div className="bg-white bg-opacity-10 rounded p-3">
                  <div className="h2 fw-bold text-warning">{ads.length}</div>
                  <div className="text-white text-opacity-75">Annonces actives</div>
                </div>
              </div>
              <div className="col-md-3 col-sm-6 mb-3">
                <div className="bg-white bg-opacity-10 rounded p-3">
                  <div className="h2 fw-bold text-success">
                    {ads.filter(a => a.type === 'buy').length}
                  </div>
                  <div className="text-white text-opacity-75">Demandes d'achat</div>
                </div>
              </div>
              <div className="col-md-3 col-sm-6 mb-3">
                <div className="bg-white bg-opacity-10 rounded p-3">
                  <div className="h2 fw-bold text-danger">
                    {ads.filter(a => a.type === 'sell').length}
                  </div>
                  <div className="text-white text-opacity-75">Offres de vente</div>
                </div>
              </div>
              <div className="col-md-3 col-sm-6 mb-3">
                <div className="bg-white bg-opacity-10 rounded p-3">
                  <div className="h2 fw-bold text-info">
                    {ads.filter(a => a.user?.isVerified).length}
                  </div>
                  <div className="text-white text-opacity-75">Utilisateurs vérifiés</div>
                </div>
              </div>
            </div>
            
            {!isAuthenticated && (
              <div className="d-flex flex-column flex-md-row gap-3 justify-content-center mb-4">
                <Link 
                  to="/register" 
                  className="btn btn-warning btn-lg fw-bold px-5"
                >
                  <i className="bi bi-person-plus me-2"></i>
                  S'inscrire Gratuitement
                </Link>
                <Link 
                  to="/login" 
                  className="btn btn-outline-light btn-lg fw-bold px-5"
                >
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Se Connecter
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="container py-5">
        <div className="card shadow-lg mb-5">
          <div className="card-body p-4">
            <h2 className="card-title h4 fw-bold text-dark mb-4">
              <i className="bi bi-funnel me-2"></i>
              Trouvez l'offre parfaite
            </h2>
            
            <div className="row g-3">
              <div className="col-md-6 col-lg-4">
                <label className="form-label fw-medium">
                  <i className="bi bi-search me-1"></i>
                  Rechercher
                </label>
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Crypto, vendeur, méthode de paiement..."
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
              
              <div className="col-md-6 col-lg-2">
                <label className="form-label fw-medium">
                  <i className="bi bi-arrow-left-right me-1"></i>
                  Type
                </label>
                <select
                  className="form-select"
                  value={typeFilter}
                  onChange={(e) => setTypeFilter(e.target.value as any)}
                >
                  <option value="all">Tous types</option>
                  <option value="buy">Achat</option>
                  <option value="sell">Vente</option>
                </select>
              </div>
              
              <div className="col-md-6 col-lg-2">
                <label className="form-label fw-medium">
                  <i className="bi bi-currency-exchange me-1"></i>
                  Devise
                </label>
                <select
                  className="form-select"
                  value={currencyFilter}
                  onChange={(e) => setCurrencyFilter(e.target.value)}
                >
                  <option value="all">Toutes</option>
                  {uniqueCurrencies.map(code => (
                    <option key={code} value={code}>{code}</option>
                  ))}
                </select>
              </div>
              
              <div className="col-md-6 col-lg-2">
                <label className="form-label fw-medium">
                  <i className="bi bi-sort-down me-1"></i>
                  Trier par
                </label>
                <div className="input-group">
                  <select
                    className="form-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="created">Date</option>
                    <option value="price">Prix</option>
                    <option value="amount">Montant</option>
                    <option value="reputation">Réputation</option>
                  </select>
                  <button
                    className="btn btn-outline-secondary"
                    onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                    title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                  >
                    <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                  </button>
                </div>
              </div>
              
              <div className="col-md-6 col-lg-2">
                <label className="form-label fw-medium">
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Actions
                </label>
                <button 
                  className="btn btn-outline-primary w-100"
                  onClick={loadAds}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Actualiser
                </button>
              </div>
            </div>
            
            <div className="mt-4 pt-4 border-top">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <span className="h5 fw-semibold text-dark">
                    {filteredAds.length} annonce{filteredAds.length !== 1 ? 's' : ''} trouvée{filteredAds.length !== 1 ? 's' : ''}
                  </span>
                  {searchTerm && (
                    <span className="text-muted ms-2">
                      pour "{searchTerm}"
                    </span>
                  )}
                </div>
                <div className="text-muted small">
                  <i className="bi bi-info-circle me-1"></i>
                  Transactions sécurisées avec chat intégré
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des annonces */}
        {error ? (
          <div className="text-center py-5">
            <div className="card shadow-sm border-0">
              <div className="card-body py-5">
                <i className="bi bi-exclamation-triangle text-danger display-1 mb-3"></i>
                <h3 className="h2 fw-bold text-dark mb-2">Erreur de connexion</h3>
                <p className="text-muted mb-4">{error}</p>
                <button 
                  className="btn btn-primary"
                  onClick={loadAds}
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  Réessayer
                </button>
              </div>
            </div>
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="text-center py-5">
            <div className="card shadow-sm border-0">
              <div className="card-body py-5">
                <i className="bi bi-inbox text-muted display-1 mb-3"></i>
                <h3 className="h2 fw-bold text-dark mb-2">Aucune annonce trouvée</h3>
                <p className="text-muted mb-4">
                  {searchTerm ? 'Ajustez vos critères de recherche' : 'Aucune annonce active pour le moment'}
                </p>
                <div className="d-flex flex-wrap gap-2 justify-content-center">
                  {searchTerm && (
                    <button 
                      className="btn btn-secondary"
                      onClick={() => setSearchTerm('')}
                    >
                      Réinitialiser la recherche
                    </button>
                  )}
                  {isAuthenticated && (
                    <button 
                      className="btn btn-warning fw-semibold"
                      onClick={() => navigate('/dashboard/ads/create')}
                    >
                      <i className="bi bi-plus-circle me-2"></i>
                      Créer une annonce
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        ) : (
          <div className="row g-4">
            {filteredAds.map((ad) => {
              const isUserAd = user && ad.user.id === user.id;
              const isSellAd = ad.type === 'sell';
              const statusBadge = getStatusBadge(ad.status);
              const isTransactionActive = activeTransactions.has(ad.id);
              
              return (
                <div key={ad.id} className="col-12 col-md-6 col-lg-4">
                  <div className="card h-100 shadow-sm border-0 hover-shadow transition-all">
                    <div className="card-body p-4">
                      {/* En-tête avec badge et prix */}
                      <div className="d-flex justify-content-between align-items-start mb-3">
                        <div>
                          <div className="d-flex flex-wrap gap-2 mb-2">
                            <span className={`badge ${ad.type === 'buy' ? 'bg-success' : 'bg-danger'}`}>
                              <i className={`bi ${ad.type === 'buy' ? 'bi-arrow-down-circle' : 'bi-arrow-up-circle'} me-1`}></i>
                              {ad.type === 'buy' ? 'ACHAT' : 'VENTE'}
                            </span>
                            <span className={`badge ${statusBadge.class}`}>
                              <i className={`bi ${statusBadge.icon} me-1`}></i>
                              {statusBadge.text}
                            </span>
                          </div>
                          <div className="small text-muted">
                            <i className="bi bi-calendar me-1"></i>
                            Publiée {formatDate(ad.createdAt)}
                          </div>
                        </div>
                        <div className="text-end">
                          <div className="h3 fw-bold text-primary">
                            {formatPrice(ad.price)} MAD
                          </div>
                          <div className="text-muted small">/{ad.currency?.code}</div>
                        </div>
                      </div>
                      
                      {/* Titre */}
                      <h5 className="card-title fw-bold text-dark mb-3">
                        <i className={`bi ${isSellAd ? 'bi-cash' : 'bi-cart'} me-2`}></i>
                        {ad.type === 'buy' ? 'Achat de' : 'Vente de'} {ad.amount} {ad.currency?.code}
                      </h5>
                      
                      {/* Méthode de paiement */}
                      <div className="d-flex align-items-center text-dark mb-3">
                        <i className="bi bi-credit-card text-muted me-2"></i>
                        <span className="fw-medium">{ad.paymentMethod}</span>
                      </div>
                      
                      {/* Conditions */}
                      {ad.terms && (
                        <div className="mb-4">
                          <div className="d-flex align-items-center text-muted mb-1">
                            <i className="bi bi-chat-left-text me-2"></i>
                            <span className="small fw-medium">Conditions</span>
                          </div>
                          <p className="text-muted small mb-0" style={{maxHeight: '3em', overflow: 'hidden'}}>
                            {ad.terms}
                          </p>
                        </div>
                      )}
                      
                      {/* Total et limites */}
                      <div className="mb-4">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                          <span className="text-muted">Montant total</span>
                          <span className="h4 fw-bold text-dark">
                            {calculateTotal(ad).toLocaleString('fr-MA')} MAD
                          </span>
                        </div>
                        
                        {(ad.minAmountPerTransaction || ad.maxAmountPerTransaction) && (
                          <div className="small text-muted">
                            <i className="bi bi-sliders me-1"></i>
                            {ad.minAmountPerTransaction ? `Min: ${ad.minAmountPerTransaction}` : 'Sans min'} / 
                            {ad.maxAmountPerTransaction ? ` Max: ${ad.maxAmountPerTransaction}` : 'Sans max'}
                          </div>
                        )}
                      </div>
                      
                      {/* Vendeur/Acheteur */}
                      <div className="border-top pt-3">
                        <div className="d-flex justify-content-between align-items-center mb-3">
                          <div>
                            <div className="small text-muted">
                              {ad.type === 'buy' ? 'Acheteur' : 'Vendeur'}
                            </div>
                            <div className="d-flex align-items-center">
                              <div className={`rounded-circle p-2 me-2 ${ad.user?.isVerified ? 'bg-success bg-opacity-10' : 'bg-primary bg-opacity-10'}`}>
                                <i className={`bi bi-person ${ad.user?.isVerified ? 'text-success' : 'text-primary'}`}></i>
                              </div>
                              <div>
                                <div className="fw-semibold text-dark">
                                  {ad.user?.fullName || 'Anonyme'}
                                  {ad.user?.isVerified && (
                                    <i className="bi bi-patch-check-fill text-success ms-1" title="Utilisateur vérifié"></i>
                                  )}
                                </div>
                                <div className="d-flex align-items-center">
                                  <div className="text-warning small">
                                    <i className="bi bi-star-fill me-1"></i>
                                    {ad.user?.reputation?.toFixed(1) || '5.0'}
                                  </div>
                                  {ad.user?.username && (
                                    <span className="text-muted small ms-2">
                                      @{ad.user.username}
                                    </span>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          <div className="text-end">
                            <div className="small text-muted">ID</div>
                            <div className="fw-bold font-monospace">#{ad.id}</div>
                          </div>
                        </div>
                        
                        {/* BOUTONS D'ACTION */}
                        <div className="mt-4">
                          {isAuthenticated ? (
                            <>
                              {/* Bouton principal Transaction */}
                              <div className="mb-3">
                                <button 
                                  className={`btn w-100 ${isUserAd ? 'btn-secondary' : 'btn-primary'}`}
                                  onClick={() => handleCreateTransaction(ad)}
                                  disabled={!!(isTransactionActive || isUserAd)}
                                  title={isUserAd ? 'Votre annonce' : `Démarrer une transaction pour ${ad.amount} ${ad.currency.code}`}
                                >
                                  {isTransactionActive ? (
                                    <>
                                      <span className="spinner-border spinner-border-sm me-2"></span>
                                      Création transaction...
                                    </>
                                  ) : isUserAd ? (
                                    <>
                                      <i className="bi bi-person me-2"></i>
                                      Votre annonce
                                    </>
                                  ) : (
                                    <>
                                      <i className="bi bi-arrow-left-right me-2"></i>
                                      Démarrer une transaction
                                      <br />
                                      <small className="small">
                                        Total: {calculateTotal(ad).toLocaleString('fr-MA')} MAD
                                      </small>
                                    </>
                                  )}
                                </button>
                              </div>
                              
                              {/* Boutons de contact */}
                              <div className="row g-2">
                                {/* WhatsApp */}
                                <div className="col">
                                  <button 
                                    className="btn btn-success w-100"
                                    onClick={() => handleWhatsAppContact(ad)}
                                    disabled={!ad.user?.phone}
                                    title={ad.user?.phone ? `Contacter ${ad.user.fullName} sur WhatsApp` : 'Numéro non disponible'}
                                  >
                                    <i className="bi bi-whatsapp me-2"></i>
                                    WhatsApp
                                  </button>
                                </div>
                                
                                {/* Message privé avec création transaction */}
                                <div className="col">
                                  <button 
                                    className="btn btn-info w-100"
                                    onClick={() => handlePrivateMessage(ad)}
                                    title={`Envoyer un message à ${ad.user.fullName}`}
                                  >
                                    <i className="bi bi-chat-left-text me-2"></i>
                                    Message
                                  </button>
                                </div>
                              </div>
                            </>
                          ) : (
                            /* POUR LES NON-CONNECTÉS */
                            <>
                              <button 
                                className="btn btn-warning w-100 mb-3 fw-bold"
                                onClick={() => {
                                  showNotification('info', 'Connectez-vous pour échanger !');
                                  navigate('/login', { state: { from: '/market' } });
                                }}
                              >
                                <i className="bi bi-shield-lock me-2"></i>
                                Se connecter pour échanger
                              </button>
                              
                              <div className="row g-2">
                                <div className="col">
                                  <button 
                                    className="btn btn-outline-success w-100"
                                    onClick={() => {
                                      showNotification('info', 'Inscrivez-vous pour contacter !');
                                      navigate('/register', { state: { from: '/market' } });
                                    }}
                                  >
                                    <i className="bi bi-whatsapp me-2"></i>
                                    WhatsApp
                                  </button>
                                </div>
                                <div className="col">
                                  <button 
                                    className="btn btn-outline-info w-100"
                                    onClick={() => {
                                      showNotification('info', 'Inscrivez-vous pour envoyer des messages !');
                                      navigate('/register', { state: { from: '/market' } });
                                    }}
                                  >
                                    <i className="bi bi-chat-left-text me-2"></i>
                                    Message
                                  </button>
                                </div>
                              </div>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        {/* CTA pour inscription */}
        {!isAuthenticated && filteredAds.length > 0 && (
          <div className="card bg-primary text-white mt-5 border-0 shadow-lg">
            <div className="card-body p-5 text-center">
              <h3 className="card-title h2 fw-bold mb-3">
                Prêt à commencer à échanger ?
              </h3>
              <p className="card-text mb-4 opacity-75">
                Rejoignez {filteredAds.length} annonces actives et des milliers d'utilisateurs 
                qui échangent en toute confiance.
              </p>
              <div className="d-flex flex-column flex-md-row gap-3 justify-content-center">
                <Link 
                  to="/register" 
                  className="btn btn-light text-primary fw-bold px-4 py-3"
                >
                  <i className="bi bi-person-plus me-2"></i>
                  Créer un compte gratuit
                </Link>
                <Link 
                  to="/login" 
                  className="btn btn-outline-light fw-bold px-4 py-3"
                >
                  <i className="bi bi-box-arrow-in-right me-2"></i>
                  Se connecter
                </Link>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Styles inline */}
      <style>{`
        .hover-shadow:hover {
          box-shadow: 0 .5rem 1rem rgba(0,0,0,.15)!important;
          transform: translateY(-2px);
          transition: all 0.3s ease;
        }
        
        .transition-all {
          transition: all 0.3s ease;
        }
        
        .card {
          border: 1px solid rgba(0,0,0,.125);
          border-radius: 12px;
        }
        
        .card:hover {
          border-color: #0d6efd;
        }
        
        .whatsapp-btn {
          background-color: #25D366;
          border-color: #25D366;
        }
        
        .whatsapp-btn:hover {
          background-color: #1da851;
          border-color: #1da851;
        }
      `}</style>
    </div>
  );
};

export default PublicAdList;