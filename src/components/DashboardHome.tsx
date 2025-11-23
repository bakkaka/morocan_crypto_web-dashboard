import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardHome: React.FC = () => {
  const { user, isAdmin, isUser } = useAuth();

  // Statistiques différentes selon le rôle
  const getUserStats = () => {
    if (isAdmin) {
      return [
        { 
          title: 'Utilisateurs Total', 
          value: '156', 
          icon: 'bi-people', 
          color: 'primary',
          link: '/dashboard/users',
          btnText: 'Gérer'
        },
        { 
          title: 'Annonces Actives', 
          value: '47', 
          icon: 'bi-megaphone', 
          color: 'success',
          link: '/dashboard/ads',
          btnText: 'Voir'
        },
        { 
          title: 'Transactions Today', 
          value: '12', 
          icon: 'bi-arrow-left-right', 
          color: 'info',
          link: '/dashboard/transactions',
          btnText: 'Analyser'
        },
        { 
          title: 'Revenus Journaliers', 
          value: '2,450 MAD', 
          icon: 'bi-graph-up', 
          color: 'warning',
          link: '/dashboard/transactions',
          btnText: 'Détails'
        }
      ];
    } else {
      return [
        { 
          title: 'Mes Annonces', 
          value: '4', 
          icon: 'bi-megaphone', 
          color: 'primary',
          link: '/dashboard/ads',
          btnText: 'Gérer'
        },
        { 
          title: 'Transactions', 
          value: '0', 
          icon: 'bi-arrow-left-right', 
          color: 'success',
          link: '/dashboard/transactions',
          btnText: 'Voir'
        },
        { 
          title: 'Solde USDT', 
          value: '0.00', 
          icon: 'bi-wallet2', 
          color: 'warning',
          link: '/dashboard/profile',
          btnText: 'Recharger'
        },
        { 
          title: 'Rating', 
          value: '⭐ 5.0', 
          icon: 'bi-star', 
          color: 'info',
          link: '/dashboard/profile',
          btnText: 'Profil'
        }
      ];
    }
  };

  const getQuickActions = () => {
    if (isAdmin) {
      return [
        {
          title: 'Gestion Utilisateurs',
          description: 'Gérer tous les utilisateurs de la plateforme',
          icon: 'bi-people',
          color: 'primary',
          link: '/dashboard/users'
        },
        {
          title: 'Modération Annonces',
          description: 'Modérer les annonces et signalements',
          icon: 'bi-shield-check',
          color: 'success',
          link: '/dashboard/ads'
        },
        {
          title: 'Analytics',
          description: 'Statistiques et analyses de la plateforme',
          icon: 'bi-graph-up',
          color: 'info',
          link: '/dashboard/transactions'
        },
        {
          title: 'Paramètres Système',
          description: 'Configuration de la plateforme',
          icon: 'bi-gear',
          color: 'warning',
          link: '/dashboard/profile'
        }
      ];
    } else {
      return [
        {
          title: 'Créer Annonce',
          description: 'Publier une nouvelle offre d\'achat/vente',
          icon: 'bi-plus-circle',
          color: 'primary',
          link: '/dashboard/ads/create'
        },
        {
          title: 'Mes Transactions',
          description: 'Historique de vos échanges',
          icon: 'bi-arrow-left-right',
          color: 'success',
          link: '/dashboard/transactions'
        },
        {
          title: 'Mon Profil',
          description: 'Gérer vos informations personnelles',
          icon: 'bi-person',
          color: 'info',
          link: '/dashboard/profile'
        },
        {
          title: 'Portefeuille',
          description: 'Gérer votre solde et paiements',
          icon: 'bi-wallet2',
          color: 'warning',
          link: '/dashboard/profile'
        }
      ];
    }
  };

  const stats = getUserStats();
  const quickActions = getQuickActions();

  return (
    <div>
      {/* En-tête personnalisé selon le rôle */}
      <div className="row mb-5">
        <div className="col-12">
          <div className={`card ${isAdmin ? 'bg-dark text-white' : 'bg-primary text-white'}`}>
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h1 className="h2 mb-2">
                    Bonjour, {user?.fullName} 
                    {isAdmin ? ' 🛡️' : ' 👋'}
                  </h1>
                  <p className="mb-0 opacity-75">
                    {isAdmin 
                      ? 'Tableau de bord Administrateur - Supervision complète' 
                      : 'Tableau de bord - Vue d\'ensemble de vos activités'
                    }
                  </p>
                  {isAdmin && (
                    <div className="mt-2">
                      <span className="badge bg-warning text-dark">
                        <i className="bi bi-shield-check me-1"></i>
                        Accès Administrateur Complet
                      </span>
                    </div>
                  )}
                </div>
                <div className="col-md-4 text-end">
                  <div 
                    className={`rounded-circle d-inline-flex align-items-center justify-content-center ${
                      isAdmin ? 'bg-warning text-dark' : 'bg-white text-primary'
                    }`} 
                    style={{width: '80px', height: '80px', fontSize: '32px'}}
                  >
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques selon le rôle */}
      <div className="row mb-5">
        {stats.map((stat, index) => (
          <div key={index} className="col-md-3 mb-4">
            <div className={`card border-${stat.color} shadow-sm h-100`}>
              <div className="card-body text-center">
                <div className={`text-${stat.color} mb-3`}>
                  <i className={`bi ${stat.icon} fs-1`}></i>
                </div>
                <h3 className={`card-title text-${stat.color}`}>{stat.value}</h3>
                <p className="card-text">{stat.title}</p>
                <Link to={stat.link} className={`btn btn-${stat.color} btn-sm`}>
                  {stat.btnText}
                </Link>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation rapide selon le rôle */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-lightning me-2"></i>
                {isAdmin ? 'Actions Rapides Admin' : 'Actions Rapides'}
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                {quickActions.map((action, index) => (
                  <div key={index} className="col-md-3">
                    <Link 
                      to={action.link} 
                      className={`btn btn-outline-${action.color} w-100 py-3 text-start h-100`}
                    >
                      <i className={`bi ${action.icon} fs-2 mb-2 d-block`}></i>
                      <strong>{action.title}</strong>
                      <small className="text-muted d-block">{action.description}</small>
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Section supplémentaire pour les admins */}
      {isAdmin && (
        <div className="row mt-4">
          <div className="col-12">
            <div className="card border-danger">
              <div className="card-header bg-danger text-white">
                <h5 className="card-title mb-0">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  Zone Administrateur
                </h5>
              </div>
              <div className="card-body">
                <div className="alert alert-warning">
                  <strong>Attention:</strong> Vous avez accès à toutes les fonctionnalités sensibles du système.
                  Soyez prudent dans vos actions.
                </div>
                <div className="row">
                  <div className="col-md-6">
                    <ul className="list-group">
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Gestion des utilisateurs
                        <span className="badge bg-primary rounded-pill">156</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Annonces en attente
                        <span className="badge bg-warning rounded-pill">12</span>
                      </li>
                    </ul>
                  </div>
                  <div className="col-md-6">
                    <ul className="list-group">
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Transactions aujourd'hui
                        <span className="badge bg-success rounded-pill">24</span>
                      </li>
                      <li className="list-group-item d-flex justify-content-between align-items-center">
                        Signalements
                        <span className="badge bg-danger rounded-pill">3</span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardHome;