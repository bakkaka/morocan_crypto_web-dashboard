import React from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardLayout: React.FC = () => {
  const { user, logout, isAdmin, isUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

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

  const handleLogout = () => {
    logout();
    navigate('/');
  };

  const closeSidebar = () => {
    // Fermer la sidebar manuellement
    const sidebar = document.getElementById('sidebarMenu');
    if (sidebar) {
      sidebar.classList.remove('show');
      document.body.classList.remove('offcanvas-backdrop');
    }
  };

  const isActiveLink = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path);
  };

  return (
    <div className="min-vh-100 bg-light">
      {/* Header fixe en haut */}
      <header className="navbar navbar-dark bg-primary shadow-sm fixed-top" style={{ height: '60px', zIndex: 1030 }}>
        <div className="container-fluid">
          {/* Logo et bouton menu */}
          <div className="d-flex align-items-center">
            <button 
              className="btn btn-primary me-2" 
              type="button" 
              data-bs-toggle="offcanvas" 
              data-bs-target="#sidebarMenu"
            >
              <i className="bi bi-list"></i>
            </button>
            <Link className="navbar-brand fw-bold d-flex align-items-center" to="/dashboard">
              <span className="bg-warning text-dark rounded px-2 py-1 me-2">₿</span>
              MoroccanCrypto
              {isAdmin && (
                <span className="badge bg-danger ms-2">ADMIN</span>
              )}
            </Link>
          </div>

          {/* User info DIRECT - Plus de dropdown */}
          <div className="d-flex align-items-center">
            <div 
              className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center me-2" 
              style={{width: '32px', height: '32px'}}
            >
              <span className="fw-bold small">{user.fullName.charAt(0)}</span>
            </div>
            <div className="d-none d-md-block text-white me-3">
              <div className="small fw-bold">{user.fullName}</div>
              <div className="x-small text-white-50">
                {isAdmin ? 'Administrateur' : 'Utilisateur'}
              </div>
            </div>
            
            {/* Bouton déconnexion visible */}
            <button 
              className="btn btn-outline-light btn-sm" 
              onClick={handleLogout}
              title="Déconnexion"
            >
              <i className="bi bi-box-arrow-right"></i>
            </button>
          </div>
        </div>
      </header>

      {/* Sidebar Offcanvas - CORRIGÉE */}
      <div className="offcanvas offcanvas-start bg-dark text-white" tabIndex={-1} id="sidebarMenu" style={{width: '280px'}}>
        <div className="offcanvas-header border-bottom border-secondary">
          <h5 className="offcanvas-title">Navigation</h5>
          <button type="button" className="btn-close btn-close-white" data-bs-dismiss="offcanvas"></button>
        </div>
        <div className="offcanvas-body p-0">
          {/* User Profile Summary */}
          <div className="p-3 border-bottom border-secondary">
            <div className="d-flex align-items-center">
              <div 
                className="bg-warning text-dark rounded-circle d-flex align-items-center justify-content-center me-3" 
                style={{width: '48px', height: '48px'}}
              >
                <span className="fw-bold">{user.fullName.charAt(0)}</span>
              </div>
              <div>
                <div className="fw-bold">{user.fullName}</div>
                <small className="text-muted">{user.email}</small>
                <div>
                  <span className="badge bg-primary">{isAdmin ? 'Administrateur' : 'Utilisateur'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Navigation Links - CORRIGÉE */}
          <nav className="nav flex-column">
            
            {/* Section PRINCIPALE */}
            <div className="px-3 py-2 text-warning small fw-bold border-bottom border-secondary">
              PRINCIPAL
            </div>
            
            <Link 
              className={`nav-link text-white py-3 border-bottom border-secondary d-flex align-items-center ${
                isActiveLink('/dashboard') && !isActiveLink('/dashboard/') ? 'bg-primary' : ''
              }`}
              to="/dashboard"
              onClick={closeSidebar}
            >
              <i className="bi bi-speedometer2 me-3 fs-5"></i>
              <div>
                <div className="fw-bold">Tableau de Bord</div>
                <small className="text-muted">Vue d'ensemble</small>
              </div>
            </Link>

            {/* Section PORTEFEUILLE & TRADING */}
            <div className="px-3 py-2 text-info small fw-bold border-bottom border-secondary">
              TRADING
            </div>
            
            <Link 
              className={`nav-link text-white py-3 border-bottom border-secondary d-flex align-items-center ${
                isActiveLink('/dashboard/wallet') ? 'bg-primary' : ''
              }`}
              to="/dashboard/wallet"
              onClick={closeSidebar}
            >
              <i className="bi bi-wallet2 me-3 fs-5"></i>
              <div>
                <div className="fw-bold">Mon Portefeuille</div>
                <small className="text-muted">Solde USDT</small>
              </div>
            </Link>
            
            <Link 
              className={`nav-link text-white py-3 border-bottom border-secondary d-flex align-items-center ${
                isActiveLink('/dashboard/ads') ? 'bg-primary' : ''
              }`}
              to="/dashboard/ads"
              onClick={closeSidebar}
            >
              <i className="bi bi-megaphone me-3 fs-5"></i>
              <div>
                <div className="fw-bold">Marketplace</div>
                <small className="text-muted">Toutes les annonces</small>
              </div>
            </Link>

            {isUser && (
              <Link 
                className={`nav-link text-white py-3 border-bottom border-secondary d-flex align-items-center ${
                  isActiveLink('/dashboard/ads/create') ? 'bg-primary' : ''
                }`}
                to="/dashboard/ads/create"
                onClick={closeSidebar}
              >
                <i className="bi bi-plus-circle me-3 fs-5"></i>
                <div>
                  <div className="fw-bold">Créer Annonce</div>
                  <small className="text-muted">Nouvelle offre</small>
                </div>
              </Link>
            )}

            {isUser && (
              <Link 
                className={`nav-link text-white py-3 border-bottom border-secondary d-flex align-items-center ${
                  isActiveLink('/dashboard/ads/my') ? 'bg-primary' : ''
                }`}
                to="/dashboard/ads/my"
                onClick={closeSidebar}
              >
                <i className="bi bi-list-ul me-3 fs-5"></i>
                <div>
                  <div className="fw-bold">Mes Annonces</div>
                  <small className="text-muted">Gérer mes offres</small>
                </div>
              </Link>
            )}
            
            <Link 
              className={`nav-link text-white py-3 border-bottom border-secondary d-flex align-items-center ${
                isActiveLink('/dashboard/transactions') ? 'bg-primary' : ''
              }`}
              to="/dashboard/transactions"
              onClick={closeSidebar}
            >
              <i className="bi bi-arrow-left-right me-3 fs-5"></i>
              <div>
                <div className="fw-bold">Transactions</div>
                <small className="text-muted">Historique</small>
              </div>
            </Link>

            {/* Section PROFIL */}
            <div className="px-3 py-2 text-success small fw-bold border-bottom border-secondary">
              COMPTE
            </div>
            
            <Link 
              className={`nav-link text-white py-3 border-bottom border-secondary d-flex align-items-center ${
                isActiveLink('/dashboard/profile') ? 'bg-primary' : ''
              }`}
              to="/dashboard/profile"
              onClick={closeSidebar}
            >
              <i className="bi bi-person me-3 fs-5"></i>
              <div>
                <div className="fw-bold">Mon Profil</div>
                <small className="text-muted">Informations</small>
              </div>
            </Link>

            {/* Section ADMIN - Seulement pour les admins */}
            {isAdmin && (
              <>
                <div className="px-3 py-2 text-danger small fw-bold border-bottom border-secondary">
                  ADMINISTRATION
                </div>
                <Link 
                  className={`nav-link text-white py-3 border-bottom border-secondary d-flex align-items-center ${
                    isActiveLink('/dashboard/admin/users') ? 'bg-primary' : ''
                  }`}
                  to="/dashboard/admin/users"
                  onClick={closeSidebar}
                >
                  <i className="bi bi-people me-3 fs-5"></i>
                  <div>
                    <div className="fw-bold">Gestion Utilisateurs</div>
                    <small className="text-muted">Modération</small>
                  </div>
                </Link>
                <Link 
                  className={`nav-link text-white py-3 border-bottom border-secondary d-flex align-items-center ${
                    isActiveLink('/dashboard/admin/ads') ? 'bg-primary' : ''
                  }`}
                  to="/dashboard/admin/ads"
                  onClick={closeSidebar}
                >
                  <i className="bi bi-shield-check me-3 fs-5"></i>
                  <div>
                    <div className="fw-bold">Modération Annonces</div>
                    <small className="text-muted">Validation</small>
                  </div>
                </Link>
                <Link 
                  className={`nav-link text-white py-3 border-bottom border-secondary d-flex align-items-center ${
                    isActiveLink('/dashboard/admin/analytics') ? 'bg-primary' : ''
                  }`}
                  to="/dashboard/admin/analytics"
                  onClick={closeSidebar}
                >
                  <i className="bi bi-graph-up me-3 fs-5"></i>
                  <div>
                    <div className="fw-bold">Analytics</div>
                    <small className="text-muted">Statistiques</small>
                  </div>
                </Link>
              </>
            )}

            {/* Section SUPPORT */}
            <div className="px-3 py-2 text-muted small fw-bold border-bottom border-secondary">
              SUPPORT
            </div>
            
            <Link 
              className="nav-link text-white py-2 border-bottom border-secondary d-flex align-items-center"
              to="/help"
              onClick={closeSidebar}
            >
              <i className="bi bi-question-circle me-3"></i>
              Centre d'Aide
            </Link>
            
            <Link 
              className="nav-link text-white py-2 border-bottom border-secondary d-flex align-items-center"
              to="/contact"
              onClick={closeSidebar}
            >
              <i className="bi bi-envelope me-3"></i>
              Nous Contacter
            </Link>
          </nav>

          {/* Footer de la sidebar */}
          <div className="p-3 border-top border-secondary mt-auto">
            <div className="small text-muted">
              <div>Session active</div>
              <div className="text-success">
                <i className="bi bi-circle-fill me-1"></i>
                En ligne
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main style={{ paddingTop: '80px' }}>
        <div className="container-fluid">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DashboardLayout;