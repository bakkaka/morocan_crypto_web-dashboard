// src/components/PublicAdList.tsx - VERSION COMPLÈTE OPTIMISÉE
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
  reputation: number;
  email?: string;
  isActive?: boolean;
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
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'pending' | 'expired';
  paymentMethod: string;
  user: User;
  createdAt: string;
  timeLimitMinutes: number;
  terms?: string;
  minAmountPerTransaction?: number;
  maxAmountPerTransaction?: number;
  '@id'?: string;
  isExpired?: boolean;
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
  const [statusFilter, setStatusFilter] = useState<string>('all');
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
        year: 'numeric'
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
      case 'active': return { class: 'bg-success', text: 'Actif', icon: 'bi-check-circle' };
      case 'paused': return { class: 'bg-warning text-dark', text: 'En pause', icon: 'bi-pause-circle' };
      case 'pending': return { class: 'bg-info', text: 'En attente', icon: 'bi-clock' };
      case 'completed': return { class: 'bg-secondary', text: 'Terminé', icon: 'bi-check-all' };
      case 'cancelled': return { class: 'bg-danger', text: 'Annulé', icon: 'bi-x-circle' };
      case 'expired': return { class: 'bg-dark', text: 'Expiré', icon: 'bi-alarm' };
      default: return { class: 'bg-secondary', text: 'Inconnu', icon: 'bi-question-circle' };
    }
  };

  // ============================================
  // CHARGEMENT DES ANNONCES AVEC TOUTES LES ROUTES API
  // ============================================

  const loadAds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🌐 Chargement des annonces...');
      console.log('🔧 Base URL:', api.defaults.baseURL);
      
      // TOUTES LES ROUTES API POSSIBLES POUR LES ANNONCES
      const apiEndpoints = [
        // Routes standards API Platform
        '/ads',
        '/api/ads',
        '/api/public/ads',
        '/public/ads',
        
        // Routes alternatives
        '/annonces',
        '/api/annonces',
        '/marketplace/ads',
        '/api/marketplace/ads',
        
        // Routes avec filtres intégrés
        '/ads/active',
        '/api/ads/active',
        '/ads/public',
        '/api/ads/public',
        
        // Routes spécifiques
        '/ads?status=active',
        '/api/ads?status=active',
      ];

      // Paramètres de requête
      const params: any = {
        page: 1,
        itemsPerPage: 100,
        'order[createdAt]': 'desc'
      };

      // Si pas admin, filtrer par statut actif
      if (!isAdmin) {
        params.status = 'active';
      }

      let response = null;
      let successfulEndpoint = '';
      let lastError = null;

      // Tester toutes les routes jusqu'à trouver celle qui fonctionne
      for (const endpoint of apiEndpoints) {
        try {
          console.log(`🔍 Test endpoint: ${endpoint}`);
          
          // Construire l'URL complète pour debug
          const fullUrl = `${api.defaults.baseURL}${endpoint}`;
          console.log(`🔗 URL complète: ${fullUrl}`);
          
          response = await api.get(endpoint, { params });
          
          console.log(`✅ Succès avec ${endpoint} (status: ${response.status})`);
          successfulEndpoint = endpoint;
          break;
          
        } catch (err: any) {
          lastError = err;
          const status = err.response?.status;
          const message = err.message;
          
          console.log(`❌ ${endpoint}: ${status || 'Error'} - ${message}`);
          
          // Si c'est une 404, continuer avec le prochain endpoint
          if (status === 404) {
            continue;
          }
          
          // Si c'est une erreur CORS ou réseau, arrêter les autres tests
          if (status === undefined || message.includes('Network') || message.includes('CORS')) {
            console.log('🛑 Erreur CORS/réseau détectée, arrêt des tests');
            break;
          }
        }
      }

      // Si aucune route ne fonctionne
      if (!response) {
        console.error('❌ Toutes les routes API ont échoué');
        
        // Afficher un message d'erreur clair
        if (lastError?.message?.includes('Network') || lastError?.message?.includes('CORS')) {
          throw new Error('Erreur de connexion CORS. Vérifiez la configuration du serveur backend.');
        }
        
        throw new Error('Impossible de se connecter à l\'API des annonces');
      }

      console.log(`🎯 Route utilisée: ${successfulEndpoint}`);
      const responseData = response.data;
      
      // EXTRACTION DES DONNÉES SELON DIFFÉRENTS FORMATS
      let adsData: any[] = [];
      
      // 1. Format Hydra (API Platform standard)
      if (responseData['hydra:member']) {
        adsData = responseData['hydra:member'];
        console.log(`📋 Format Hydra: ${adsData.length} annonces`);
      }
      // 2. Format simple array
      else if (Array.isArray(responseData)) {
        adsData = responseData;
        console.log(`📋 Format Array: ${adsData.length} annonces`);
      }
      // 3. Format avec wrapper 'data'
      else if (responseData.data && Array.isArray(responseData.data)) {
        adsData = responseData.data;
        console.log(`📋 Format Data wrapper: ${adsData.length} annonces`);
      }
      // 4. Format avec 'items'
      else if (responseData.items && Array.isArray(responseData.items)) {
        adsData = responseData.items;
        console.log(`📋 Format Items: ${adsData.length} annonces`);
      }
      // 5. Format avec 'member'
      else if (responseData.member && Array.isArray(responseData.member)) {
        adsData = responseData.member;
        console.log(`📋 Format Member: ${adsData.length} annonces`);
      }
      // 6. Autres formats
      else if (typeof responseData === 'object' && responseData !== null) {
        // Essayer d'extraire toutes les propriétés qui sont des arrays
        Object.keys(responseData).forEach(key => {
          if (Array.isArray(responseData[key])) {
            console.log(`🔍 Tableau trouvé dans ${key}: ${responseData[key].length} éléments`);
            adsData = [...adsData, ...responseData[key]];
          }
        });
        
        if (adsData.length === 0) {
          // Si c'est un objet unique (une seule annonce)
          adsData = [responseData];
        }
      }
      
      console.log(`📊 Total annonces extraites: ${adsData.length}`);

      // TRANSFORMATION DES DONNÉES
      const now = new Date();
      const formattedAds: Ad[] = adsData.map((ad: any, index: number) => {
        // Valeurs par défaut
        const defaults = {
          id: index + 1,
          type: 'buy' as const,
          amount: 0,
          price: 0,
          status: 'active' as const,
          createdAt: now.toISOString(),
          timeLimitMinutes: 1440, // 24h par défaut
        };
        
        // Fusionner avec les données de l'API
        const adData = { ...defaults, ...ad };
        
        // Calculer l'expiration
        const createdAt = new Date(adData.createdAt);
        const expiresAt = new Date(createdAt.getTime() + (adData.timeLimitMinutes * 60000));
        const isExpired = expiresAt < now && adData.status === 'active';
        
        // Extraire l'utilisateur
        let userData: User = { 
          id: 0, 
          fullName: 'Anonyme', 
          reputation: 5.0 
        };
        
        if (ad.user) {
          if (typeof ad.user === 'object') {
            userData = {
              id: ad.user.id || 0,
              fullName: ad.user.fullName || ad.user.full_name || ad.user.username || ad.user.email?.split('@')[0] || 'Utilisateur',
              reputation: ad.user.reputation || 5.0,
              email: ad.user.email,
              isActive: ad.user.isActive !== false
            };
          }
        }
        
        // Extraire la devise
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
        
        // Retourner l'annonce formatée
        return {
          id: adData.id,
          '@id': ad['@id'] || `/api/ads/${adData.id}`,
          type: adData.type,
          amount: parseFloat(adData.amount) || 0,
          price: parseFloat(adData.price) || 0,
          currency: currencyData,
          status: isExpired ? 'expired' : adData.status,
          paymentMethod: ad.paymentMethod || ad.payment_method || 'Non spécifié',
          user: userData,
          createdAt: adData.createdAt,
          timeLimitMinutes: adData.timeLimitMinutes,
          terms: ad.terms,
          minAmountPerTransaction: ad.minAmountPerTransaction || ad.min_amount_per_transaction,
          maxAmountPerTransaction: ad.maxAmountPerTransaction || ad.max_amount_per_transaction,
          isExpired
        };
      });

      console.log(`✅ ${formattedAds.length} annonces chargées avec succès`);
      setAds(formattedAds);

    } catch (err: any) {
      console.error('❌ Erreur chargement annonces:', {
        message: err.message,
        status: err.response?.status,
        data: err.response?.data,
        config: err.config
      });
      
      let errorMsg = 'Impossible de charger les annonces';
      
      if (err.message.includes('CORS')) {
        errorMsg = 'Erreur CORS. Vérifiez la configuration du serveur.';
      } else if (err.response?.status === 404) {
        errorMsg = 'Aucune annonce disponible pour le moment.';
        // Pas d'erreur, juste aucun résultat
        setAds([]);
        setError(null);
      } else if (err.response?.status === 401) {
        errorMsg = 'Authentification requise';
      } else if (err.response?.status === 403) {
        errorMsg = 'Accès non autorisé';
      } else if (err.response?.status === 500) {
        errorMsg = 'Erreur serveur. Veuillez réessayer plus tard.';
      }
      
      setError(errorMsg);
      setAds([]);
      
      // Notification pour l'utilisateur
      showNotification('error', errorMsg);
      
    } finally {
      setLoading(false);
    }
  }, [isAdmin, showNotification]);

  // ============================================
  // CHARGEMENT INITIAL ET ACTUALISATION
  // ============================================

  useEffect(() => {
    loadAds();
    
    // Actualisation automatique toutes les 30 secondes
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadAds();
      }
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadAds]);

  // ============================================
  // GESTION DES TRANSACTIONS
  // ============================================

  const handleBuyAd = async (ad: Ad) => {
    if (!isAuthenticated || !user) {
      showNotification('warning', 'Connectez-vous pour échanger !');
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
      `Confirmer ${actionType} de ${ad.amount} ${ad.currency.code} à ${ad.price} MAD ?\n\n` +
      `Total: ${calculateTotal(ad).toLocaleString('fr-MA')} MAD\n` +
      `${ad.type === 'sell' ? 'Vendeur' : 'Acheteur'}: ${ad.user.fullName}\n` +
      `Méthode: ${ad.paymentMethod}`
    )) {
      return;
    }

    try {
      setActiveTransactions(prev => new Set(prev).add(ad.id));
      setCreatingTransaction(ad.id);
      
      const transactionData = {
        ad: ad['@id'] || `/api/ads/${ad.id}`,
        buyer: ad.type === 'sell' ? `/api/users/${user.id}` : `/api/users/${ad.user.id}`,
        seller: ad.type === 'sell' ? `/api/users/${ad.user.id}` : `/api/users/${user.id}`,
        usdtAmount: ad.amount,
        fiatAmount: calculateTotal(ad),
        status: 'pending'
      };

      console.log('🔄 Création transaction:', transactionData);

      // Routes API pour les transactions
      const transactionEndpoints = [
        '/transactions',
        '/api/transactions',
        '/api/public/transactions',
        '/marketplace/transactions'
      ];

      let response = null;
      
      for (const endpoint of transactionEndpoints) {
        try {
          response = await api.post(endpoint, transactionData);
          console.log(`✅ Transaction créée via ${endpoint}`);
          break;
        } catch (err) {
          console.log(`❌ ${endpoint} échoué:`, err);
          continue;
        }
      }

      if (!response) {
        throw new Error('Aucun endpoint transaction ne fonctionne');
      }

      const transaction = response.data;
      
      showNotification('success', 
        `Transaction créée !\nID: ${transaction.id}\nRedirection vers la page de paiement...`
      );
      
      setTimeout(() => {
        navigate(`/dashboard/transactions/${transaction.id}`);
      }, 2000);

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

  const handleContactSeller = (ad: Ad) => {
    if (!isAuthenticated) {
      showNotification('warning', 'Connectez-vous pour contacter !');
      navigate('/login', { state: { from: '/market' } });
      return;
    }
    
    navigate('/dashboard/messages', { 
      state: { 
        recipientId: ad.user.id,
        recipientName: ad.user.fullName,
        adId: ad.id 
      }
    });
  };

  const handleCreateSimilarAd = (ad: Ad) => {
    if (!isAuthenticated) {
      showNotification('warning', 'Créez un compte pour publier des annonces !');
      navigate('/register', { state: { from: '/market' } });
      return;
    }
    
    navigate('/dashboard/ads/create', {
      state: {
        prefill: {
          type: ad.type,
          currency: ad.currency.id,
          amount: ad.amount,
          price: ad.price,
          paymentMethod: ad.paymentMethod,
          terms: ad.terms,
          minAmountPerTransaction: ad.minAmountPerTransaction,
          maxAmountPerTransaction: ad.maxAmountPerTransaction,
          timeLimitMinutes: ad.timeLimitMinutes || 1440
        }
      }
    });
  };

  // ============================================
  // FONCTIONS ADMIN
  // ============================================

  const handleAdminAction = async (adId: number, action: string) => {
    if (!isAdmin) {
      showNotification('error', 'Action réservée aux administrateurs');
      return;
    }

    try {
      setModifyingAd(adId);
      
      let newStatus: string;
      let actionText: string;
      
      switch (action) {
        case 'activate':
          newStatus = 'active';
          actionText = 'activée';
          break;
        case 'pause':
          newStatus = 'paused';
          actionText = 'mise en pause';
          break;
        case 'suspend':
          newStatus = 'cancelled';
          actionText = 'suspendue';
          break;
        case 'approve':
          newStatus = 'active';
          actionText = 'approuvée';
          break;
        case 'reject':
          newStatus = 'cancelled';
          actionText = 'rejetée';
          break;
        default:
          return;
      }

      console.log(`🔄 ${actionText} annonce ${adId}`);
      
      // Routes API pour modifier les annonces
      const endpoints = [
        `/ads/${adId}`,
        `/api/ads/${adId}`,
        `/annonces/${adId}`,
        `/api/annonces/${adId}`
      ];
      
      for (const endpoint of endpoints) {
        try {
          await api.patch(endpoint, { status: newStatus });
          console.log(`✅ ${actionText} via ${endpoint}`);
          break;
        } catch (err) {
          console.log(`❌ ${endpoint} échoué:`, err);
          continue;
        }
      }
      
      showNotification('success', `Annonce ${actionText} avec succès !`);
      
      // Recharger les annonces
      setTimeout(() => {
        loadAds();
      }, 1000);
      
    } catch (err: any) {
      console.error(`❌ Erreur ${action} annonce:`, err);
      
      let errorMessage = `Erreur lors de l'action ${action}`;
      if (err.response?.status === 404) {
        errorMessage = 'Annonce non trouvée';
      } else if (err.response?.status === 403) {
        errorMessage = 'Permission refusée';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      }
      
      showNotification('error', errorMessage);
    } finally {
      setModifyingAd(null);
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
        ad.id.toString().includes(searchTerm);
      
      const matchesType = typeFilter === 'all' || ad.type === typeFilter;
      const matchesCurrency = currencyFilter === 'all' || 
        (ad.currency?.code?.toLowerCase() || '') === currencyFilter.toLowerCase();
      const matchesStatus = statusFilter === 'all' || ad.status === statusFilter;
      
      if (!isAdmin && ad.status !== 'active' && !ad.isExpired) return false;
      
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

  const uniqueStatuses = Array.from(
    new Set(ads.map(ad => ad.status).filter(Boolean))
  ).sort();

  // ============================================
  // COMPOSANTS D'INTERFACE
  // ============================================

  const NotificationDisplay = () => (
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
              notification.type === 'success' ? 'bi-check-circle' :
              notification.type === 'error' ? 'bi-exclamation-circle' :
              notification.type === 'warning' ? 'bi-exclamation-triangle' :
              'bi-info-circle'
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
  );

  const LoadingSpinner = () => (
    <div className="min-vh-100 bg-light py-5">
      <div className="container py-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary mb-3" style={{width: '3rem', height: '3rem'}} role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <h3 className="text-dark mb-2">Chargement du marketplace...</h3>
          <p className="text-muted">Connexion à l'API en cours</p>
          <button 
            className="btn btn-outline-primary mt-3"
            onClick={() => {
              console.log('🔍 DEBUG API:', {
                baseURL: api.defaults.baseURL,
                endpoints: [
                  `${api.defaults.baseURL}/ads`,
                  `${api.defaults.baseURL}/api/ads`,
                  `${api.defaults.baseURL}/public/ads`
                ]
              });
            }}
          >
            <i className="bi bi-bug me-2"></i>
            Voir URL API
          </button>
        </div>
      </div>
    </div>
  );

  const ErrorDisplay = () => (
    <div className="text-center py-5">
      <div className="card shadow-sm border-0">
        <div className="card-body py-5">
          <i className="bi bi-exclamation-triangle text-danger display-1 mb-3"></i>
          <h3 className="h2 fw-bold text-dark mb-2">Erreur de connexion</h3>
          <p className="text-muted mb-4">{error}</p>
          <div className="d-flex flex-column flex-md-row gap-3 justify-content-center">
            <button 
              className="btn btn-primary"
              onClick={loadAds}
            >
              <i className="bi bi-arrow-clockwise me-2"></i>
              Réessayer
            </button>
            <button 
              className="btn btn-outline-secondary"
              onClick={() => {
                console.log('🧪 Test API manuel...');
                const endpoints = [
                  '/ads',
                  '/api/ads',
                  '/public/ads'
                ];
                
                endpoints.forEach(async (endpoint) => {
                  try {
                    const res = await api.get(endpoint);
                    console.log(`✅ ${endpoint}:`, res.status, res.data);
                  } catch (err: any) {
                    console.log(`❌ ${endpoint}:`, err.message);
                  }
                });
              }}
            >
              <i className="bi bi-plug me-2"></i>
              Tester endpoints
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const EmptyState = () => (
    <div className="text-center py-5">
      <div className="card shadow-sm border-0">
        <div className="card-body py-5">
          <i className="bi bi-inbox text-muted display-1 mb-3"></i>
          <h3 className="h2 fw-bold text-dark mb-2">Aucune annonce trouvée</h3>
          <p className="text-muted mb-4">
            {searchTerm || typeFilter !== 'all' || currencyFilter !== 'all' || statusFilter !== 'all'
              ? 'Ajustez vos critères de recherche'
              : 'Aucune annonce active pour le moment. Soyez le premier à créer une annonce!'}
          </p>
          <div className="d-flex flex-wrap gap-2 justify-content-center">
            {(searchTerm || typeFilter !== 'all' || currencyFilter !== 'all' || statusFilter !== 'all') && (
              <button 
                className="btn btn-secondary"
                onClick={() => {
                  setSearchTerm('');
                  setTypeFilter('all');
                  setCurrencyFilter('all');
                  setStatusFilter('all');
                }}
              >
                Réinitialiser les filtres
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
  );

  // ============================================
  // RENDU PRINCIPAL
  // ============================================

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-vh-100 bg-light">
      <NotificationDisplay />
      
      {/* Hero Section */}
      <div className="bg-primary text-white py-5">
        <div className="container">
          <div className="text-center">
            <h1 className="display-5 fw-bold mb-3">
              Marketplace Crypto P2P Maroc
            </h1>
            <p className="lead mb-4">
              {isAdmin ? 'Panel d\'administration des annonces' : 'Achetez et vendez des cryptomonnaies en MAD avec des particuliers de confiance'}
            </p>
            
            <div className="row justify-content-center mb-4">
              <div className="col-md-3 col-sm-6 mb-3">
                <div className="bg-white bg-opacity-10 rounded p-3">
                  <div className="h2 fw-bold text-warning">{ads.length}</div>
                  <div className="text-white text-opacity-75">Annonces totales</div>
                </div>
              </div>
              <div className="col-md-3 col-sm-6 mb-3">
                <div className="bg-white bg-opacity-10 rounded p-3">
                  <div className="h2 fw-bold text-success">
                    {ads.filter(a => a.status === 'active' && !a.isExpired).length}
                  </div>
                  <div className="text-white text-opacity-75">Actives</div>
                </div>
              </div>
              <div className="col-md-3 col-sm-6 mb-3">
                <div className="bg-white bg-opacity-10 rounded p-3">
                  <div className="h2 fw-bold text-danger">
                    {ads.filter(a => a.type === 'sell').length}
                  </div>
                  <div className="text-white text-opacity-75">Ventes</div>
                </div>
              </div>
              {isAdmin && (
                <div className="col-md-3 col-sm-6 mb-3">
                  <div className="bg-white bg-opacity-10 rounded p-3">
                    <div className="h2 fw-bold text-warning">
                      {ads.filter(a => a.status === 'pending').length}
                    </div>
                    <div className="text-white text-opacity-75">En attente</div>
                  </div>
                </div>
              )}
            </div>
            
            {!isAuthenticated && (
              <div className="d-flex flex-column flex-md-row gap-3 justify-content-center mb-4">
                <Link 
                  to="/register" 
                  className="btn btn-warning btn-lg fw-bold px-5"
                >
                  <i className="bi bi-rocket me-2"></i>
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
              <i className="bi bi-filter me-2"></i>
              {isAdmin ? 'Filtres d\'administration' : 'Trouvez l\'offre parfaite'}
            </h2>
            
            <div className="row g-3">
              <div className="col-md-6 col-lg-4">
                <label className="form-label fw-medium">Rechercher</label>
                <div className="input-group">
                  <span className="input-group-text">
                    <i className="bi bi-search"></i>
                  </span>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="ID, crypto, banque, vendeur..."
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
                <label className="form-label fw-medium">Type</label>
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
                <label className="form-label fw-medium">Devise</label>
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
              
              {isAdmin && (
                <div className="col-md-6 col-lg-2">
                  <label className="form-label fw-medium">Statut</label>
                  <select
                    className="form-select"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                  >
                    <option value="all">Tous statuts</option>
                    {uniqueStatuses.map(status => (
                      <option key={status} value={status}>
                        {getStatusBadge(status).text}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              
              <div className="col-md-6 col-lg-2">
                <label className="form-label fw-medium">Trier par</label>
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
                <div className="d-flex gap-2">
                  <button 
                    className="btn btn-outline-primary btn-sm"
                    onClick={loadAds}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    Actualiser
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Contenu principal */}
        {error ? (
          <ErrorDisplay />
        ) : filteredAds.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            <div className="row g-4">
              {filteredAds.map((ad) => {
                const isUserAd = user && ad.user.id === user.id;
                const isSellAd = ad.type === 'sell';
                const statusBadge = getStatusBadge(ad.status);
                const isTransactionActive = activeTransactions.has(ad.id);
                
                return (
                  <div key={ad.id} className="col-12 col-md-6 col-lg-4">
                    <div className="card h-100 shadow-sm border-0 hover-shadow transition-all ad-card">
                      <div className="card-body p-4">
                        {/* En-tête */}
                        <div className="d-flex justify-content-between align-items-start mb-3">
                          <div>
                            <div className="d-flex flex-wrap gap-2 mb-2">
                              <span className={`badge ${ad.type === 'buy' ? 'bg-success' : 'bg-danger'}`}>
                                {ad.type === 'buy' ? '🛒 ACHAT' : '💰 VENTE'}
                              </span>
                              <span className={`badge ${statusBadge.class}`}>
                                <i className={`bi ${statusBadge.icon} me-1`}></i>
                                {statusBadge.text}
                              </span>
                              {ad.isExpired && (
                                <span className="badge bg-dark">
                                  <i className="bi bi-alarm me-1"></i>
                                  Expiré
                                </span>
                              )}
                            </div>
                            <div className="small text-muted">
                              <i className="bi bi-clock me-1"></i>
                              {formatDate(ad.createdAt)}
                              {ad.timeLimitMinutes && (
                                <span className="ms-2">
                                  <i className="bi bi-hourglass-split me-1"></i>
                                  {ad.timeLimitMinutes >= 1440 
                                    ? `${Math.floor(ad.timeLimitMinutes / 1440)}j`
                                    : ad.timeLimitMinutes >= 60
                                      ? `${Math.floor(ad.timeLimitMinutes / 60)}h`
                                      : `${ad.timeLimitMinutes}min`
                                  }
                                </span>
                              )}
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
                          {ad.type === 'buy' ? 'Achat de' : 'Vente de'} {ad.amount} {ad.currency?.code}
                        </h5>
                        
                        {/* Méthode de paiement */}
                        <div className="d-flex align-items-center text-dark mb-3">
                          <i className="bi bi-bank text-muted me-2"></i>
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
                        
                        {/* Total */}
                        <div className="mb-4">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span className="text-muted">Montant total</span>
                            <span className="h4 fw-bold text-dark">
                              {calculateTotal(ad).toLocaleString('fr-MA')} MAD
                            </span>
                          </div>
                          
                          {/* Limites */}
                          {(ad.minAmountPerTransaction || ad.maxAmountPerTransaction) && (
                            <div className="small text-muted">
                              <i className="bi bi-sliders me-1"></i>
                              {ad.minAmountPerTransaction ? `Min: ${ad.minAmountPerTransaction}` : 'Sans min'} / 
                              {ad.maxAmountPerTransaction ? ` Max: ${ad.maxAmountPerTransaction}` : 'Sans max'}
                            </div>
                          )}
                        </div>
                        
                        {/* Vendeur/Acheteur + Actions */}
                        <div className="border-top pt-3">
                          <div className="d-flex justify-content-between align-items-center mb-3">
                            <div>
                              <div className="small text-muted">
                                {ad.type === 'buy' ? 'Acheteur' : 'Vendeur'}
                              </div>
                              <div className="d-flex align-items-center">
                                <div className="bg-primary bg-opacity-10 rounded-circle p-2 me-2">
                                  <i className="bi bi-person text-primary"></i>
                                </div>
                                <div>
                                  <div className="fw-semibold text-dark">
                                    {ad.user?.fullName || 'Anonyme'}
                                  </div>
                                  <div className="d-flex align-items-center text-warning small">
                                    <i className="bi bi-star-fill me-1"></i>
                                    {ad.user?.reputation?.toFixed(1) || '5.0'}
                                  </div>
                                </div>
                              </div>
                            </div>
                            
                            <div className="text-end">
                              <div className="small text-muted">ID</div>
                              <div className="fw-bold font-monospace">#{ad.id}</div>
                            </div>
                          </div>
                          
                          {/* Boutons d'action */}
                          <div className="mt-4">
                            {isAuthenticated ? (
                              <>
                                <div className="mb-3">
                                  {isSellAd ? (
                                    <button 
                                      className={`btn w-100 ${isUserAd ? 'btn-secondary' : 'btn-success'}`}
                                      onClick={() => handleBuyAd(ad)}
                                      disabled={!!(isTransactionActive || modifyingAd === ad.id || isUserAd)}
                                      title={isUserAd ? 'Vous ne pouvez pas acheter votre propre annonce' : `Acheter ${ad.amount} ${ad.currency.code}`}
                                    >
                                      {isTransactionActive ? (
                                        <>
                                          <span className="spinner-border spinner-border-sm me-2"></span>
                                          Création transaction...
                                        </>
                                      ) : isUserAd ? (
                                        'Votre annonce'
                                      ) : (
                                        <>
                                          <i className="bi bi-cart me-2"></i>
                                          Acheter maintenant
                                          <br />
                                          <small className="small">
                                            Total: {calculateTotal(ad).toLocaleString('fr-MA')} MAD
                                          </small>
                                        </>
                                      )}
                                    </button>
                                  ) : (
                                    <button 
                                      className={`btn w-100 ${isUserAd ? 'btn-secondary' : 'btn-warning'}`}
                                      onClick={() => handleBuyAd(ad)}
                                      disabled={!!(isTransactionActive || modifyingAd === ad.id || isUserAd)}
                                      title={isUserAd ? 'Vous ne pouvez pas vendre à votre propre annonce' : `Vendre ${ad.amount} ${ad.currency.code}`}
                                    >
                                      {isTransactionActive ? (
                                        <>
                                          <span className="spinner-border spinner-border-sm me-2"></span>
                                          Création transaction...
                                        </>
                                      ) : isUserAd ? (
                                        'Votre annonce'
                                      ) : (
                                        <>
                                          <i className="bi bi-currency-dollar me-2"></i>
                                          Vendre à cet acheteur
                                          <br />
                                          <small className="small">
                                            Total: {calculateTotal(ad).toLocaleString('fr-MA')} MAD
                                          </small>
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                                
                                <div className="row g-2">
                                  <div className="col">
                                    <button 
                                      className="btn btn-primary w-100"
                                      onClick={() => handleContactSeller(ad)}
                                      disabled={modifyingAd === ad.id}
                                    >
                                      <i className="bi bi-chat me-2"></i>
                                      Contacter
                                    </button>
                                  </div>
                                  <div className="col">
                                    <button 
                                      className="btn btn-outline-primary w-100"
                                      onClick={() => handleCreateSimilarAd(ad)}
                                      disabled={modifyingAd === ad.id}
                                    >
                                      <i className="bi bi-copy me-2"></i>
                                      Similaire
                                    </button>
                                  </div>
                                </div>
                              </>
                            ) : (
                              <>
                                <button 
                                  className="btn btn-warning w-100 mb-2 fw-bold"
                                  onClick={() => {
                                    showNotification('info', 'Connectez-vous pour échanger !');
                                    navigate('/login', { state: { from: '/market' } });
                                  }}
                                >
                                  <i className="bi bi-shield-lock me-2"></i>
                                  Se connecter pour échanger
                                </button>
                                <div className="text-center text-muted small">
                                  <i className="bi bi-shield-check me-1"></i>
                                  Gratuit • Sécurisé • Rapide
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
            
            {/* CTA pour les non-connectés */}
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
                      <i className="bi bi-rocket me-2"></i>
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
          </>
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
        
        .ad-card {
          border: 1px solid rgba(0,0,0,.125);
        }
        
        .ad-card:hover {
          border-color: #0d6efd;
        }
      `}</style>
    </div>
  );
};

export default PublicAdList;