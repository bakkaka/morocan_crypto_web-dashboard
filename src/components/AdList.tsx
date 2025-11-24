import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link } from 'react-router-dom';

interface Ad {
  id: number;
  title: string;
  description: string;
  price: number;
  currency: string;
  type: 'buy' | 'sell';
  status: 'active' | 'inactive' | 'pending';
  user: {
    id: number;
    fullName: string;
    reputation: number;
  };
  createdAt: string;
}

interface AdListProps {
  filter?: 'all' | 'my-ads' | 'moderation';
}

const AdList: React.FC<AdListProps> = ({ filter = 'all' }) => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const { user, isAdmin } = useAuth();

  // Données simulées pour la démo
  const mockAds: Ad[] = [
    {
      id: 1,
      title: "Achat USDT en MAD",
      description: "Je cherche à acheter 1000 USDT avec paiement en MAD via virement bancaire.",
      price: 10.5,
      currency: "MAD",
      type: "buy",
      status: "active",
      user: { id: 1, fullName: "Ahmed Trader", reputation: 4.8 },
      createdAt: "2024-01-15T10:30:00Z"
    },
    {
      id: 2,
      title: "Vente USDT - Prix compétitif",
      description: "Je vends 500 USDT, transaction rapide et sécurisée. Taux négociable.",
      price: 10.3,
      currency: "MAD",
      type: "sell",
      status: "active",
      user: { id: 2, fullName: "Fatima Investor", reputation: 4.9 },
      createdAt: "2024-01-14T15:20:00Z"
    },
    {
      id: 3,
      title: "Achat urgent USDT",
      description: "Besoin de 2000 USDT rapidement. Paiement cash ou virement immédiat.",
      price: 10.6,
      currency: "MAD",
      type: "buy",
      status: "active",
      user: { id: 3, fullName: "Mehdi Seller", reputation: 4.5 },
      createdAt: "2024-01-16T08:15:00Z"
    }
  ];

  useEffect(() => {
    const loadAds = async () => {
      setLoading(true);
      
      // Simulation chargement API
      setTimeout(() => {
        let filteredAds = [...mockAds];
        
        // Appliquer les filtres
        if (filter === 'my-ads') {
          filteredAds = mockAds.filter(ad => ad.user.id === user?.id);
        } else if (filter === 'moderation') {
          filteredAds = mockAds.filter(ad => ad.status === 'pending');
        }
        
        setAds(filteredAds);
        setLoading(false);
      }, 1000);
    };

    loadAds();
  }, [filter, user]);

  const filteredAds = ads.filter(ad => {
    const matchesSearch = ad.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         ad.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = typeFilter === 'all' || ad.type === typeFilter;
    return matchesSearch && matchesType;
  });

  const getHeaderTitle = () => {
    switch (filter) {
      case 'my-ads': return 'Mes Annonces';
      case 'moderation': return 'Modération des Annonces';
      default: return 'Marketplace';
    }
  };

  const getHeaderDescription = () => {
    switch (filter) {
      case 'my-ads': return 'Gérez toutes vos annonces de vente et d\'achat';
      case 'moderation': return 'Annonces en attente de validation';
      default: return 'Parcourez toutes les annonces de la plateforme';
    }
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
        
        {filter === 'all' && (
          <Link to="/dashboard/ads/create" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i>
            Créer une Annonce
          </Link>
        )}
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
                  placeholder="Rechercher une annonce..."
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
              <div className="d-flex gap-2">
                <span className="badge bg-primary fs-6">{filteredAds.length} annonces</span>
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
                  : 'Aucune annonce disponible pour le moment.'
              }
            </p>
            {filter === 'my-ads' && (
              <Link to="/dashboard/ads/create" className="btn btn-primary mt-2">
                Créer ma première annonce
              </Link>
            )}
          </div>
        </div>
      ) : (
        <div className="row g-4">
          {filteredAds.map((ad) => (
            <div key={ad.id} className="col-xl-4 col-md-6">
              <div className={`card h-100 shadow-sm border-${ad.type === 'buy' ? 'success' : 'primary'}`}>
                <div className="card-header d-flex justify-content-between align-items-center">
                  <span className={`badge bg-${ad.type === 'buy' ? 'success' : 'primary'}`}>
                    {ad.type === 'buy' ? 'ACHAT' : 'VENTE'}
                  </span>
                  <span className="badge bg-secondary">
                    {ad.price} {ad.currency}/USDT
                  </span>
                </div>
                <div className="card-body">
                  <h5 className="card-title">{ad.title}</h5>
                  <p className="card-text text-muted">{ad.description}</p>
                  
                  <div className="d-flex justify-content-between align-items-center mb-3">
                    <div>
                      <small className="text-muted">Par</small>
                      <div className="fw-bold">{ad.user.fullName}</div>
                      <small className="text-warning">⭐ {ad.user.reputation}</small>
                    </div>
                    <div className="text-end">
                      <small className="text-muted">Créé le</small>
                      <div>{new Date(ad.createdAt).toLocaleDateString('fr-FR')}</div>
                    </div>
                  </div>
                </div>
                <div className="card-footer bg-transparent">
                  <div className="d-flex gap-2">
                    <button className="btn btn-primary btn-sm flex-fill">
                      <i className="bi bi-eye me-1"></i>
                      Voir Détails
                    </button>
                    {filter === 'my-ads' && (
                      <button className="btn btn-outline-secondary btn-sm">
                        <i className="bi bi-pencil"></i>
                      </button>
                    )}
                    {filter === 'moderation' && (
                      <>
                        <button className="btn btn-success btn-sm">
                          <i className="bi bi-check"></i>
                        </button>
                        <button className="btn btn-danger btn-sm">
                          <i className="bi bi-x"></i>
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
    </div>
  );
};

export default AdList;