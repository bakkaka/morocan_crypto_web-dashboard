// src/components/AdList.tsx - VERSION CORRIGÉE
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

interface User {
  id: number;
  fullName: string;
  reputation: number;
  email?: string;
  phone?: string;
  avatar?: string;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  type: 'crypto' | 'fiat';
}

interface Ad {
  id: number;
  '@id'?: string;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  currency: Currency;
  status: 'active' | 'paused' | 'completed' | 'cancelled' | 'pending' | 'expired';
  paymentMethod: string;
  user: User;
  createdAt: string;
  updatedAt?: string;
  minAmountPerTransaction?: number;
  maxAmountPerTransaction?: number;
  timeLimitMinutes: number;
  terms?: string;
  isExpired?: boolean;
  expiresAt?: string;
}

interface AdListProps {
  filter?: 'all' | 'my-ads' | 'moderation';
}

interface Notification {
  type: 'success' | 'error' | 'info' | 'warning';
  message: string;
  id: number;
}

interface TransactionData {
  ad: string;
  buyer: string;
  seller: string;
  usdtAmount: number;
  fiatAmount: number;
  status: string;
}

const AdList: React.FC<AdListProps> = ({ filter = 'all' }) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price' | 'amount' | 'created' | 'reputation'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [activeTransactions, setActiveTransactions] = useState<Set<number>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [modifyingAd, setModifyingAd] = useState<number | null>(null);
  const { user, isAdmin, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // ============================================
  // FONCTIONS UTILITAIRES
  // ============================================

  const extractHydraMember = useCallback((data: any): any[] => {
    if (data?.member && Array.isArray(data.member)) return data.member;
    if (data?.['hydra:member'] && Array.isArray(data['hydra:member'])) return data['hydra:member'];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  }, []);

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

  const getStatusBadge = (status: string, isExpired?: boolean) => {
    if (isExpired) {
      return { class: 'bg-dark text-white', text: 'Expiré', icon: 'bi-alarm' };
    }
    
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
  // FONCTION D'EXPIRATION - CRITIQUE
  // ============================================

  const calculateExpiration = (ad: any): { isExpired: boolean; expiresAt: Date | null } => {
    try {
      if (!ad.createdAt || !ad.timeLimitMinutes) {
        return { isExpired: false, expiresAt: null };
      }
      
      const createdAt = new Date(ad.createdAt);
      const timeLimitMs = (ad.timeLimitMinutes || 60) * 60000;
      const expiresAt = new Date(createdAt.getTime() + timeLimitMs);
      const now = new Date();
      
      const isExpired = expiresAt < now && ad.status === 'active';
      
      return { isExpired, expiresAt };
    } catch (error) {
      console.error('Erreur calcul expiration:', error);
      return { isExpired: false, expiresAt: null };
    }
  };

  const formatTimeRemaining = (expiresAt: Date | null): string => {
    if (!expiresAt) return '';
    
    const now = new Date();
    const diffMs = expiresAt.getTime() - now.getTime();
    
    if (diffMs <= 0) return 'Expiré';
    
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);
    
    if (diffDays > 0) return `Expire dans ${diffDays}j`;
    if (diffHours > 0) return `Expire dans ${diffHours}h`;
    if (diffMins > 0) return `Expire dans ${diffMins}min`;
    
    return 'Expire bientôt';
  };

  // ============================================
  // CHARGEMENT DES ANNONCES
  // ============================================

  const loadAds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let endpoint = '/ads';
      let params: any = { 
        'order[createdAt]': 'desc',
        page: 1,
        itemsPerPage: 100
      };

      if (filter === 'my-ads' && user) {
        params.user = user.id;
        delete params.status;
      } else if (filter === 'moderation' && isAdmin) {
        delete params.status;
      } else if (filter === 'all') {
        params.status = 'active';
      }

      console.log('🔄 Chargement des annonces...', { filter, params });

      const response = await api.get(endpoint, { params });
      const adsData = extractHydraMember(response.data);
      
      console.log('✅ Annonces chargées:', adsData.length);

      // Traitement des annonces avec calcul d'expiration
      const formattedAds: Ad[] = adsData.map((ad: any) => {
        const { isExpired, expiresAt } = calculateExpiration(ad);
        const finalStatus = isExpired ? 'expired' : (ad.status || 'active');
        
        // Formater l'utilisateur correctement
        const userData = ad.user || {};
        const phone = userData.phone || userData.phoneNumber || userData.telephone || '';
        
        return {
          id: ad.id,
          '@id': ad['@id'],
          type: ad.type || 'buy',
          amount: parseFloat(ad.amount) || 0,
          price: parseFloat(ad.price) || 0,
          currency: ad.currency || { id: 0, code: 'USDT', name: 'Tether USD', type: 'crypto' },
          status: finalStatus,
          paymentMethod: ad.paymentMethod || 'Non spécifié',
          user: {
            id: userData.id || 0,
            fullName: userData.fullName || userData.full_name || userData.name || 'Utilisateur',
            reputation: parseFloat(userData.reputation) || 5.0,
            email: userData.email || '',
            phone: phone,
            avatar: userData.avatar || userData.profileImage || ''
          },
          createdAt: ad.createdAt || new Date().toISOString(),
          updatedAt: ad.updatedAt,
          minAmountPerTransaction: ad.minAmountPerTransaction ? parseFloat(ad.minAmountPerTransaction) : undefined,
          maxAmountPerTransaction: ad.maxAmountPerTransaction ? parseFloat(ad.maxAmountPerTransaction) : undefined,
          timeLimitMinutes: ad.timeLimitMinutes || 60,
          terms: ad.terms,
          isExpired,
          expiresAt: expiresAt?.toISOString()
        };
      });

      setAds(formattedAds);

    } catch (err: any) {
      console.error('❌ Erreur chargement annonces:', err);
      setError(err.response?.data?.detail || 'Impossible de charger les annonces');
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [filter, user, isAdmin, extractHydraMember]);

  useEffect(() => {
    loadAds();
    
    // Rafraîchir automatiquement toutes les minutes pour l'expiration
    const interval = setInterval(() => {
      if (filter === 'all' || filter === 'my-ads') {
        loadAds();
      }
    }, 60000);
    
    return () => clearInterval(interval);
  }, [loadAds, filter]);

  // ============================================
  // FONCTIONS DE TRANSACTION
  // ============================================

  const handleBuyAd = async (ad: Ad) => {
    if (!isAuthenticated || !user) {
      showNotification('warning', 'Connectez-vous pour échanger !');
      navigate('/login', { state: { from: '/dashboard/ads' } });
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

    if (ad.isExpired || ad.status !== 'active') {
      showNotification('error', 'Cette annonce n\'est plus disponible');
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
      
      const transactionData: TransactionData = {
        ad: ad['@id'] || `/api/ads/${ad.id}`,
        buyer: ad.type === 'sell' ? `/api/users/${user.id}` : `/api/users/${ad.user.id}`,
        seller: ad.type === 'sell' ? `/api/users/${ad.user.id}` : `/api/users/${user.id}`,
        usdtAmount: ad.amount,
        fiatAmount: calculateTotal(ad),
        status: 'pending'
      };

      console.log('🔄 Création de transaction:', transactionData);

      const endpoints = ['/api/transactions', '/transactions'];
      let response = null;
      
      for (const endpoint of endpoints) {
        try {
          response = await api.post(endpoint, transactionData);
          console.log(`✅ Transaction créée via ${endpoint}`);
          break;
        } catch (err: any) {
          console.log(`❌ ${endpoint} échoué:`, err.response?.status || err.message);
          continue;
        }
      }

      if (!response) {
        throw new Error('Aucun endpoint transaction ne fonctionne');
      }

      const transaction = response.data;
      
      showNotification('success', 
        `✅ Transaction créée !\nID: ${transaction.id}\nRedirection vers la page de paiement...`
      );
      
      // Rediriger vers la messagerie avec la nouvelle transaction
      setTimeout(() => {
        navigate('/dashboard/messages', { 
          state: { 
            transactionId: transaction.id,
            autoFocus: true
          }
        });
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
    }
  };

  // ============================================
  // FONCTIONS ADMIN/MODÉRATION
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

      await api.patch(`/ads/${adId}`, { status: newStatus });
      
      showNotification('success', `✅ Annonce ${actionText} avec succès !`);
      
      setTimeout(() => loadAds(), 1000);
      
    } catch (err: any) {
      console.error(`❌ Erreur ${action} annonce:`, err);
      
      let errorMessage = `Erreur lors de l'action ${action}`;
      if (err.response?.status === 404) errorMessage = 'Annonce non trouvée';
      if (err.response?.status === 403) errorMessage = 'Permission refusée';
      if (err.response?.data?.detail) errorMessage = err.response.data.detail;
      
      showNotification('error', errorMessage);
    } finally {
      setModifyingAd(null);
    }
  };

  const handleDeleteAd = async (adId: number) => {
    if (!isAdmin && filter !== 'my-ads') {
      showNotification('error', 'Action non autorisée');
      return;
    }

    if (!window.confirm('Êtes-vous sûr de vouloir supprimer définitivement cette annonce ?')) {
      return;
    }

    try {
      setModifyingAd(adId);
      await api.delete(`/ads/${adId}`);
      
      showNotification('success', '✅ Annonce supprimée avec succès !');
      setTimeout(() => loadAds(), 1000);
      
    } catch (err: any) {
      console.error('❌ Erreur suppression annonce:', err);
      showNotification('error', 'Erreur lors de la suppression');
    } finally {
      setModifyingAd(null);
    }
  };

  const handleToggleStatus = async (adId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await api.patch(`/ads/${adId}`, { status: newStatus });
      
      showNotification('success', `✅ Annonce ${newStatus === 'active' ? 'activée' : 'mise en pause'} !`);
      loadAds();
    } catch (err: any) {
      console.error('❌ Erreur modification statut:', err);
      showNotification('error', 'Erreur lors de la modification');
    }
  };

  // ============================================
  // FONCTIONS DE MESSAGERIE - CORRIGÉES
  // ============================================

  const handleContactSeller = (ad: Ad) => {
    if (!isAuthenticated) {
      showNotification('warning', 'Connectez-vous pour contacter !');
      navigate('/login', { state: { from: '/dashboard/ads' } });
      return;
    }

    if (ad.user.id === user?.id) {
      showNotification('info', 'Vous ne pouvez pas vous contacter vous-même');
      return;
    }

    // Créer d'abord une transaction
    handleBuyAd(ad);
  };

  // FONCTION WHATSAPP CORRIGÉE
  const handleWhatsAppContact = (ad: Ad) => {
    // Vérifier si l'annonce a un utilisateur avec un numéro
    const userPhone = ad.user?.phone;
    
    if (!userPhone) {
      showNotification('warning', 'Aucun numéro WhatsApp disponible pour ce vendeur');
      return;
    }
    
    // Nettoyer le numéro de téléphone
    const cleanPhone = userPhone
      .replace(/\s+/g, '') // Enlever les espaces
      .replace(/^\+?212/, '212') // Standardiser le code pays
      .replace(/^0/, '212'); // Remplacer 0 par 212
    
    console.log('📱 Numéro WhatsApp nettoyé:', cleanPhone);
    
    // Créer le message
    const message = `Bonjour ${ad.user.fullName},\n\nJe suis intéressé par votre annonce #${ad.id} :\n• ${ad.type === 'buy' ? 'Achat' : 'Vente'} de ${ad.amount} ${ad.currency.code}\n• Prix : ${ad.price} MAD/${ad.currency.code}\n• Total : ${calculateTotal(ad).toLocaleString('fr-MA')} MAD\n\nPouvez-vous me contacter pour discuter de cette transaction ?\n\nCordialement.`;
    
    // Construire l'URL WhatsApp
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/${cleanPhone}?text=${encodedMessage}`;
    
    console.log('🔗 URL WhatsApp:', whatsappUrl);
    
    // Ouvrir WhatsApp dans un nouvel onglet
    window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  };

  // ============================================
  // FONCTIONS POUR CRÉER UNE TRANSACTION RAPIDE
  // ============================================

  const createQuickTransaction = async (ad: Ad) => {
    if (!isAuthenticated || !user) {
      showNotification('warning', 'Connectez-vous pour créer une transaction !');
      navigate('/login', { state: { from: '/dashboard/ads' } });
      return;
    }

    try {
      const transactionData = {
        ad: `/api/ads/${ad.id}`,
        buyer: ad.type === 'sell' ? `/api/users/${user.id}` : `/api/users/${ad.user.id}`,
        seller: ad.type === 'sell' ? `/api/users/${ad.user.id}` : `/api/users/${user.id}`,
        usdtAmount: ad.amount,
        fiatAmount: calculateTotal(ad),
        status: 'pending'
      };

      console.log('🔄 Création transaction rapide:', transactionData);

      const response = await api.post('/transactions', transactionData);
      
      if (response.data) {
        showNotification('success', '✅ Transaction créée avec succès !');
        
        // Rediriger vers la messagerie
        setTimeout(() => {
          navigate('/dashboard/messages', { 
            state: { 
              transactionId: response.data.id,
              autoFocus: true
            }
          });
        }, 1000);
      }
      
    } catch (err: any) {
      console.error('❌ Erreur création transaction:', err);
      showNotification('error', 'Erreur lors de la création de la transaction');
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
      const matchesStatus = statusFilter === 'all' || ad.status === statusFilter;
      
      if (filter === 'my-ads') {
        return matchesSearch && matchesType && matchesStatus && ad.user?.id === user?.id;
      }
      
      if (filter === 'moderation') {
        return matchesSearch && matchesType && matchesStatus && ad.status !== 'active';
      }
      
      return matchesSearch && matchesType && matchesStatus;
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

  const uniqueStatuses = Array.from(
    new Set(ads.map(ad => ad.status).filter(Boolean))
  ).sort();

  const getHeaderTitle = () => {
    switch (filter) {
      case 'my-ads': return 'Mes Annonces';
      case 'moderation': return 'Modération des Annonces';
      default: return 'Marketplace P2P';
    }
  };

  const getHeaderDescription = () => {
    switch (filter) {
      case 'my-ads': return 'Gérez toutes vos annonces de vente et d\'achat';
      case 'moderation': return 'Annonces en attente de validation';
      default: return 'Parcourez toutes les annonces actives de la plateforme';
    }
  };

  // ============================================
  // RENDU
  // ============================================

  if (loading && ads.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center py-20">
            <div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}} role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <h3 className="text-gray-800 mt-4">Chargement des annonces...</h3>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
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

      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h3 fw-bold">
            <i className="bi bi-megaphone me-2"></i>
            {getHeaderTitle()}
          </h2>
          <p className="text-muted mb-0">{getHeaderDescription()}</p>
        </div>

        <div className="d-flex gap-2">
          {filter === 'all' && isAuthenticated && !isAdmin && (
            <Link to="/dashboard/ads/create" className="btn btn-primary">
              <i className="bi bi-plus-circle me-2"></i>
              Créer une Annonce
            </Link>
          )}
          <button className="btn btn-outline-secondary" onClick={loadAds}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Actualiser
          </button>
          {filter === 'all' && (
            <Link to="/market" className="btn btn-outline-primary">
              <i className="bi bi-shop me-2"></i>
              Marketplace Public
            </Link>
          )}
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rechercher par crypto, banque, vendeur ou description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    className="btn btn-outline-secondary" 
                    type="button"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>
            
            <div className="col-md-2">
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
            
            {(filter === 'moderation' || filter === 'my-ads' || isAdmin) && (
              <div className="col-md-2">
                <select
                  className="form-select"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                >
                  <option value="all">Tous statuts</option>
                  {uniqueStatuses.map(status => {
                    const badge = getStatusBadge(status);
                    return (
                      <option key={status} value={status}>
                        {badge.text}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}
            
            <div className="col-md-1">
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
            </div>
            
            <div className="col-md-1">
              <button
                className="btn btn-outline-secondary w-100"
                onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
                title={sortOrder === 'asc' ? 'Croissant' : 'Décroissant'}
              >
                <i className={`bi bi-arrow-${sortOrder === 'asc' ? 'up' : 'down'}`}></i>
              </button>
            </div>
          </div>
          
          <div className="mt-3 d-flex justify-content-between align-items-center">
            <span className="badge bg-primary fs-6">
              {filteredAds.length} annonce{filteredAds.length !== 1 ? 's' : ''}
            </span>
            <div>
              {filter === 'moderation' && (
                <span className="badge bg-warning fs-6 me-2">En attente</span>
              )}
              {filter === 'all' && (
                <span className="badge bg-success fs-6">
                  {ads.filter(a => a.status === 'active' && !a.isExpired).length} actives
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Liste des annonces */}
      {filteredAds.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-inbox fs-1 text-muted mb-3"></i>
            <h5 className="text-muted">Aucune annonce trouvée</h5>
            <p className="text-muted">
              {searchTerm || typeFilter !== 'all' || statusFilter !== 'all'
                ? 'Aucune annonce ne correspond à vos critères de recherche.'
                : filter === 'my-ads'
                  ? 'Vous n\'avez pas encore créé d\'annonce.'
                  : filter === 'moderation'
                    ? 'Aucune annonce en attente de modération.'
                    : 'Aucune annonce active pour le moment.'
              }
            </p>
            {filter === 'my-ads' && (
              <Link to="/dashboard/ads/create" className="btn btn-primary mt-2">
                <i className="bi bi-plus-circle me-2"></i>
                Créer ma première annonce
              </Link>
            )}
            {filter === 'all' && (
              <div className="mt-3">
                <Link to="/dashboard/ads/create" className="btn btn-outline-primary me-2">
                  <i className="bi bi-plus-circle me-2"></i>
                  Créer une annonce
                </Link>
                <Link to="/market" className="btn btn-primary">
                  <i className="bi bi-shop me-2"></i>
                  Voir le marketplace public
                </Link>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="row g-4">
            {filteredAds.map((ad) => {
              const isUserAd = user && ad.user.id === user.id;
              const isSellAd = ad.type === 'sell';
              const statusBadge = getStatusBadge(ad.status, ad.isExpired);
              const isTransactionActive = activeTransactions.has(ad.id);
              const isAdModifying = modifyingAd === ad.id;
              const isActiveAndNotExpired = ad.status === 'active' && !ad.isExpired;
              const expiresAt = ad.expiresAt ? new Date(ad.expiresAt) : null;
              
              return (
                <div key={ad.id} className="col-xl-4 col-md-6">
                  <div className={`card h-100 shadow-sm hover-shadow transition-all border-${ad.type === 'buy' ? 'success' : 'primary'} ${ad.isExpired ? 'border-dark' : ad.status !== 'active' ? 'border-warning' : ''}`}>
                    {/* En-tête */}
                    <div className="card-header d-flex justify-content-between align-items-center">
                      <div>
                        <span className={`badge ${ad.type === 'buy' ? 'bg-success' : 'bg-primary'}`}>
                          {ad.type === 'buy' ? '🛒 ACHAT' : '💰 VENTE'}
                        </span>
                        <span className={`badge ms-2 ${statusBadge.class}`}>
                          <i className={`bi ${statusBadge.icon} me-1`}></i>
                          {statusBadge.text}
                        </span>
                        {ad.isExpired && expiresAt && (
                          <span className="badge ms-2 bg-danger">
                            <i className="bi bi-clock-history me-1"></i>
                            Expiré
                          </span>
                        )}
                      </div>
                      <div className="text-end">
                        <div className="fw-bold fs-5">
                          {formatPrice(ad.price)} MAD
                          <small className="text-muted ms-1">/{ad.currency?.code || 'USDT'}</small>
                        </div>
                        <small className="text-muted">
                          {formatDate(ad.createdAt)}
                        </small>
                      </div>
                    </div>
                    
                    {/* Corps */}
                    <div className="card-body">
                      <div className="mb-3">
                        <h5 className="card-title mb-2">
                          {ad.type === 'buy' ? 'Achat de' : 'Vente de'} {ad.amount} {ad.currency?.code || 'USDT'}
                        </h5>
                        <div className="text-muted small mb-2">
                          <i className="bi bi-credit-card me-1"></i>
                          {ad.paymentMethod || 'Méthode non spécifiée'}
                        </div>
                        
                        {/* Indicateur d'expiration */}
                        {expiresAt && !ad.isExpired && (
                          <div className="alert alert-warning alert-sm py-1 px-2 mb-2 d-flex align-items-center">
                            <i className="bi bi-clock me-2"></i>
                            <small>{formatTimeRemaining(expiresAt)}</small>
                          </div>
                        )}
                        
                        {ad.terms && (
                          <p className="card-text text-muted mt-2 small">
                            <i className="bi bi-chat-left-text me-1"></i>
                            {ad.terms.length > 100 ? ad.terms.substring(0, 100) + '...' : ad.terms}
                          </p>
                        )}
                      </div>

                      {/* Totaux et limites */}
                      <div className="mb-3">
                        <div className="row">
                          <div className="col-6">
                            <small className="text-muted d-block">Montant total</small>
                            <strong className="fs-4 text-primary">
                              {calculateTotal(ad).toLocaleString('fr-MA')} MAD
                            </strong>
                          </div>
                          <div className="col-6">
                            <small className="text-muted d-block">Limites</small>
                            <div className="small">
                              {ad.minAmountPerTransaction ? `Min: ${ad.minAmountPerTransaction}` : 'Sans min'} / 
                              {ad.maxAmountPerTransaction ? ` Max: ${ad.maxAmountPerTransaction}` : 'Sans max'}
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Vendeur/Acheteur */}
                      <div className="d-flex justify-content-between align-items-center border-top pt-3">
                        <div>
                          <small className="text-muted d-block">
                            {ad.type === 'buy' ? 'Acheteur' : 'Vendeur'}
                          </small>
                          <div className="fw-bold">
                            <i className="bi bi-person-circle me-1"></i>
                            {ad.user?.fullName || 'Utilisateur'}
                            {isUserAd && <span className="badge bg-info ms-2">Vous</span>}
                          </div>
                          <div className="small">
                            <span className="text-warning">
                              ⭐ {ad.user?.reputation?.toFixed(1) || '5.0'}
                            </span>
                            {ad.user?.phone && (
                              <span className="ms-2 text-success">
                                <i className="bi bi-whatsapp"></i> Disponible
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="text-end">
                          <small className="text-muted d-block">ID Annonce</small>
                          <strong className="text-dark">#{ad.id}</strong>
                        </div>
                      </div>
                    </div>
                    
                    {/* Pied de carte - BOUTONS D'ACTION */}
                    <div className="card-footer bg-transparent">
                      <div className="d-flex flex-wrap gap-2">
                        {/* Bouton Acheter/Vendre pour marketplace */}
                        {filter === 'all' && isActiveAndNotExpired && !isUserAd && isAuthenticated && (
                          <button 
                            className={`btn btn-sm flex-fill ${isSellAd ? 'btn-success' : 'btn-warning'}`}
                            onClick={() => handleBuyAd(ad)}
                            disabled={isTransactionActive || isAdModifying}
                            title={isSellAd ? `Acheter ${ad.amount} ${ad.currency.code}` : `Vendre ${ad.amount} ${ad.currency.code}`}
                          >
                            {isTransactionActive ? (
                              <>
                                <span className="spinner-border spinner-border-sm me-2"></span>
                                Création...
                              </>
                            ) : (
                              <>
                                <i className={`bi ${isSellAd ? 'bi-cart-check' : 'bi-cash'} me-1`}></i>
                                {isSellAd ? 'Acheter maintenant' : 'Vendre maintenant'}
                                <br />
                                <small className="opacity-75">{calculateTotal(ad).toLocaleString('fr-MA')} MAD</small>
                              </>
                            )}
                          </button>
                        )}
                        
                        {/* Boutons pour mes annonces */}
                        {filter === 'my-ads' && (
                          <>
                            {ad.status === 'active' && !ad.isExpired && (
                              <button 
                                className="btn btn-outline-warning btn-sm"
                                onClick={() => handleToggleStatus(ad.id, ad.status)}
                                title="Mettre en pause"
                                disabled={isAdModifying}
                              >
                                {isAdModifying ? (
                                  <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                  <i className="bi bi-pause"></i>
                                )}
                              </button>
                            )}
                            {ad.status === 'paused' && (
                              <button 
                                className="btn btn-outline-success btn-sm"
                                onClick={() => handleToggleStatus(ad.id, ad.status)}
                                title="Activer"
                                disabled={isAdModifying}
                              >
                                {isAdModifying ? (
                                  <span className="spinner-border spinner-border-sm"></span>
                                ) : (
                                  <i className="bi bi-play"></i>
                                )}
                              </button>
                            )}
                            <button 
                              className="btn btn-outline-info btn-sm"
                              onClick={() => navigate(`/dashboard/ads/edit/${ad.id}`)}
                              title="Modifier"
                              disabled={isAdModifying}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button 
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleDeleteAd(ad.id)}
                              title="Supprimer"
                              disabled={isAdModifying}
                            >
                              {isAdModifying ? (
                                <span className="spinner-border spinner-border-sm"></span>
                              ) : (
                                <i className="bi bi-trash"></i>
                              )}
                            </button>
                          </>
                        )}
                        
                        {/* Boutons de modération pour admin */}
                        {filter === 'moderation' && isAdmin && (
                          <>
                            <button 
                              className="btn btn-success btn-sm flex-fill"
                              onClick={() => handleAdminAction(ad.id, 'approve')}
                              disabled={isAdModifying}
                            >
                              {isAdModifying ? (
                                <span className="spinner-border spinner-border-sm me-1"></span>
                              ) : (
                                <i className="bi bi-check-lg me-1"></i>
                              )}
                              Approuver
                            </button>
                            <button 
                              className="btn btn-danger btn-sm flex-fill"
                              onClick={() => handleAdminAction(ad.id, 'reject')}
                              disabled={isAdModifying}
                            >
                              {isAdModifying ? (
                                <span className="spinner-border spinner-border-sm me-1"></span>
                              ) : (
                                <i className="bi bi-x-lg me-1"></i>
                              )}
                              Rejeter
                            </button>
                          </>
                        )}
                        
                        {/* Boutons admin sur toutes les annonces */}
                        {isAdmin && filter !== 'moderation' && (
                          <>
                            {ad.status !== 'active' && ad.status !== 'expired' && (
                              <button 
                                className="btn btn-outline-success btn-sm"
                                onClick={() => handleAdminAction(ad.id, 'activate')}
                                disabled={isAdModifying}
                                title="Activer"
                              >
                                <i className="bi bi-play"></i>
                              </button>
                            )}
                            {ad.status === 'active' && !ad.isExpired && (
                              <button 
                                className="btn btn-outline-warning btn-sm"
                                onClick={() => handleAdminAction(ad.id, 'pause')}
                                disabled={isAdModifying}
                                title="Mettre en pause"
                              >
                                <i className="bi bi-pause"></i>
                              </button>
                            )}
                            <button 
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleDeleteAd(ad.id)}
                              disabled={isAdModifying}
                              title="Supprimer"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </>
                        )}
                        
                        {/* Boutons Contact pour toutes les annonces (sauf les siennes) */}
                        {isAuthenticated && !isUserAd && filter === 'all' && (
                          <div className="d-flex gap-1">
                            <button 
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => handleContactSeller(ad)}
                              title="Créer une transaction et discuter"
                              disabled={isTransactionActive}
                            >
                              {isTransactionActive ? (
                                <span className="spinner-border spinner-border-sm"></span>
                              ) : (
                                <>
                                  <i className="bi bi-chat me-1"></i>
                                  Discuter
                                </>
                              )}
                            </button>
                            <button 
                              className="btn btn-outline-success btn-sm"
                              onClick={() => handleWhatsAppContact(ad)}
                              title="Contacter sur WhatsApp"
                              disabled={!ad.user?.phone}
                            >
                              <i className="bi bi-whatsapp"></i>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Statistiques */}
          {ads.length > 0 && (
            <div className="row mt-4">
              <div className="col-md-3">
                <div className="card bg-primary text-white">
                  <div className="card-body text-center py-3">
                    <h4 className="fw-bold">{ads.filter(a => a.type === 'buy').length}</h4>
                    <p className="mb-0">Demandes d'achat</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-success text-white">
                  <div className="card-body text-center py-3">
                    <h4 className="fw-bold">{ads.filter(a => a.type === 'sell').length}</h4>
                    <p className="mb-0">Offres de vente</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-info text-white">
                  <div className="card-body text-center py-3">
                    <h4 className="fw-bold">{ads.filter(a => a.status === 'active' && !a.isExpired).length}</h4>
                    <p className="mb-0">Annonces actives</p>
                  </div>
                </div>
              </div>
              <div className="col-md-3">
                <div className="card bg-warning text-dark">
                  <div className="card-body text-center py-3">
                    <h4 className="fw-bold">
                      {ads.reduce((total, ad) => total + calculateTotal(ad), 0).toLocaleString('fr-MA')} MAD
                    </h4>
                    <p className="mb-0">Volume total</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default AdList;