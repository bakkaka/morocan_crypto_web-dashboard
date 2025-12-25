// src/components/PublicAdList.tsx
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

interface TransactionCreateData {
  ad: string;
  buyer: string;
  seller: string;
  usdtAmount: number;
  fiatAmount: number;
  status: string;
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

  const extractHydraMember = useCallback((data: any): any[] => {
    if (data?.member && Array.isArray(data.member)) return data.member;
    if (data?.['hydra:member'] && Array.isArray(data['hydra:member'])) return data['hydra:member'];
    if (Array.isArray(data)) return data;
    return [];
  }, []);

  // Gestion des notifications
  const showNotification = useCallback((type: 'success' | 'error' | 'info' | 'warning', message: string) => {
    const id = Date.now();
    const notification: Notification = { type, message, id };
    setNotifications(prev => [...prev, notification]);
    
    // Auto-remove after 5 seconds
    setTimeout(() => {
      setNotifications(prev => prev.filter(n => n.id !== id));
    }, 5000);
  }, []);

  // Formatage des dates
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
  // FONCTIONS DE GESTION DES TRANSACTIONS
  // ============================================

  const checkUserBalance = async (userId: number, amountNeeded: number): Promise<boolean> => {
    try {
      const response = await api.get(`/api/users/${userId}/wallet`);
      const userBalance = response.data.balance || response.data.totalBalance || 0;
      
      if (userBalance < amountNeeded) {
        showNotification('error', 
          `Solde insuffisant !\nSolde disponible: ${userBalance} MAD\nMontant nécessaire: ${amountNeeded} MAD`
        );
        return false;
      }
      return true;
    } catch (error) {
      console.log('⚠️ Impossible de vérifier le solde, continuation...');
      return true;
    }
  };

  const checkAdAvailability = async (adId: number): Promise<boolean> => {
    try {
      const response = await api.get(`/ads/${adId}`);
      const adData = response.data;
      
      if (adData.status !== 'active') {
        showNotification('error', 'Cette annonce n\'est plus disponible');
        loadAds();
        return false;
      }
      
      if (adData.amount <= 0) {
        showNotification('error', 'Cette annonce est épuisée');
        return false;
      }
      
      // Vérifier si l'annonce a expiré
      const createdAt = new Date(adData.createdAt);
      const expiresAt = new Date(createdAt.getTime() + (adData.timeLimitMinutes * 60000));
      if (expiresAt < new Date()) {
        showNotification('error', 'Cette annonce a expiré');
        return false;
      }
      
      return true;
    } catch (error) {
      console.error('❌ Erreur vérification annonce:', error);
      return false;
    }
  };

