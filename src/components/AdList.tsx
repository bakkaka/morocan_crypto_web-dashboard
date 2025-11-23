// src/components/AdList.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axiosConfig';

interface User {
  id: number;
  email: string;
  fullName: string;
  reputation: number;
  createdAt?: string;
}

interface PaymentMethod {
  id: number;
  name: string;
  details?: string;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  type?: string;
}

interface Ad {
  id: number;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  paymentMethod: string;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  currency: string | Currency;
  user?: User;
  acceptedPaymentMethods: (string | PaymentMethod)[];
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
  
  // État pour la pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(9);

  // État pour le cache des données
  const [paymentMethodsCache, setPaymentMethodsCache] = useState<Map<number, PaymentMethod>>(new Map());
  const [currenciesCache, setCurrenciesCache] = useState<Map<number, Currency>>(new Map());

  // Helper pour extraire les données
  const extractData = (data: any): any[] => {
    if (data['hydra:member']) return data['hydra:member'];
    if (data.member) return data.member;
    if (Array.isArray(data)) return data;
    return [];
  };

  // Fonction pour résoudre une IRI en ID
  const extractIdFromIri = (iri: string): number => {
    if (!iri || typeof iri !== 'string') return 0;
    const parts = iri.split('/');
    return parseInt(parts[parts.length - 1], 10) || 0;
  };

  // Charger les données de référence
  useEffect(() => {
    const loadReferenceData = async () => {
      try {
        // Charger toutes les méthodes de paiement
        const pmResponse = await api.get('/payment_methods');
        const pmData = extractData(pmResponse.data);
        const pmMap = new Map(pmData.map((pm: PaymentMethod) => [pm.id, pm]));
        setPaymentMethodsCache(pmMap);

        // Charger toutes les devises
        const currenciesResponse = await api.get('/currencies');
        const currenciesData = extractData(currenciesResponse.data);
        const currenciesMap = new Map(currenciesData.map((c: Currency) => [c.id, c]));
        setCurrenciesCache(currenciesMap);

        console.log('✅ Données de référence chargées:', {
          paymentMethods: pmData.length,
          currencies: currenciesData.length
        });

      } catch (err) {
        console.error('Erreur chargement données référence:', err);
      }
    };

    loadReferenceData();
  }, []);

  // Charger les annonces
  useEffect(() => {
    const loadAds = async () => {
      try {
        setLoading(true);
        
        const response = await api.get('/ads?order[createdAt]=desc');
        let adsData = extractData(response.data);
        
        console.log('📥 Annonces chargées:', adsData.length);
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

  // Obtenir le nom de la devise (gère IRIs et objets)
  const getCurrencyInfo = (currency: string | Currency): { code: string; name: string } => {
    if (!currency) return { code: 'USDT', name: 'Tether USD' };
    
    if (typeof currency === 'string') {
      // C'est une IRI, utiliser le cache
      const currencyId = extractIdFromIri(currency);
      const cachedCurrency = currenciesCache.get(currencyId);
      return cachedCurrency ? 
        { code: cachedCurrency.code, name: cachedCurrency.name } : 
        { code: 'USDT', name: 'Tether USD' };
    }
    
    // C'est un objet Currency
    return { code: currency.code, name: currency.name };
  };

  // Obtenir les méthodes de paiement (gère IRIs et objets)
  const getPaymentMethodsInfo = (paymentMethods: (string | PaymentMethod)[]): PaymentMethod[] => {
    if (!paymentMethods || !Array.isArray(paymentMethods)) return [];
    
    return paymentMethods.map(pm => {
      if (typeof pm === 'string') {
        // C'est une IRI, utiliser le cache
        const pmId = extractIdFromIri(pm);
        const cachedPm = paymentMethodsCache.get(pmId);
        return cachedPm || { id: pmId, name: 'Méthode inconnue' };
      }
      
      // C'est un objet PaymentMethod
      return pm;
    });
  };

  // Vérifier si l'utilisateur est nouveau (moins de 7 jours)
  const isNewUser = (user: User | undefined): boolean => {
    if (!user || !user.createdAt) return false;
    const userCreated = new Date(user.createdAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - userCreated.getTime()) / (1000 * 60 * 60 * 24));
    return diffDays < 7;
  };

  // Obtenir le niveau de réputation
  const getUserRating = (reputation: number) => {
    if (reputation >= 4.5) return { text: 'Expert', class: 'text-success' };
    if (reputation >= 4.0) return { text: 'Confirmé', class: 'text-info' };
    if (reputation >= 3.5) return { text: 'Intermédiaire', class: 'text-warning' };
    return { text: 'Nouveau', class: 'text-muted' };
  };

  // Filtrer les annonces
  const filteredAds = ads
    .filter(ad => {
      if (filters.type && ad.type !== filters.type) return false;
      if (filters.status && ad.status !== filters.status) return false;
      return true;
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Calculs pour la pagination
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentAds = filteredAds.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredAds.length / itemsPerPage);

  // Changer de page
  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);
  
  // Aller à la page précédente
  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(currentPage - 1);
    }
  };

  // Aller à la page suivante
  const goToNextPage = () => {
    if (currentPage < totalPages) {
      setCurrentPage(currentPage + 1);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: { [key: string]: { class: string, text: string } } = {
      active: { class: 'bg-success', text: 'Active' },
      paused: { class: 'bg-warning', text: 'En pause' },
      completed: { class: 'bg-info', text: 'Terminée' },
      cancelled: { class: 'bg-danger', text: 'Annulée' }
    };
    const config = statusConfig[status] || statusConfig.active;
    return <span className={`badge ${config.class} small`}>{config.text}</span>;
  };

  const getTypeIcon = (type: string) => {
    return type === 'buy' 
      ? <i className="bi bi-arrow-down-circle text-success me-1"></i>
      : <i className="bi bi-arrow-up-circle text-danger me-1"></i>;
  };

  const getTypeBadge = (type: string) => {
    return type === 'buy' 
      ? <span className="badge bg-success small">Achat</span>
      : <span className="badge bg-danger small">Vente</span>;
  };

  // Fonction pour formater la date relative
  const getRelativeTime = (dateString: string): string => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffMins < 1) return 'À l\'instant';
    if (diffMins < 60) return `Il y a ${diffMins} min`;
    if (diffHours < 24) return `Il y a ${diffHours} h`;
    if (diffDays === 1) return 'Hier';
    if (diffDays < 7) return `Il y a ${diffDays} j`;
    
    return date.toLocaleDateString('fr-FR', { 
      day: 'numeric', 
      month: 'short'
    });
  };

