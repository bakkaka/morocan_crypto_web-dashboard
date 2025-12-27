// src/components/AdList.tsx - VERSION CORRIGÉE ET COMPLÈTE
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';
import TransactionService from '../api/TransactionService';

// ============================================
// INTERFACES
// ============================================

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

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const AdList: React.FC<AdListProps> = ({ filter = 'all' }) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { user, isAdmin, isAuthenticated } = useAuth();
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

  // ============================================
  // FONCTIONS DE TRANSACTION (UNIQUES)
  // ============================================

  const handleCreateTransaction = async (ad: Ad) => {
    if (!isAuthenticated || !user) {
      showNotification('warning', 'Connectez-vous pour créer une transaction !');
      navigate('/login');
      return;
    }

    if (ad.user.id === user.id) {
      showNotification('warning', 'Vous ne pouvez pas échanger avec votre propre annonce !');
      return;
    }

    try {
      console.log('🔄 Création transaction via service...');
      
      // ✅ UTILISATION DU SERVICE UNIFIÉ
      const transaction = await TransactionService.createTransaction(ad, user.id);
      
      showNotification('success', 'Transaction créée avec succès !');
      
      // Redirection vers la messagerie
      setTimeout(() => {
        navigate('/dashboard/messages', { 
          state: { 
            transactionId: transaction.id,
            autoFocus: true
          }
        });
      }, 1000);
      
    } catch (err: any) {
      console.error('❌ Erreur création transaction:', err);
      showNotification('error', 'Erreur: ' + (err.message || 'Vérifiez votre connexion'));
    }
  };

  // ============================================
  // FONCTIONS DE CONTACT
  // ============================================

  const handleContactSeller = (ad: Ad) => {
    if (!isAuthenticated) {
      showNotification('warning', 'Connectez-vous pour contacter !');
      navigate('/login');
      return;
    }

    if (ad.user.id === user?.id) {
      showNotification('info', 'Vous ne pouvez pas vous contacter vous-même');
      return;
    }

    // Créer une transaction puis rediriger
    handleCreateTransaction(ad);
  };

  const handleWhatsAppContact = (ad: Ad) => {
    // Message simple
    const message = `Bonjour ${ad.user.fullName},\nJe suis intéressé par votre annonce #${ad.id}.\n${ad.type === 'buy' ? 'Achat' : 'Vente'} de ${ad.amount} ${ad.currency.code} à ${ad.price} MAD.\nTotal: ${calculateTotal(ad).toLocaleString('fr-MA')} MAD\n\nMerci de me contacter.`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
    
    console.log('🔗 Ouverture WhatsApp...');
    window.open(whatsappUrl, '_blank');
  };

  const openDirectMessage = (ad: Ad) => {
    if (!isAuthenticated) {
      showNotification('warning', 'Connectez-vous pour envoyer un message !');
      navigate('/login');
      return;
    }

    // SIMPLE: Ouvrir la page messages sans transaction
    navigate('/dashboard/messages');
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
      } else if (filter === 'all') {
        params.status = 'active';
      }

      console.log('🔄 Chargement des annonces...');

      const response = await api.get(endpoint, { params });
      console.log('✅ Réponse API:', response.data);

      // Gestion de la réponse selon le format
      let adsData = [];
      if (response.data['hydra:member']) {
        adsData = response.data['hydra:member'];
      } else if (Array.isArray(response.data)) {
        adsData = response.data;
      } else if (response.data.data && Array.isArray(response.data.data)) {
        adsData = response.data.data;
      }

      console.log('📊 Données extraites:', adsData);

      // Formatage simple des annonces
      const formattedAds: Ad[] = adsData.map((ad: any) => {
        const userData = ad.user || {};
        
        return {
          id: ad.id,
          '@id': ad['@id'],
          type: ad.type || 'buy',
          amount: parseFloat(ad.amount) || 0,
          price: parseFloat(ad.price) || 0,
          currency: ad.currency || { id: 0, code: 'USDT', name: 'Tether USD', type: 'crypto' },
          status: ad.status || 'active',
          paymentMethod: ad.paymentMethod || 'Non spécifié',
          user: {
            id: userData.id || 0,
            fullName: userData.fullName || userData.full_name || userData.name || 'Utilisateur',
            reputation: parseFloat(userData.reputation) || 5.0,
            email: userData.email || '',
            phone: userData.phone || userData.phoneNumber || '',
            avatar: userData.avatar || ''
          },
          createdAt: ad.createdAt || new Date().toISOString(),
          updatedAt: ad.updatedAt,
          minAmountPerTransaction: ad.minAmountPerTransaction,
          maxAmountPerTransaction: ad.maxAmountPerTransaction,
          timeLimitMinutes: ad.timeLimitMinutes || 60,
          terms: ad.terms
        };
      });

      console.log('✅ Annonces formatées:', formattedAds);
      setAds(formattedAds);

    } catch (err: any) {
      console.error('❌ Erreur chargement annonces:', err);
      showNotification('error', 'Impossible de charger les annonces');
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [filter, user, showNotification]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  // ============================================
  // FILTRAGE
  // ============================================

  const filteredAds = ads.filter(ad => {
    const matchesSearch = searchTerm === '' || 
      (ad.currency?.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (ad.paymentMethod?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (ad.user?.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || ad.type === typeFilter;
    
    if (filter === 'my-ads') {
      return matchesSearch && matchesType && ad.user?.id === user?.id;
    }
    
    return matchesSearch && matchesType && ad.status === 'active';
  });

  // ============================================
  // RENDU
  // ============================================

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3">Chargement des annonces...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* Notifications */}
      <div className="fixed-top mt-4 me-4" style={{zIndex: 1050}}>
        {notifications.map(notification => (
          <div 
            key={notification.id}
            className={`toast show mb-2 ${notification.type === 'success' ? 'bg-success' :
              notification.type === 'error' ? 'bg-danger' :
              notification.type === 'warning' ? 'bg-warning' : 'bg-info'}`}
          >
            <div className="toast-body text-white">
              <div className="d-flex align-items-center">
                <i className={`bi ${
                  notification.type === 'success' ? 'bi-check-circle' :
                  notification.type === 'error' ? 'bi-exclamation-circle' :
                  notification.type === 'warning' ? 'bi-exclamation-triangle' :
                  'bi-info-circle'
                } me-2`}></i>
                <span>{notification.message}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2 className="h3 fw-bold">
            <i className="bi bi-megaphone me-2"></i>
            Marketplace P2P
          </h2>
          <p className="text-muted mb-0">Échangez des cryptomonnaies en toute sécurité</p>
        </div>

        <div className="d-flex gap-2">
          {filter === 'all' && isAuthenticated && (
            <Link to="/dashboard/ads/create" className="btn btn-primary">
              <i className="bi bi-plus-circle me-2"></i>
              Créer une Annonce
            </Link>
          )}
          <button className="btn btn-outline-secondary" onClick={loadAds}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Actualiser
          </button>
        </div>
      </div>

      {/* Filtres simples */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-8">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rechercher par crypto, méthode de paiement ou vendeur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            
            <div className="col-md-4">
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
          </div>
          
          <div className="mt-3">
            <span className="badge bg-primary fs-6">
              {filteredAds.length} annonce{filteredAds.length !== 1 ? 's' : ''} trouvée{filteredAds.length !== 1 ? 's' : ''}
            </span>
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
              {searchTerm || typeFilter !== 'all'
                ? 'Aucune annonce ne correspond à vos critères.'
                : 'Aucune annonce active pour le moment.'
              }
            </p>
            {isAuthenticated && (
              <Link to="/dashboard/ads/create" className="btn btn-primary mt-2">
                <i className="bi bi-plus-circle me-2"></i>
                Créer la première annonce
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {filteredAds.map((ad) => {
            const isUserAd = user && ad.user.id === user.id;
            const isSellAd = ad.type === 'sell';
            
            return (
              <div key={ad.id} className="col-xl-4 col-md-6">
                <div className={`card h-100 shadow-sm hover-shadow transition-all ${
                  ad.type === 'buy' ? 'border-success' : 'border-primary'
                }`}>
                  {/* En-tête */}
                  <div className="card-header d-flex justify-content-between align-items-center">
                    <div>
                      <span className={`badge ${ad.type === 'buy' ? 'bg-success' : 'bg-primary'}`}>
                        {ad.type === 'buy' ? '🛒 ACHAT' : '💰 VENTE'}
                      </span>
                      <span className="badge ms-2 bg-secondary">
                        {ad.status === 'active' ? 'Actif' : ad.status}
                      </span>
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
                    <h5 className="card-title mb-2">
                      {ad.type === 'buy' ? 'Achat de' : 'Vente de'} {ad.amount} {ad.currency?.code || 'USDT'}
                    </h5>
                    
                    <div className="text-muted small mb-2">
                      <i className="bi bi-credit-card me-1"></i>
                      {ad.paymentMethod || 'Méthode non spécifiée'}
                    </div>
                    
                    {ad.terms && (
                      <p className="card-text text-muted mt-2 small">
                        <i className="bi bi-chat-left-text me-1"></i>
                        {ad.terms.length > 100 ? ad.terms.substring(0, 100) + '...' : ad.terms}
                      </p>
                    )}

                    {/* Totaux */}
                    <div className="mb-3">
                      <small className="text-muted d-block">Montant total</small>
                      <strong className="fs-4 text-primary">
                        {calculateTotal(ad).toLocaleString('fr-MA')} MAD
                      </strong>
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
                        <small className="text-warning">
                          ⭐ {ad.user?.reputation?.toFixed(1) || '5.0'}
                        </small>
                      </div>
                      <div className="text-end">
                        <small className="text-muted d-block">ID Annonce</small>
                        <strong className="text-dark">#{ad.id}</strong>
                      </div>
                    </div>
                  </div>
                  
                  {/* Pied de carte - BOUTONS SIMPLES ET FONCTIONNELS */}
                  <div className="card-footer bg-transparent">
                    <div className="d-flex flex-wrap gap-2">
                      {/* Bouton principal Acheter/Vendre */}
                      {!isUserAd && isAuthenticated && (
                        <button 
                          className={`btn btn-sm flex-fill ${isSellAd ? 'btn-success' : 'btn-warning'}`}
                          onClick={() => handleContactSeller(ad)}
                        >
                          <i className={`bi ${isSellAd ? 'bi-cart-check' : 'bi-cash'} me-1`}></i>
                          {isSellAd ? 'Acheter maintenant' : 'Vendre maintenant'}
                        </button>
                      )}
                      
                      {/* Boutons de contact - TOUJOURS VISIBLES ET CLICABLES */}
                      {!isUserAd && (
                        <div className="d-flex gap-1 w-100">
                          <button 
                            className="btn btn-outline-primary btn-sm flex-fill"
                            onClick={() => openDirectMessage(ad)}
                            title="Ouvrir la messagerie"
                          >
                            <i className="bi bi-chat me-1"></i>
                            Discuter
                          </button>
                          
                          <button 
                            className="btn btn-outline-success btn-sm"
                            onClick={() => handleWhatsAppContact(ad)}
                            title="Contacter sur WhatsApp"
                          >
                            <i className="bi bi-whatsapp"></i>
                          </button>
                        </div>
                      )}
                      
                      {/* Boutons pour mes annonces */}
                      {isUserAd && (
                        <div className="d-flex gap-1 w-100">
                          <button 
                            className="btn btn-outline-warning btn-sm"
                            onClick={() => navigate(`/dashboard/ads/edit/${ad.id}`)}
                          >
                            <i className="bi bi-pencil"></i> Modifier
                          </button>
                          <button 
                            className="btn btn-outline-danger btn-sm"
                            onClick={() => {
                              if (window.confirm('Supprimer cette annonce ?')) {
                                showNotification('info', 'Fonctionnalité à venir');
                              }
                            }}
                          >
                            <i className="bi bi-trash"></i> Supprimer
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
      )}
    </div>
  );
};

export default AdList;