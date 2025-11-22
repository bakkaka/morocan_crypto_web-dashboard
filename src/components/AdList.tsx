// src/components/AdList.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';

interface Ad {
  id: number;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  paymentMethod: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  currency?: string;
  user?: {
    id: number;
    fullName: string;
    email: string;
    reputation: number;
  };
  acceptedPaymentMethods: string[];
  createdAt: string;
  updatedAt: string;
}

const AdList: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState({
    type: '',
    status: 'active'
  });

  // Fonction pour extraire l'ID depuis une IRI
  const extractIdFromIri = (iri: string): number => {
    if (!iri) return 0;
    const parts = iri.split('/');
    return parseInt(parts[parts.length - 1], 10) || 0;
  };

  // Fonction pour obtenir le nom de la devise
  const getCurrencyName = (currencyIri: string): string => {
    const currencyMap: { [key: number]: string } = {
      1: 'USDT',
      2: 'MAD'
    };
    const id = extractIdFromIri(currencyIri);
    return currencyMap[id] || 'Crypto';
  };

  // Fonction pour obtenir les noms des méthodes de paiement
  const getPaymentMethodNames = (paymentMethodIris: string[]): string[] => {
    const methodMap: { [key: number]: string } = {
      1: 'Virement Bancaire',
      2: 'Cash', 
      3: 'PayPal',
      4: 'Wise',
      5: 'Carte Bancaire'
    };
    
    return paymentMethodIris.map(iri => {
      const id = extractIdFromIri(iri);
      return methodMap[id] || 'Méthode inconnue';
    });
  };

  // Charger les annonces depuis l'API
  useEffect(() => {
    const loadAds = async () => {
      try {
        setLoading(true);
        const response = await api.get('/ads');
        
        // Votre API retourne directement un array
        const adsData = Array.isArray(response.data) ? response.data : [];
        console.log('📥 Données reçues:', adsData);
        setAds(adsData);
      } catch (err: any) {
        console.error('Erreur API:', err);
        setError(`Erreur de chargement: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    loadAds();
  }, []);

  const filteredAds = ads.filter(ad => {
    if (filters.type && ad.type !== filters.type) return false;
    if (filters.status && ad.status !== filters.status) return false;
    return true;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { class: string, text: string } } = {
      active: { class: 'bg-success', text: 'Active' },
      paused: { class: 'bg-warning', text: 'En pause' },
      completed: { class: 'bg-info', text: 'Terminée' },
      cancelled: { class: 'bg-danger', text: 'Annulée' }
    };
    const config = statusConfig[status] || statusConfig.active;
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const getTypeIcon = (type: string) => {
    return type === 'buy' 
      ? <i className="bi bi-arrow-down-circle text-success me-1"></i>
      : <i className="bi bi-arrow-up-circle text-danger me-1"></i>;
  };

  const getUserRating = (reputation: number) => {
    return reputation >= 4.5 ? 'Expert' : 
           reputation >= 4.0 ? 'Confirmé' : 
           reputation >= 3.5 ? 'Intermédiaire' : 'Nouveau';
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <span className="ms-2">Chargement des annonces...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <i className="bi bi-exclamation-triangle me-2"></i>
        {error}
        <button 
          className="btn btn-sm btn-outline-danger ms-3" 
          onClick={() => window.location.reload()}
        >
          Réessayer
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-1">Marketplace P2P</h1>
          <p className="text-muted">
            {ads.length} annonce(s) disponible(s)
          </p>
        </div>
        <Link to="/dashboard/ads/create" className="btn btn-primary">
          <i className="bi bi-plus-circle me-2"></i>
          Créer une annonce
        </Link>
      </div>

      {/* Filtres */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-4">
              <label className="form-label">Type d'annonce</label>
              <select 
                className="form-select"
                value={filters.type}
                onChange={(e) => setFilters({...filters, type: e.target.value})}
              >
                <option value="">Toutes les annonces</option>
                <option value="buy">Achat d'USDT</option>
                <option value="sell">Vente d'USDT</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label">Statut</label>
              <select 
                className="form-select"
                value={filters.status}
                onChange={(e) => setFilters({...filters, status: e.target.value})}
              >
                <option value="active">Actives</option>
                <option value="paused">En pause</option>
                <option value="">Tous les statuts</option>
              </select>
            </div>
            <div className="col-md-4 d-flex align-items-end">
              <button 
                className="btn btn-outline-secondary w-100"
                onClick={() => setFilters({ type: '', status: 'active' })}
              >
                <i className="bi bi-arrow-clockwise me-2"></i>
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des annonces */}
      <div className="row">
        {filteredAds.map(ad => {
          const paymentMethodNames = getPaymentMethodNames(ad.acceptedPaymentMethods || []);
          const currencyName = getCurrencyName(ad.currency || '');
          const userName = ad.user?.fullName || 'Utilisateur inconnu';
          const userInitial = userName.charAt(0);
          const userReputation = ad.user?.reputation || 0;
          
          return (
            <div key={ad.id} className="col-md-6 col-lg-4 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body d-flex flex-column">
                  <div className="d-flex justify-content-between align-items-start mb-3">
                    <div>
                      <h5 className="card-title mb-1">
                        {getTypeIcon(ad.type)}
                        {ad.type === 'buy' ? 'Achat' : 'Vente'} {currencyName}
                      </h5>
                      <p className="text-muted small mb-0">{ad.paymentMethod}</p>
                    </div>
                    {getStatusBadge(ad.status)}
                  </div>
                  
                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold text-primary fs-4">{ad.price} MAD</span>
                      <small className="text-muted">par {currencyName}</small>
                    </div>
                    <div className="small text-muted">
                      Montant disponible: <strong>{ad.amount} {currencyName}</strong>
                    </div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted">Méthodes acceptées:</small>
                    <div className="mt-1">
                      {paymentMethodNames.slice(0, 2).map((method, index) => (
                        <span key={index} className="badge bg-light text-dark me-1 small">
                          {method}
                        </span>
                      ))}
                      {paymentMethodNames.length > 2 && (
                        <span className="badge bg-light text-dark small">
                          +{paymentMethodNames.length - 2}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" 
                             style={{width: '32px', height: '32px', fontSize: '14px'}}>
                          {userInitial}
                        </div>
                        <div>
                          <div className="small fw-bold">{userName}</div>
                          <div className="small text-muted">
                            <i className="bi bi-star-fill text-warning me-1"></i>
                            {getUserRating(userReputation)}
                          </div>
                        </div>
                      </div>
                      
                      <button className="btn btn-primary btn-sm">
                        {ad.type === 'buy' ? 'Vendre' : 'Acheter'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="card-footer bg-transparent">
                  <small className="text-muted">
                    <i className="bi bi-clock me-1"></i>
                    {new Date(ad.createdAt).toLocaleDateString('fr-FR')}
                  </small>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredAds.length === 0 && !loading && (
        <div className="text-center py-5">
          <i className="bi bi-inbox display-1 text-muted"></i>
          <h3 className="mt-3">Aucune annonce trouvée</h3>
          <p className="text-muted">
            {filters.type || filters.status !== 'active' 
              ? 'Aucune annonce ne correspond à vos filtres' 
              : 'Soyez le premier à créer une annonce !'
            }
          </p>
          <Link to="/dashboard/ads/create" className="btn btn-primary">
            Créer une annonce
          </Link>
        </div>
      )}
    </div>
  );
};

export default AdList;