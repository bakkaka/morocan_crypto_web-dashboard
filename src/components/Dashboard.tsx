import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, Outlet, useLocation } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, logout, isAdmin, isUser } = useAuth();
  const location = useLocation();

  if (!user) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3">Chargement...</p>
        </div>
      </div>
    );
  }

  // Fonction pour déterminer si un lien est actif
  const isActiveLink = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation Bootstrap avec séparation des rôles */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow">
        <div className="container">
          <Link className="navbar-brand fw-bold d-flex align-items-center" to="/dashboard">
            <span className="bg-warning text-dark rounded px-2 py-1 me-2">₿</span>
            MoroccanCrypto
            {isAdmin && (
              <span className="badge bg-danger ms-2">ADMIN</span>
            )}
          </Link>

          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <div className="navbar-nav me-auto">
              {/* Liens communs à tous les utilisateurs */}
              <Link 
                className={`nav-link mx-2 ${isActiveLink('/dashboard') ? 'active' : ''}`} 
                to="/dashboard"
              >
                <i className="bi bi-speedometer2 me-1"></i>
                Dashboard
              </Link>
              
              <Link 
                className={`nav-link mx-2 ${isActiveLink('/dashboard/ads') ? 'active' : ''}`} 
                to="/dashboard/ads"
              >
                <i className="bi bi-megaphone me-1"></i>
                Annonces
              </Link>
              
              <Link 
                className={`nav-link mx-2 ${isActiveLink('/dashboard/transactions') ? 'active' : ''}`} 
                to="/dashboard/transactions"
              >
                <i className="bi bi-arrow-left-right me-1"></i>
                Transactions
              </Link>

              {/* Liens réservés aux ADMINS */}
              {isAdmin && (
                <Link 
                  className={`nav-link mx-2 ${isActiveLink('/dashboard/users') ? 'active' : ''}`} 
                  to="/dashboard/users"
                >
                  <i className="bi bi-people me-1"></i>
                  Utilisateurs
                </Link>
              )}

              {/* Liens réservés aux USERS */}
              {isUser && (
                <Link 
                  className={`nav-link mx-2 ${isActiveLink('/dashboard/ads/create') ? 'active' : ''}`} 
                  to="/dashboard/ads/create"
                >
                  <i className="bi bi-plus-circle me-1"></i>
                  Créer Annonce
                </Link>
              )}
            </div>

            <div className="navbar-nav align-items-center flex-row">
              {/* Lien Profil */}
              <Link 
                className={`nav-link mx-2 ${isActiveLink('/dashboard/profile') ? 'active' : ''}`} 
                to="/dashboard/profile"
              >
                <i className="bi bi-person me-1"></i>
                Profil
              </Link>
              
              {/* Affichage du nom d'utilisateur TOUJOURS visible */}
              <div className="d-flex align-items-center ms-3">
                {/* Avatar avec initiale */}
                <div 
                  className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center me-2" 
                  style={{width: '32px', height: '32px', flexShrink: 0}}
                >
                  <span className="fw-bold small">{user.fullName.charAt(0)}</span>
                </div>
                
                {/* Nom d'utilisateur - visible sur desktop, caché sur mobile */}
                <div className="d-none d-md-block text-start me-3">
                  <div className="small text-white fw-bold">{user.fullName}</div>
                  <div className="x-small text-white-50">
                    {isAdmin ? 'Administrateur' : 'Utilisateur'}
                  </div>
                </div>
                
                {/* Dropdown pour les actions */}
                <div className="dropdown">
                  <button 
                    className="btn btn-outline-light dropdown-toggle" 
                    type="button" 
                    data-bs-toggle="dropdown"
                    style={{padding: '6px 12px'}}
                  >
                    <i className="bi bi-chevron-down"></i>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end">
                    <li>
                      <span className="dropdown-item-text small">
                        <strong>{user.fullName}</strong>
                      </span>
                      <span className="dropdown-item-text small text-muted">
                        {user.email}
                      </span>
                      {user.roles && (
                        <span className="dropdown-item-text small text-muted">
                          Rôle: {isAdmin ? 'Administrateur' : 'Utilisateur'}
                        </span>
                      )}
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <Link className="dropdown-item" to="/dashboard/profile">
                        <i className="bi bi-person me-2"></i>
                        Mon Profil
                      </Link>
                    </li>
                    <li>
                      <button className="dropdown-item text-danger" onClick={logout}>
                        <i className="bi bi-box-arrow-right me-2"></i>
                        Déconnexion
                      </button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Section d'information du rôle */}
      {isAdmin && (
        <div className="bg-warning bg-opacity-10 border-start border-warning border-5">
          <div className="container py-2">
            <div className="d-flex align-items-center">
              <i className="bi bi-shield-check text-warning me-2"></i>
              <small className="text-warning">
                <strong>Mode Administrateur</strong> - Vous avez accès à toutes les fonctionnalités
              </small>
            </div>
          </div>
        </div>
      )}

      {/* Contenu des routes enfants */}
      <div className="container mt-4">
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;