  // Générer les numéros de page à afficher
  const getPageNumbers = () => {
    const pageNumbers = [];
    const maxPagesToShow = 5;
    
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);
    
    if (endPage - startPage + 1 < maxPagesToShow) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }
    
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }
    
    return pageNumbers;
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
          <p className="text-muted mb-0">
            {filteredAds.length} annonce(s) {filters.status === 'active' ? 'active(s)' : 'disponible(s)'}
            {currentAds.length > 0 && (
              <span className="ms-2 text-success small">
                <i className="bi bi-arrow-up me-1"></i>
                Nouvelles annonces en premier
              </span>
            )}
          </p>
        </div>
        <Link to="/dashboard/ads/create" className="btn btn-primary">
          <i className="bi bi-plus-circle me-2"></i>
          Créer une annonce
        </Link>
      </div>

      {/* Filtres */}
      <div className="card mb-4">
        <div className="card-body py-3">
          <div className="row g-2 align-items-end">
            <div className="col-md-4">
              <label className="form-label small fw-bold mb-1">Type d'annonce</label>
              <select 
                className="form-select form-select-sm"
                value={filters.type}
                onChange={(e) => {
                  setFilters({...filters, type: e.target.value});
                  setCurrentPage(1);
                }}
              >
                <option value="">Toutes les annonces</option>
                <option value="buy">Achat</option>
                <option value="sell">Vente</option>
              </select>
            </div>
            <div className="col-md-4">
              <label className="form-label small fw-bold mb-1">Statut</label>
              <select 
                className="form-select form-select-sm"
                value={filters.status}
                onChange={(e) => {
                  setFilters({...filters, status: e.target.value});
                  setCurrentPage(1);
                }}
              >
                <option value="active">Actives</option>
                <option value="paused">En pause</option>
                <option value="">Tous les statuts</option>
              </select>
            </div>
            <div className="col-md-4">
              <button 
                className="btn btn-outline-secondary btn-sm w-100"
                onClick={() => {
                  setFilters({ type: '', status: 'active' });
                  setCurrentPage(1);
                }}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Réinitialiser
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques de pagination */}
      {filteredAds.length > 0 && (
        <div className="d-flex justify-content-between align-items-center mb-3">
          <small className="text-muted">
            Affichage de <strong>{indexOfFirstItem + 1}-{Math.min(indexOfLastItem, filteredAds.length)}</strong> 
            sur <strong>{filteredAds.length}</strong> annonce(s)
          </small>
          <small className="text-muted">
            Page <strong>{currentPage}</strong> sur <strong>{totalPages}</strong>
          </small>
        </div>
      )}

      {/* Liste des annonces CORRIGÉE */}
      <div className="row">
        {currentAds.map(ad => {
          const currencyInfo = getCurrencyInfo(ad.currency);
          const paymentMethods = getPaymentMethodsInfo(ad.acceptedPaymentMethods);
          const userName = ad.user?.fullName || 'Utilisateur';
          const userInitial = userName.charAt(0).toUpperCase();
          const userReputation = ad.user?.reputation || 0;
          const userRating = getUserRating(userReputation);
          const isNewUserFlag = isNewUser(ad.user);
          
          return (
            <div key={ad.id} className="col-md-6 col-xl-4 mb-3">
              <div className="card h-100 shadow-sm border-0" style={{ minHeight: '280px' }}>
                <div className="card-body d-flex flex-column p-3">
                  {/* En-tête de l'annonce */}
                  <div className="mb-2">
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="d-flex align-items-center gap-1">
                        {getTypeBadge(ad.type)}
                        {getStatusBadge(ad.status)}
                      </div>
                      <div className="text-end">
                        <h6 className="mb-0 text-primary fw-bold">{ad.price.toFixed(2)} MAD</h6>
                        <small className="text-muted">/{currencyInfo.code}</small>
                      </div>
                    </div>
                    <h6 className="card-title mb-1 mt-2 small fw-bold">
                      {getTypeIcon(ad.type)}
                      {ad.type === 'buy' ? 'Achat' : 'Vente'} {currencyInfo.code}
                    </h6>
                  </div>
                  
                  {/* Montant disponible */}
                  <div className="mb-2">
                    <div className="small text-muted">
                      <i className="bi bi-coin me-1"></i>
                      Disponible: <strong>{ad.amount} {currencyInfo.code}</strong>
                    </div>
                    <div className="small text-success fw-bold">
                      Total: {(ad.amount * ad.price).toFixed(2)} MAD
                    </div>
                  </div>

                  {/* Méthodes de paiement acceptées - CORRIGÉ */}
                  <div className="mb-3">
                    <small className="text-muted d-block mb-1">
                      <i className="bi bi-credit-card me-1"></i>
                      Paiements acceptés:
                    </small>
                    <div className="d-flex flex-wrap gap-1">
                      {paymentMethods.slice(0, 2).map((method, index) => (
                        <span key={index} className="badge bg-light text-dark border small">
                          {method.name}
                        </span>
                      ))}
                      {paymentMethods.length > 2 && (
                        <span className="badge bg-light text-dark border small">
                          +{paymentMethods.length - 2}
                        </span>
                      )}
                      {paymentMethods.length === 0 && (
                        <span className="badge bg-light text-dark border small">
                          Non spécifié
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Utilisateur et actions - CORRIGÉ */}
                  <div className="mt-auto">
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="d-flex align-items-center">
                        <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" 
                             style={{width: '28px', height: '28px', fontSize: '12px'}}>
                          {userInitial}
                        </div>
                        <div>
                          <div className="small fw-bold" style={{ fontSize: '0.8rem' }}>
                            {userName}
                            {isNewUserFlag && (
                              <span className="badge bg-warning text-dark ms-1" style={{ fontSize: '0.6rem' }}>
                                Nouveau
                              </span>
                            )}
                          </div>
                          <div className={`small ${userRating.class}`} style={{ fontSize: '0.75rem' }}>
                            <i className="bi bi-star-fill me-1"></i>
                            {userRating.text}
                            {userReputation > 0 && ` (${userReputation.toFixed(1)})`}
                          </div>
                        </div>
                      </div>
                      
                      <button className="btn btn-primary btn-sm" style={{ fontSize: '0.8rem' }}>
                        {ad.type === 'buy' ? 'Vendre' : 'Acheter'}
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Footer avec date */}
                <div className="card-footer bg-transparent border-top-0 py-2">
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted" style={{ fontSize: '0.75rem' }}>
                      <i className="bi bi-clock me-1"></i>
                      {getRelativeTime(ad.createdAt)}
                    </small>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="d-flex justify-content-center mt-4">
          <nav aria-label="Pagination">
            <ul className="pagination pagination-sm mb-0">
              {/* Bouton précédent */}
              <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={goToPreviousPage}
                  disabled={currentPage === 1}
                >
                  <i className="bi bi-chevron-left"></i>
                </button>
              </li>

              {/* Première page */}
              {currentPage > 3 && (
                <>
                  <li className="page-item">
                    <button className="page-link" onClick={() => paginate(1)}>
                      1
                    </button>
                  </li>
                  {currentPage > 4 && (
                    <li className="page-item disabled">
                      <span className="page-link">...</span>
                    </li>
                  )}
                </>
              )}

              {/* Pages numérotées */}
              {getPageNumbers().map(number => (
                <li key={number} className={`page-item ${currentPage === number ? 'active' : ''}`}>
                  <button className="page-link" onClick={() => paginate(number)}>
                    {number}
                  </button>
                </li>
              ))}

              {/* Dernière page */}
              {currentPage < totalPages - 2 && (
                <>
                  {currentPage < totalPages - 3 && (
                    <li className="page-item disabled">
                      <span className="page-link">...</span>
                    </li>
                  )}
                  <li className="page-item">
                    <button className="page-link" onClick={() => paginate(totalPages)}>
                      {totalPages}
                    </button>
                  </li>
                </>
              )}

              {/* Bouton suivant */}
              <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                <button 
                  className="page-link" 
                  onClick={goToNextPage}
                  disabled={currentPage === totalPages}
                >
                  <i className="bi bi-chevron-right"></i>
                </button>
              </li>
            </ul>
          </nav>
        </div>
      )}

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
            <i className="bi bi-plus-circle me-2"></i>
            Créer une annonce
          </Link>
        </div>
      )}
    </div>
  );
};

export default AdList;