  const handleBuyAd = async (ad: Ad) => {
    if (!isAuthenticated || !user) {
      showNotification('warning', 'Connectez-vous pour acheter !');
      navigate('/login', { state: { from: '/market' } });
      return;
    }

    // Empêcher les clics multiples
    if (activeTransactions.has(ad.id)) {
      showNotification('info', 'Transaction déjà en cours...');
      return;
    }

    // Vérifier qu'on n'achète pas sa propre annonce
    if (ad.user.id === user.id) {
      showNotification('warning', 'Vous ne pouvez pas acheter votre propre annonce !');
      return;
    }

    // Vérifier la disponibilité
    const isAvailable = await checkAdAvailability(ad.id);
    if (!isAvailable) return;

    // Vérifier le solde si c'est un achat
    if (ad.type === 'sell') {
      const amountNeeded = calculateTotal(ad);
      const hasEnoughBalance = await checkUserBalance(user.id, amountNeeded);
      if (!hasEnoughBalance) return;
    }

    if (!window.confirm(
      `Confirmer ${ad.type === 'sell' ? 'l\'achat' : 'la vente'} de ${ad.amount} ${ad.currency.code} à ${ad.price} MAD ?\n\n` +
      `Total: ${calculateTotal(ad).toLocaleString('fr-MA')} MAD\n` +
      `${ad.type === 'sell' ? 'Vendeur' : 'Acheteur'}: ${ad.user.fullName}\n` +
      `Méthode: ${ad.paymentMethod}`
    )) {
      return;
    }

    try {
      // Ajouter à la liste des transactions actives
      setActiveTransactions(prev => new Set(prev).add(ad.id));
      setCreatingTransaction(ad.id);
      
      // Préparer les données pour la transaction
      const transactionData: TransactionCreateData = {
        ad: ad['@id'] || `/api/ads/${ad.id}`,
        buyer: ad.type === 'sell' ? `/api/users/${user.id}` : `/api/users/${ad.user.id}`,
        seller: ad.type === 'sell' ? `/api/users/${ad.user.id}` : `/api/users/${user.id}`,
        usdtAmount: ad.amount,
        fiatAmount: calculateTotal(ad),
        status: 'pending'
      };

      console.log('🔄 Création de transaction:', transactionData);

      // Essayer différents endpoints
      const endpoints = ['/api/transactions', '/transactions'];
      let response = null;
      
      for (const endpoint of endpoints) {
        try {
          response = await api.post(endpoint, transactionData);
          break;
        } catch (err) {
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
      
      // Rediriger vers la page de la transaction
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
      // Retirer de la liste des transactions actives
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
    
    // Pour l'instant, redirection vers le dashboard
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
          timeLimitMinutes: ad.timeLimitMinutes
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
      
      const endpoint = `/ads/${adId}`;
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

      console.log(`🔄 ${actionText} annonce ${adId} -> ${newStatus}`);
      await api.patch(endpoint, { status: newStatus });
      
      showNotification('success', `Annonce ${actionText} avec succès !`);
      
      // Recharger après un délai
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
  // FONCTION DE SUPPRESSION POUR ADMIN
  // ============================================

  const handleDeleteAd = async (adId: number) => {
    if (!isAdmin) {
      showNotification('error', 'Action réservée aux administrateurs');
      return;
    }

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cette annonce ? Cette action est irréversible et supprimera également toutes les transactions associées.')) {
      return;
    }

    try {
      setModifyingAd(adId);
      
      console.log(`🗑️ Suppression définitive de l'annonce ${adId}`);
      await api.delete(`/ads/${adId}`);
      
      showNotification('success', 'Annonce supprimée définitivement avec succès !');
      
      // Recharger après un délai
      setTimeout(() => {
        loadAds();
      }, 1000);
      
    } catch (err: any) {
      console.error('❌ Erreur suppression annonce:', err);
      
      let errorMessage = 'Erreur lors de la suppression';
      if (err.response?.status === 404) {
        errorMessage = 'Annonce non trouvée';
      } else if (err.response?.status === 403) {
        errorMessage = 'Permission refusée - Admin uniquement';
      } else if (err.response?.status === 409) {
        errorMessage = 'Impossible de supprimer : transactions actives associées';
      } else if (err.response?.data?.detail) {
        errorMessage = err.response.data.detail;
      } else if (err.response?.data?.message) {
        errorMessage = err.response.data.message;
      }
      
      showNotification('error', errorMessage);
    } finally {
      setModifyingAd(null);
    }
  };

  // ============================================
  // CHARGEMENT DES DONNÉES
  // ============================================

  const loadAds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🌐 Chargement des annonces publiques...');
      
      const params: any = { 
        'order[createdAt]': 'desc',
        page: 1,
        itemsPerPage: 50
      };

      // Si admin, voir toutes les annonces, sinon seulement les actives
      if (!isAdmin) {
        params.status = 'active';
      }

      const response = await api.get('/ads', { params });
      
      const adsData = extractHydraMember(response.data);
      console.log('✅ Annonces chargées:', adsData.length);
      
      // Calculer si les annonces ont expiré
      const now = new Date();
      const formattedAds: Ad[] = adsData.map((ad: any) => {
        const createdAt = new Date(ad.createdAt || now);
        const expiresAt = new Date(createdAt.getTime() + ((ad.timeLimitMinutes || 60) * 60000));
        const isExpired = expiresAt < now && ad.status === 'active';
        
        return {
          id: ad.id,
          '@id': ad['@id'],
          type: ad.type || 'buy',
          amount: parseFloat(ad.amount) || 0,
          price: parseFloat(ad.price) || 0,
          currency: ad.currency || { id: 0, code: 'USDT', name: 'Tether USD', type: 'crypto' },
          status: isExpired ? 'expired' : (ad.status || 'active'),
          paymentMethod: ad.paymentMethod || 'Non spécifié',
          user: ad.user || { id: 0, fullName: 'Utilisateur', reputation: 5.0 },
          createdAt: ad.createdAt || now.toISOString(),
          timeLimitMinutes: ad.timeLimitMinutes || 60,
          terms: ad.terms,
          minAmountPerTransaction: ad.minAmountPerTransaction ? parseFloat(ad.minAmountPerTransaction) : undefined,
          maxAmountPerTransaction: ad.maxAmountPerTransaction ? parseFloat(ad.maxAmountPerTransaction) : undefined,
          isExpired
        };
      });

      setAds(formattedAds);

    } catch (err: any) {
      console.error('❌ Erreur chargement annonces:', err);
      
      if (err.name === 'AbortError') {
        setError('Le chargement a pris trop de temps');
      } else if (err.response?.status === 404) {
        setError('Aucune annonce disponible');
      } else {
        setError('Impossible de charger les annonces');
      }
      
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [extractHydraMember, isAdmin]);

  useEffect(() => {
    loadAds();
    
    // Rafraîchir automatiquement toutes les 30 secondes
    const interval = setInterval(() => {
      loadAds();
    }, 30000);
    
    return () => clearInterval(interval);
  }, [loadAds]);

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
      
      // Si pas admin, seulement les actives
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
  // RENDU
  // ============================================

  if (loading && ads.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center py-20">
            <div className="spinner-border text-yellow-500" style={{width: '4rem', height: '4rem'}} role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <h3 className="text-gray-800 mt-4">Chargement du marché...</h3>
            <p className="text-gray-600">Récupération des annonces en cours</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Notifications */}
      <div className="fixed top-4 right-4 z-50 space-y-2 max-w-md">
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`p-4 rounded-lg shadow-lg transform transition-all duration-300 ${
              notification.type === 'success' ? 'bg-green-500 text-white' :
              notification.type === 'error' ? 'bg-red-500 text-white' :
              notification.type === 'warning' ? 'bg-yellow-500 text-black' :
              'bg-blue-500 text-white'
            }`}
          >
            <div className="flex items-start">
              <i className={`bi ${
                notification.type === 'success' ? 'bi-check-circle' :
                notification.type === 'error' ? 'bi-exclamation-circle' :
                notification.type === 'warning' ? 'bi-exclamation-triangle' :
                'bi-info-circle'
              } me-3 text-xl`}></i>
              <div className="flex-1">
                <div className="font-medium whitespace-pre-line">{notification.message}</div>
              </div>
              <button 
                className="ml-2 text-current opacity-70 hover:opacity-100"
                onClick={() => setNotifications(prev => prev.filter(n => n.id !== notification.id))}
              >
                <i className="bi bi-x-lg"></i>
              </button>
            </div>
          </div>
        ))}
      </div>

      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 text-white py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Marketplace Crypto P2P Maroc
          </h1>
          <p className="text-xl text-gray-300 mb-6 max-w-3xl mx-auto">
            {isAdmin ? 'Panel d\'administration des annonces' : 'Achetez et vendez des cryptomonnaies en MAD avec des particuliers de confiance'}
          </p>
          
          {/* Stats rapides */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
              <div className="text-2xl font-bold text-yellow-400">{ads.length}</div>
              <div className="text-gray-300 text-sm">Annonces totales</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
              <div className="text-2xl font-bold text-green-400">
                {ads.filter(a => a.status === 'active' && !a.isExpired).length}
              </div>
              <div className="text-gray-300 text-sm">Actives</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
              <div className="text-2xl font-bold text-red-400">
                {ads.filter(a => a.type === 'sell').length}
              </div>
              <div className="text-gray-300 text-sm">Ventes</div>
            </div>
            {isAdmin && (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
                <div className="text-2xl font-bold text-orange-400">
                  {ads.filter(a => a.status === 'pending').length}
                </div>
                <div className="text-gray-300 text-sm">En attente</div>
              </div>
            )}
          </div>
          
          {/* CTA Buttons */}
          {!isAuthenticated && (
            <div className="flex flex-col md:flex-row gap-4 justify-center mb-8">
              <Link 
                to="/register" 
                className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition shadow-lg"
              >
                🚀 S'inscrire Gratuitement
              </Link>
              <Link 
                to="/login" 
                className="px-8 py-3 border-2 border-yellow-500 text-yellow-500 font-bold rounded-lg hover:bg-yellow-500 hover:text-black transition"
              >
                🔑 Se Connecter
              </Link>
            </div>
          )}
          {isAdmin && (
            <div className="bg-yellow-500/20 border border-yellow-500 rounded-lg p-4 max-w-2xl mx-auto">
              <i className="bi bi-shield-check me-2"></i>
              <span className="font-semibold">Mode Administrateur activé</span>
              <p className="text-sm text-yellow-200 mt-1">
                Vous pouvez modifier le statut ou supprimer toutes les annonces
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            <i className="bi bi-filter me-2"></i>
            {isAdmin ? 'Filtres d\'administration' : 'Trouvez l\'offre parfaite'}
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
            {/* Recherche */}
            <div className="md:col-span-2">
              <label className="text-gray-700 mb-2 block font-medium">Rechercher</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="ID, crypto, banque, vendeur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>
            </div>
            
            {/* Type */}
            <div>
              <label className="text-gray-700 mb-2 block font-medium">Type</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <option value="all">Tous types</option>
                <option value="buy">Achat</option>
                <option value="sell">Vente</option>
              </select>
            </div>
            
            {/* Devise */}
            <div>
              <label className="text-gray-700 mb-2 block font-medium">Devise</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
              >
                <option value="all">Toutes</option>
                {uniqueCurrencies.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            
            {/* Statut (visible seulement pour admin) */}
            {isAdmin && (
              <div>
                <label className="text-gray-700 mb-2 block font-medium">Statut</label>
                <select
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
            
            {/* Trier par */}
            <div>
              <label className="text-gray-700 mb-2 block font-medium">Trier par</label>
              <div className="flex gap-2">
                <select
                  className="flex-1 p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                >
                  <option value="created">Date</option>
                  <option value="price">Prix</option>
                  <option value="amount">Montant</option>
                  <option value="reputation">Réputation</option>
                </select>
                <button
                  className="p-3 bg-gray-100 border border-gray-300 rounded-lg hover:bg-gray-200"
                  onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                  title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
                >
                  <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
                </button>
              </div>
            </div>
          </div>
          
          {/* Actions rapides admin */}
          {isAdmin && (
            <div className="mt-6 pt-6 border-t border-gray-200">
              <div className="flex flex-wrap gap-2">
                <button 
                  className="px-4 py-2 bg-green-500 text-white rounded-lg hover:bg-green-600 transition"
                  onClick={() => {
                    // Activer toutes les annonces sélectionnées
                    showNotification('info', 'Fonctionnalité en développement');
                  }}
                >
                  <i className="bi bi-check-circle me-2"></i>
                  Activer sélection
                </button>
                <button 
                  className="px-4 py-2 bg-yellow-500 text-white rounded-lg hover:bg-yellow-600 transition"
                  onClick={() => {
                    showNotification('info', 'Fonctionnalité en développement');
                  }}
                >
                  <i className="bi bi-pause-circle me-2"></i>
                  Suspendre sélection
                </button>
                <button 
                  className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition"
                  onClick={() => {
                    showNotification('info', 'Fonctionnalité en développement');
                  }}
                >
                  <i className="bi bi-trash me-2"></i>
                  Supprimer sélection
                </button>
              </div>
            </div>
          )}
          
          {/* Résultats */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-lg font-semibold text-gray-800">
                  {filteredAds.length} annonce{filteredAds.length !== 1 ? 's' : ''} trouvée{filteredAds.length !== 1 ? 's' : ''}
                </span>
                {searchTerm && (
                  <span className="text-gray-600 ml-2">
                    pour "{searchTerm}"
                  </span>
                )}
              </div>
              <div className="text-gray-600">
                <button 
                  className="text-blue-600 hover:text-blue-800"
                  onClick={loadAds}
                >
                  <i className="bi bi-arrow-clockwise me-1"></i>
                  Actualiser
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Liste des annonces */}
        {error ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <div className="max-w-md mx-auto">
              <i className="bi bi-exclamation-triangle text-5xl text-red-500 mb-4"></i>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Erreur de chargement</h3>
              <p className="text-gray-600 mb-6">{error}</p>
              <button 
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
                onClick={loadAds}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Réessayer
              </button>
            </div>
          </div>
        ) : filteredAds.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <div className="max-w-md mx-auto">
              <i className="bi bi-inbox text-5xl text-gray-400 mb-4"></i>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Aucune annonce trouvée</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || typeFilter !== 'all' || currencyFilter !== 'all' || statusFilter !== 'all'
                  ? 'Ajustez vos critères de recherche'
                  : 'Aucune annonce active pour le moment'}
              </p>
              <div className="space-x-3">
                {(searchTerm || typeFilter !== 'all' || currencyFilter !== 'all' || statusFilter !== 'all') && (
                  <button 
                    className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
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
                    className="px-6 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition"
                    onClick={() => navigate('/dashboard/ads/create')}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Créer une annonce
                  </button>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Grid des annonces */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAds.map((ad) => {
                const isUserAd = user && ad.user.id === user.id;
                const isSellAd = ad.type === 'sell';
                const statusBadge = getStatusBadge(ad.status);
                const isTransactionActive = activeTransactions.has(ad.id);
                const isAdModifying = modifyingAd === ad.id;
                
                return (
                  <div key={ad.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-300">
                    {/* En-tête avec badges */}
                    <div className="p-6 border-b border-gray-100">
                      <div className="flex justify-between items-start mb-4">
                        <div>
                          <div className="flex flex-wrap gap-2 mb-2">
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${ad.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                              {ad.type === 'buy' ? '🛒 ACHAT' : '💰 VENTE'}
                            </span>
                            <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${statusBadge.class}`}>
                              <i className={`bi ${statusBadge.icon} me-1`}></i>
                              {statusBadge.text}
                            </span>
                            {ad.isExpired && (
                              <span className="inline-block px-3 py-1 rounded-full text-sm font-semibold bg-gray-800 text-white">
                                <i className="bi bi-alarm me-1"></i>
                                Expiré
                              </span>
                            )}
                          </div>
                          <div className="text-sm text-gray-500">
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
                        <div className="text-right">
                          <div className="text-2xl font-bold text-blue-600">
                            {formatPrice(ad.price)} MAD
                          </div>
                          <div className="text-gray-500">/{ad.currency?.code}</div>
                        </div>
                      </div>
                      
                      {/* Titre */}
                      <h3 className="text-xl font-bold text-gray-900 mb-3">
                        {ad.type === 'buy' ? 'Achat de' : 'Vente de'} {ad.amount} {ad.currency?.code}
                      </h3>
                      
                      {/* Méthode de paiement */}
                      <div className="flex items-center text-gray-700 mb-3">
                        <i className="bi bi-bank text-gray-500 me-2"></i>
                        <span className="font-medium">{ad.paymentMethod}</span>
                      </div>
                      
                      {/* Conditions */}
                      {ad.terms && (
                        <div className="mb-4">
                          <div className="flex items-center text-gray-600 mb-1">
                            <i className="bi bi-chat-left-text me-2"></i>
                            <span className="text-sm font-medium">Conditions</span>
                          </div>
                          <p className="text-gray-600 text-sm line-clamp-2">
                            {ad.terms}
                          </p>
                        </div>
                      )}
                    </div>
                    
                    {/* Infos transaction */}
                    <div className="p-6 bg-gray-50 rounded-b-xl">
                      {/* Totaux */}
                      <div className="mb-4">
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-gray-600">Montant total</span>
                          <span className="text-xl font-bold text-gray-900">
                            {calculateTotal(ad).toLocaleString('fr-MA')} MAD
                          </span>
                        </div>
                        
                        {/* Limites */}
                        {(ad.minAmountPerTransaction || ad.maxAmountPerTransaction) && (
                          <div className="text-sm text-gray-500">
                            <i className="bi bi-sliders me-1"></i>
                            {ad.minAmountPerTransaction ? `Min: ${ad.minAmountPerTransaction}` : 'Sans min'} / 
                            {ad.maxAmountPerTransaction ? ` Max: ${ad.maxAmountPerTransaction}` : 'Sans max'}
                          </div>
                        )}
                      </div>
                      
                      {/* Vendeur/Acheteur */}
                      <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                        <div>
                          <div className="text-sm text-gray-600">
                            {ad.type === 'buy' ? 'Acheteur' : 'Vendeur'}
                          </div>
                          <div className="flex items-center">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center me-2">
                              <i className="bi bi-person text-blue-600"></i>
                            </div>
                            <div>
                              <div className="font-semibold text-gray-900">
                                {ad.user?.fullName || 'Anonyme'}
                              </div>
                              <div className="flex items-center text-yellow-500 text-sm">
                                <i className="bi bi-star-fill me-1"></i>
                                {ad.user?.reputation?.toFixed(1) || '5.0'}
                                {ad.user?.isActive === false && (
                                  <span className="ms-2 text-red-500">
                                    <i className="bi bi-person-x me-1"></i>
                                    Inactif
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {/* ID annonce */}
                        <div className="text-right">
                          <div className="text-sm text-gray-600">ID</div>
                          <div className="font-mono text-gray-800">#{ad.id}</div>
                        </div>
                      </div>
                      
                      {/* Boutons d'action */}
                      <div className="mt-6 space-y-3">
                        {/* Boutons admin */}
                        {isAdmin && (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mb-3">
                            {ad.status !== 'active' && ad.status !== 'expired' && (
                              <button 
                                className="px-3 py-2 bg-green-500 text-white text-sm rounded-lg hover:bg-green-600 transition disabled:opacity-50"
                                onClick={() => handleAdminAction(ad.id, 'activate')}
                                disabled={isAdModifying}
                                title="Activer l'annonce"
                              >
                                {isAdModifying ? (
                                  <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                  <i className="bi bi-play-circle"></i>
                                )}
                              </button>
                            )}
                            {ad.status === 'active' && !ad.isExpired && (
                              <button 
                                className="px-3 py-2 bg-yellow-500 text-white text-sm rounded-lg hover:bg-yellow-600 transition disabled:opacity-50"
                                onClick={() => handleAdminAction(ad.id, 'pause')}
                                disabled={isAdModifying}
                                title="Mettre en pause"
                              >
                                {isAdModifying ? (
                                  <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                  <i className="bi bi-pause-circle"></i>
                                )}
                              </button>
                            )}
                            <button 
                              className="px-3 py-2 bg-red-500 text-white text-sm rounded-lg hover:bg-red-600 transition disabled:opacity-50"
                              onClick={() => handleAdminAction(ad.id, 'suspend')}
                              disabled={isAdModifying}
                              title="Suspendre l'annonce"
                            >
                              {isAdModifying ? (
                                <span className="spinner-border spinner-border-sm"></span>
                              ) : (
                                <i className="bi bi-slash-circle"></i>
                              )}
                            </button>
                            <button 
                              className="px-3 py-2 bg-gray-800 text-white text-sm rounded-lg hover:bg-gray-900 transition disabled:opacity-50"
                              onClick={() => handleDeleteAd(ad.id)}
                              disabled={isAdModifying}
                              title="Supprimer définitivement"
                            >
                              {isAdModifying ? (
                                <span className="spinner-border spinner-border-sm"></span>
                              ) : (
                                <i className="bi bi-trash"></i>
                              )}
                            </button>
                          </div>
                        )}
                        
                        {/* Boutons utilisateur */}
                        {isAuthenticated ? (
                          <>
                            {/* Si ce n'est PAS notre annonce ET annonce active */}
                            {!isUserAd && ad.status === 'active' && !ad.isExpired && (
                              <>
                                {/* Pour les annonces de VENTE : bouton ACHETER */}
                                {isSellAd && (
                                  <button 
                                    className="w-full py-3 bg-gradient-to-r from-green-600 to-green-700 text-white font-bold rounded-lg hover:from-green-700 hover:to-green-800 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleBuyAd(ad)}
                                    disabled={isTransactionActive || isAdModifying}
                                    title={`Acheter ${ad.amount} ${ad.currency.code} pour ${calculateTotal(ad)} MAD`}
                                  >
                                    {isTransactionActive ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Création transaction...
                                      </>
                                    ) : (
                                      <>
                                        🛒 Acheter maintenant
                                        <br />
                                        <small className="text-xs opacity-75">
                                          Total: {calculateTotal(ad).toLocaleString('fr-MA')} MAD
                                        </small>
                                      </>
                                    )}
                                  </button>
                                )}
                                
                                {/* Pour les annonces d'ACHAT : bouton VENDRE */}
                                {!isSellAd && (
                                  <button 
                                    className="w-full py-3 bg-gradient-to-r from-orange-600 to-orange-700 text-white font-bold rounded-lg hover:from-orange-700 hover:to-orange-800 transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                                    onClick={() => handleBuyAd(ad)}
                                    disabled={isTransactionActive || isAdModifying}
                                    title={`Vendre ${ad.amount} ${ad.currency.code} pour ${calculateTotal(ad)} MAD`}
                                  >
                                    {isTransactionActive ? (
                                      <>
                                        <span className="spinner-border spinner-border-sm me-2"></span>
                                        Création transaction...
                                      </>
                                    ) : (
                                      <>
                                        💰 Vendre à cet acheteur
                                        <br />
                                        <small className="text-xs opacity-75">
                                          Total: {calculateTotal(ad).toLocaleString('fr-MA')} MAD
                                        </small>
                                      </>
                                    )}
                                  </button>
                                )}
                              </>
                            )}
                            
                            {/* Boutons communs */}
                            <div className="grid grid-cols-2 gap-2">
                              <button 
                                className="py-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-medium rounded-lg hover:from-blue-700 hover:to-blue-800 transition disabled:opacity-50"
                                onClick={() => handleContactSeller(ad)}
                                disabled={isAdModifying}
                              >
                                <i className="bi bi-chat me-2"></i>
                                Contacter
                              </button>
                              
                              <button 
                                className="py-2 border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition disabled:opacity-50"
                                onClick={() => handleCreateSimilarAd(ad)}
                                disabled={isAdModifying}
                              >
                                <i className="bi bi-copy me-2"></i>
                                Similaire
                              </button>
                            </div>
                          </>
                        ) : (
                          <>
                            <button 
                              className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition shadow-md"
                              onClick={() => {
                                showNotification('info', 'Connectez-vous pour échanger !');
                                navigate('/login', { state: { from: '/market' } });
                              }}
                            >
                              🔐 Se connecter pour échanger
                            </button>
                            <div className="text-center text-gray-500 text-sm">
                              <i className="bi bi-shield-check me-1"></i>
                              Gratuit • Sécurisé • Rapide
                            </div>
                          </>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            
            {/* Call to Action pour non connectés */}
            {!isAuthenticated && filteredAds.length > 0 && (
              <div className="mt-12 bg-gradient-to-r from-blue-900 to-purple-800 rounded-2xl p-8 text-center text-white shadow-xl">
                <div className="max-w-3xl mx-auto">
                  <h3 className="text-2xl font-bold mb-4">
                    Prêt à commencer à échanger ?
                  </h3>
                  <p className="text-blue-100 mb-6">
                    Rejoignez {filteredAds.length} annonces actives et des milliers d'utilisateurs 
                    qui échangent en toute confiance.
                  </p>
                  <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <Link 
                      to="/register" 
                      className="px-8 py-3 bg-white text-blue-900 font-bold rounded-lg hover:bg-gray-100 transition shadow-lg"
                    >
                      <i className="bi bi-rocket me-2"></i>
                      Créer un compte gratuit
                    </Link>
                    <Link 
                      to="/login" 
                      className="px-8 py-3 border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-blue-900 transition"
                    >
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Se connecter
                    </Link>
                  </div>
                </div>
              </div>
            )}
            
            {/* Statistiques */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="text-3xl font-bold text-green-600">
                  {ads.filter(a => a.type === 'buy').length}
                </div>
                <div className="text-gray-600">Demandes d'achat</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="text-3xl font-bold text-red-600">
                  {ads.filter(a => a.type === 'sell').length}
                </div>
                <div className="text-gray-600">Offres de vente</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {ads.filter(a => a.status === 'active').length}
                </div>
                <div className="text-gray-600">Annonces actives</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {ads.reduce((total, ad) => total + calculateTotal(ad), 0).toLocaleString('fr-MA').split(',')[0]}K
                </div>
                <div className="text-gray-600">MAD en circulation</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PublicAdList;