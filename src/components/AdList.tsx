// src/components/AdList.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

interface User {
  id: number;
  fullName: string;
  reputation: number;
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
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  paymentMethod: string;
  user: User;
  createdAt: string;
  updatedAt?: string;
  minAmountPerTransaction?: number;
  maxAmountPerTransaction?: number;
  timeLimitMinutes: number;
  terms?: string;
}

interface AdListProps {
  filter?: 'all' | 'my-ads' | 'moderation';
}

const AdList: React.FC<AdListProps> = ({ filter = 'all' }) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();

  const extractHydraMember = useCallback((data: any): any[] => {
    if (data?.member && Array.isArray(data.member)) return data.member;
    if (data?.['hydra:member'] && Array.isArray(data['hydra:member'])) return data['hydra:member'];
    if (Array.isArray(data)) return data;
    return [];
  }, []);

  const loadAds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      let endpoint = '/ads';
      let params: any = { status: 'active' };

      if (filter === 'my-ads' && user) {
        params.user = user.id;
      } else if (filter === 'moderation' && isAdmin) {
        // Pour l'admin, voir toutes les annonces
        delete params.status;
      }

      console.log('🔄 Chargement des annonces...', { filter, endpoint, params });

      const response = await api.get(endpoint, { params });
      const adsData = extractHydraMember(response.data);
      
      console.log('✅ Annonces chargées:', adsData.length, adsData);

      // Formatage des données
      const formattedAds: Ad[] = adsData.map((ad: any) => ({
        id: ad.id,
        '@id': ad['@id'],
        type: ad.type,
        amount: parseFloat(ad.amount) || 0,
        price: parseFloat(ad.price) || 0,
        currency: ad.currency || { id: 0, code: 'USDT', name: 'Tether USD', type: 'crypto' },
        status: ad.status || 'active',
        paymentMethod: ad.paymentMethod || 'Non spécifié',
        user: ad.user || { id: 0, fullName: 'Utilisateur', reputation: 5.0 },
        createdAt: ad.createdAt || new Date().toISOString(),
        updatedAt: ad.updatedAt,
        minAmountPerTransaction: ad.minAmountPerTransaction ? parseFloat(ad.minAmountPerTransaction) : undefined,
        maxAmountPerTransaction: ad.maxAmountPerTransaction ? parseFloat(ad.maxAmountPerTransaction) : undefined,
        timeLimitMinutes: ad.timeLimitMinutes || 60,
        terms: ad.terms
      }));

      setAds(formattedAds);

    } catch (err: any) {
      console.error('❌ Erreur chargement annonces:', err);
      setError('Impossible de charger les annonces. Vérifiez la connexion API.');
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [filter, user, isAdmin, extractHydraMember]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  const filteredAds = ads.filter(ad => {
    const matchesSearch = 
      (ad.currency?.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (ad.paymentMethod?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
      (ad.terms?.toLowerCase() || '').includes(searchTerm.toLowerCase());
    
    const matchesType = typeFilter === 'all' || ad.type === typeFilter;
    
    if (filter === 'my-ads') {
      return matchesSearch && matchesType && ad.user?.id === user?.id;
    }
    
    if (filter === 'moderation') {
      return matchesSearch && matchesType && ad.status !== 'active';
    }
    
    return matchesSearch && matchesType && ad.status === 'active';
  });

  const handleViewDetails = (adId: number) => {
    navigate(`/ads/${adId}`);
  };

  const handleEditAd = (adId: number) => {
    navigate(`/dashboard/ads/edit/${adId}`);
  };

  const handleToggleStatus = async (adId: number, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'active' ? 'paused' : 'active';
      await api.patch(`/ads/${adId}`, { status: newStatus });
      alert(`✅ Annonce ${newStatus === 'active' ? 'activée' : 'mise en pause'} !`);
      loadAds();
    } catch (err) {
      console.error('❌ Erreur modification statut:', err);
      alert('❌ Erreur lors de la modification');
    }
  };

  const handleDeleteAd = async (adId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?')) {
      return;
    }

    try {
      await api.delete(`/ads/${adId}`);
      alert('✅ Annonce supprimée avec succès !');
      loadAds();
    } catch (err) {
      console.error('❌ Erreur suppression:', err);
      alert('❌ Erreur lors de la suppression');
    }
  };

  const handleModerateAd = async (adId: number, approve: boolean) => {
    try {
      const newStatus = approve ? 'active' : 'cancelled';
      await api.patch(`/ads/${adId}`, { status: newStatus });
      alert(approve ? '✅ Annonce approuvée !' : '❌ Annonce rejetée !');
      loadAds();
    } catch (err) {
      console.error('❌ Erreur modération:', err);
      alert('❌ Erreur lors de la modération');
    }
  };

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

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('fr-MA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };

  const calculateTotal = (ad: Ad): number => {
    return ad.amount * ad.price;
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="d-flex justify-content-center align-items-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <span className="ms-3">Chargement des annonces...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-fluid py-4">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Erreur
          </h4>
          <p>{error}</p>
          <button className="btn btn-primary" onClick={loadAds}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Réessayer
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>
            <i className="bi bi-megaphone me-2"></i>
            {getHeaderTitle()}
          </h2>
          <p className="text-muted mb-0">{getHeaderDescription()}</p>
        </div>

        <div className="d-flex gap-2">
          {filter === 'all' && user && (
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
                  placeholder="Rechercher par crypto, banque ou description..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
            </div>
            <div className="col-md-3">
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
            <div className="col-md-3">
              <div className="d-flex gap-2 align-items-center">
                <span className="badge bg-primary fs-6">
                  {filteredAds.length} annonce{filteredAds.length > 1 ? 's' : ''}
                </span>
                {filter === 'moderation' && (
                  <span className="badge bg-warning fs-6">En attente</span>
                )}
              </div>
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
              {searchTerm || typeFilter !== 'all'
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
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {filteredAds.map((ad) => (
            <div key={ad.id} className="col-xl-4 col-md-6">
              <div className={`card h-100 shadow-sm border-${ad.type === 'buy' ? 'success' : 'primary'} ${ad.status !== 'active' ? 'border-warning' : ''}`}>
                <div className="card-header d-flex justify-content-between align-items-center">
                  <div>
                    <span className={`badge ${ad.type === 'buy' ? 'bg-success' : 'bg-primary'}`}>
                      {ad.type === 'buy' ? '🛒 ACHAT' : '💰 VENTE'}
                    </span>
                    <span className={`badge ms-2 ${ad.status === 'active' ? 'bg-success' : ad.status === 'paused' ? 'bg-warning' : 'bg-secondary'}`}>
                      {ad.status === 'active' ? 'Actif' : ad.status === 'paused' ? 'En pause' : 'Terminé'}
                    </span>
                  </div>
                  <div className="text-end">
                    <div className="fw-bold fs-5">
                      {ad.price} MAD
                      <small className="text-muted ms-1">/{ad.currency?.code || 'USDT'}</small>
                    </div>
                  </div>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-start">
                      <div>
                        <h5 className="card-title mb-1">
                          {ad.type === 'buy' ? 'Achat de' : 'Vente de'} {ad.amount} {ad.currency?.code || 'USDT'}
                        </h5>
                        <div className="text-muted small">
                          <i className="bi bi-credit-card me-1"></i>
                          {ad.paymentMethod || 'Méthode non spécifiée'}
                        </div>
                      </div>
                      <div className="badge bg-info">
                        {ad.timeLimitMinutes >= 1440 
                          ? `${Math.floor(ad.timeLimitMinutes / 1440)}j`
                          : ad.timeLimitMinutes >= 60
                            ? `${Math.floor(ad.timeLimitMinutes / 60)}h`
                            : `${ad.timeLimitMinutes}min`
                        }
                      </div>
                    </div>
                    
                    {ad.terms && (
                      <p className="card-text text-muted mt-2 small">
                        <i className="bi bi-chat-left-text me-1"></i>
                        {ad.terms.length > 100 ? ad.terms.substring(0, 100) + '...' : ad.terms}
                      </p>
                    )}
                  </div>

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

                  <div className="d-flex justify-content-between align-items-center border-top pt-3">
                    <div>
                      <small className="text-muted d-block">Vendeur</small>
                      <div className="fw-bold">
                        <i className="bi bi-person-circle me-1"></i>
                        {ad.user?.fullName || 'Utilisateur'}
                      </div>
                      <small className="text-warning">
                        ⭐ {ad.user?.reputation?.toFixed(1) || '5.0'}
                      </small>
                    </div>
                    <div className="text-end">
                      <small className="text-muted d-block">Publiée le</small>
                      <small>{formatDate(ad.createdAt)}</small>
                    </div>
                  </div>
                </div>
                <div className="card-footer bg-transparent">
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-primary btn-sm flex-fill"
                      onClick={() => handleViewDetails(ad.id)}
                    >
                      <i className="bi bi-eye me-1"></i>
                      Voir Détails
                    </button>
                    
                    {filter === 'my-ads' && (
                      <>
                        <button 
                          className="btn btn-outline-warning btn-sm"
                          onClick={() => handleToggleStatus(ad.id, ad.status)}
                          title={ad.status === 'active' ? 'Mettre en pause' : 'Activer'}
                        >
                          <i className={`bi bi-${ad.status === 'active' ? 'pause' : 'play'}`}></i>
                        </button>
                        <button 
                          className="btn btn-outline-info btn-sm"
                          onClick={() => handleEditAd(ad.id)}
                          title="Modifier"
                        >
                          <i className="bi bi-pencil"></i>
                        </button>
                        <button 
                          className="btn btn-outline-danger btn-sm"
                          onClick={() => handleDeleteAd(ad.id)}
                          title="Supprimer"
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </>
                    )}
                    
                    {filter === 'moderation' && isAdmin && (
                      <>
                        <button 
                          className="btn btn-success btn-sm"
                          onClick={() => handleModerateAd(ad.id, true)}
                          title="Approuver"
                        >
                          <i className="bi bi-check-lg"></i>
                        </button>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleModerateAd(ad.id, false)}
                          title="Rejeter"
                        >
                          <i className="bi bi-x-lg"></i>
                        </button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Statistiques */}
      {ads.length > 0 && (
        <div className="row mt-4">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body text-center">
                <h4>{ads.filter(a => a.type === 'buy').length}</h4>
                <p className="mb-0">Demandes d'achat</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body text-center">
                <h4>{ads.filter(a => a.type === 'sell').length}</h4>
                <p className="mb-0">Offres de vente</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body text-center">
                <h4>{ads.filter(a => a.status === 'active').length}</h4>
                <p className="mb-0">Annonces actives</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-dark">
              <div className="card-body text-center">
                <h4>
                  {ads.reduce((total, ad) => total + calculateTotal(ad), 0).toLocaleString('fr-MA')} MAD
                </h4>
                <p className="mb-0">Volume total</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdList;