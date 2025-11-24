import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardHome: React.FC = () => {
  const { user, isAdmin, isUser } = useAuth();

  // Statistiques pour les users
  const getUserStats = () => [
    { 
      title: 'Mes Annonces', 
      value: '3', 
      icon: 'bi-megaphone', 
      color: 'primary',
      link: '/dashboard/ads/my'
    },
    { 
      title: 'Solde USDT', 
      value: '0.00', 
      icon: 'bi-wallet2', 
      color: 'success',
      link: '/dashboard/wallet'
    },
    { 
      title: 'Transactions', 
      value: '0', 
      icon: 'bi-arrow-left-right', 
      color: 'info',
      link: '/dashboard/transactions'
    },
    { 
      title: 'Rating', 
      value: '⭐ 5.0', 
      icon: 'bi-star', 
      color: 'warning',
      link: '/dashboard/profile'
    }
  ];

  // Statistiques pour les admins
  const getAdminStats = () => [
    { 
      title: 'Utilisateurs', 
      value: '156', 
      icon: 'bi-people', 
      color: 'primary',
      link: '/dashboard/admin/users'
    },
    { 
      title: 'Annonces', 
      value: '47', 
      icon: 'bi-megaphone', 
      color: 'success',
      link: '/dashboard/admin/ads'
    },
    { 
      title: 'Transactions', 
      value: '24', 
      icon: 'bi-arrow-left-right', 
      color: 'info',
      link: '/dashboard/transactions'
    },
    { 
      title: 'Revenus', 
      value: '2,450 MAD', 
      icon: 'bi-graph-up', 
      color: 'warning',
      link: '/dashboard/admin/analytics'
    }
  ];

  const stats = isAdmin ? getAdminStats() : getUserStats();

  return (
    <div className="container-fluid py-4">
      {/* En-tête personnalisé */}
      <div className="row mb-4">
        <div className="col-12">
          <div className={`card ${isAdmin ? 'bg-dark text-white' : 'bg-primary text-white'}`}>
            <div className="card-body py-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h1 className="h3 mb-2">
                    {isAdmin ? '🛡️ Tableau de Bord Administrateur' : `👋 Bonjour, ${user?.fullName}`}
                  </h1>
                  <p className="mb-0 opacity-75">
                    {isAdmin 
                      ? 'Supervision complète de la plateforme' 
                      : 'Bienvenue sur votre espace personnel de trading'
                    }
                  </p>
                </div>
                <div className="col-md-4 text-end">
                  <div 
                    className={`rounded-circle d-inline-flex align-items-center justify-content-center ${
                      isAdmin ? 'bg-warning text-dark' : 'bg-white text-primary'
                    }`} 
                    style={{width: '60px', height: '60px', fontSize: '24px'}}
                  >
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section Statistiques */}
      <div className="row mb-5">
        <div className="col-12">
          <h2 className="h4 mb-4">
            <i className="bi bi-graph-up me-2"></i>
            {isAdmin ? 'Aperçu de la Plateforme' : 'Mes Statistiques'}
          </h2>
          <div className="row">
            {stats.map((stat, index) => (
              <div key={index} className="col-xl-3 col-md-6 mb-4">
                <Link to={stat.link} className="text-decoration-none">
                  <div className={`card border-${stat.color} shadow-sm h-100 hover-lift`}>
                    <div className="card-body text-center">
                      <div className={`text-${stat.color} mb-3`}>
                        <i className={`bi ${stat.icon} fs-1`}></i>
                      </div>
                      <h3 className={`card-title text-${stat.color}`}>{stat.value}</h3>
                      <p className="card-text text-dark">{stat.title}</p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Section Actions Rapides */}
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-light">
              <h3 className="card-title mb-0">
                <i className="bi bi-lightning me-2"></i>
                {isAdmin ? 'Actions Administratives' : 'Actions Rapides'}
              </h3>
            </div>
            <div className="card-body">
              {isAdmin ? (
                // Actions Admin
                <div className="row g-3">
                  <div className="col-md-3">
                    <Link to="/dashboard/admin/users" className="btn btn-outline-primary w-100 py-3 text-start">
                      <i className="bi bi-people fs-2 d-block mb-2"></i>
                      <strong>Gérer Utilisateurs</strong>
                      <small className="text-muted d-block">Modération des comptes</small>
                    </Link>
                  </div>
                  <div className="col-md-3">
                    <Link to="/dashboard/admin/ads" className="btn btn-outline-success w-100 py-3 text-start">
                      <i className="bi bi-shield-check fs-2 d-block mb-2"></i>
                      <strong>Modérer Annonces</strong>
                      <small className="text-muted d-block">Validation contenu</small>
                    </Link>
                  </div>
                  <div className="col-md-3">
                    <Link to="/dashboard/admin/analytics" className="btn btn-outline-info w-100 py-3 text-start">
                      <i className="bi bi-graph-up fs-2 d-block mb-2"></i>
                      <strong>Analytics</strong>
                      <small className="text-muted d-block">Statistiques globales</small>
                    </Link>
                  </div>
                  <div className="col-md-3">
                    <Link to="/dashboard/transactions" className="btn btn-outline-warning w-100 py-3 text-start">
                      <i className="bi bi-eye fs-2 d-block mb-2"></i>
                      <strong>Surveillance</strong>
                      <small className="text-muted d-block">Transactions suspectes</small>
                    </Link>
                  </div>
                </div>
              ) : (
                // Actions User
                <div className="row g-3">
                  <div className="col-md-3">
                    <Link to="/dashboard/ads/create" className="btn btn-outline-primary w-100 py-3 text-start">
                      <i className="bi bi-plus-circle fs-2 d-block mb-2"></i>
                      <strong>Créer Annonce</strong>
                      <small className="text-muted d-block">Nouvelle offre</small>
                    </Link>
                  </div>
                  <div className="col-md-3">
                    <Link to="/dashboard/ads" className="btn btn-outline-success w-100 py-3 text-start">
                      <i className="bi bi-search fs-2 d-block mb-2"></i>
                      <strong>Marketplace</strong>
                      <small className="text-muted d-block">Voir les offres</small>
                    </Link>
                  </div>
                  <div className="col-md-3">
                    <Link to="/dashboard/wallet" className="btn btn-outline-warning w-100 py-3 text-start">
                      <i className="bi bi-wallet2 fs-2 d-block mb-2"></i>
                      <strong>Portefeuille</strong>
                      <small className="text-muted d-block">Gérer solde</small>
                    </Link>
                  </div>
                  <div className="col-md-3">
                    <Link to="/dashboard/profile" className="btn btn-outline-info w-100 py-3 text-start">
                      <i className="bi bi-person fs-2 d-block mb-2"></i>
                      <strong>Mon Profil</strong>
                      <small className="text-muted d-block">Paramètres</small>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Section Informative */}
      <div className="row mt-4">
        <div className="col-12">
          <div className={`alert ${isAdmin ? 'alert-warning' : 'alert-info'}`}>
            <h5 className="alert-heading">
              <i className={`bi ${isAdmin ? 'bi-shield-check' : 'bi-rocket'} me-2`}></i>
              {isAdmin ? 'Espace Administrateur' : 'Bienvenue sur MoroccanCrypto!'}
            </h5>
            <p className="mb-0">
              {isAdmin 
                ? 'Vous avez un accès complet à toutes les fonctionnalités de modération et de supervision de la plateforme.'
                : 'Commencez par explorer le marketplace ou créez votre première annonce pour démarrer vos échanges.'
              }
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;