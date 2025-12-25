import React, { useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, Outlet, useLocation } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, logout, isAdmin, isUser } = useAuth();
  const location = useLocation();

  // DEBUG des rôles
  useEffect(() => {
    console.log('🔍 DEBUG RÔLES:', {
      user,
      roles: user?.roles,
      rolesType: typeof user?.roles,
      isAdmin: isAdmin,
      isUser: isUser,
      rawStorage: localStorage.getItem('mc_auth_data')
    });
  }, [user, isAdmin, isUser]);

  // Déterminer si on est en développement
  const isDevelopment = window.location.hostname === 'localhost' || 
                       window.location.hostname === '127.0.0.1';

  if (!user) {
    return (
      <div className="min-vh-100 bg-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3">Chargement du profil...</p>
        </div>
      </div>
    );
  }

  // Fonction pour déterminer si un lien est actif
  const isActiveLink = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + '/');
  };

  // Fonction pour normaliser les rôles
  const normalizeRoles = (roles: any): string[] => {
    if (!roles) return [];
    
    if (Array.isArray(roles)) {
      return roles.map(r => String(r).toUpperCase().trim());
    }
    
    if (typeof roles === 'string') {
      try {
        const cleanStr = roles
          .replace(/\[ "/g, '["')
          .replace(/", "/g, '","')
          .replace(/" \]/g, '"]')
          .replace(/'/g, '"');
        
        const parsed = JSON.parse(cleanStr);
        if (Array.isArray(parsed)) {
          return parsed.map(r => String(r).toUpperCase().trim());
        }
        return [String(parsed).toUpperCase().trim()];
      } catch {
        return roles
          .replace(/[\[\]"']/g, '')
          .split(',')
          .map((r: string) => r.trim().toUpperCase());
      }
    }
    
    return [];
  };

  // Rôles normalisés pour l'affichage
  const normalizedRoles = normalizeRoles(user.roles);
  const displayRole = normalizedRoles.includes('ROLE_ADMIN') ? 'Administrateur' : 
                     normalizedRoles.includes('ROLE_USER') ? 'Utilisateur' : 'Membre';

  return (
    <div className="min-vh-100 bg-light">
      {/* DEBUG PANEL - Seulement en développement local */}
      {isDevelopment && (
        <div className="bg-dark text-white p-2 small">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-auto">
                <span className="badge bg-warning text-dark">DEV MODE</span>
              </div>
              <div className="col">
                ID: {user.id} | Rôles: {JSON.stringify(normalizedRoles)} | 
                isAdmin: {isAdmin.toString()} | isUser: {isUser.toString()}
              </div>
              <div className="col-auto">
                <button 
                  className="btn btn-sm btn-outline-light"
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                >
                  Clear Cache
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <div className="navbar-nav me-auto">
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

              {isAdmin && (
                <>
                  <Link 
                    className={`nav-link mx-2 ${isActiveLink('/dashboard/users') ? 'active' : ''}`} 
                    to="/dashboard/users"
                  >
                    <i className="bi bi-people me-1"></i>
                    Utilisateurs
                  </Link>
                  
                  <Link 
                    className={`nav-link mx-2 ${isActiveLink('/dashboard/admin') ? 'active' : ''}`} 
                    to="/dashboard/admin"
                  >
                    <i className="bi bi-gear me-1"></i>
                    Administration
                  </Link>
                </>
              )}

              {isUser && (
                <>
                  <Link 
                    className={`nav-link mx-2 ${isActiveLink('/dashboard/ads/create') ? 'active' : ''}`} 
                    to="/dashboard/ads/create"
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    Créer Annonce
                  </Link>
                  
                  <Link 
                    className={`nav-link mx-2 ${isActiveLink('/dashboard/wallet') ? 'active' : ''}`} 
                    to="/dashboard/wallet"
                  >
                    <i className="bi bi-wallet me-1"></i>
                    Mon Portefeuille
                  </Link>
                </>
              )}
            </div>

            <div className="navbar-nav align-items-center flex-row">
              <Link 
                className={`nav-link mx-2 ${isActiveLink('/dashboard/profile') ? 'active' : ''}`} 
                to="/dashboard/profile"
              >
                <i className="bi bi-person me-1"></i>
                Profil
              </Link>
              
              <div className="d-flex align-items-center ms-3">
                <div 
                  className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center me-2" 
                  style={{width: '32px', height: '32px', flexShrink: 0}}
                >
                  <span className="fw-bold small">{user.fullName?.charAt(0) || 'U'}</span>
                </div>
                
                <div className="d-none d-md-block text-start me-3">
                  <div className="small text-white fw-bold">{user.fullName || 'Utilisateur'}</div>
                  <div className="x-small text-white-50">
                    {displayRole}
                  </div>
                </div>
                
                <div className="dropdown">
                  <button 
                    className="btn btn-outline-light dropdown-toggle d-flex align-items-center" 
                    type="button" 
                    data-bs-toggle="dropdown"
                    style={{padding: '6px 12px'}}
                    aria-expanded="false"
                  >
                    <i className="bi bi-three-dots-vertical"></i>
                  </button>
                  <ul className="dropdown-menu dropdown-menu-end shadow">
                    <li>
                      <div className="dropdown-header">
                        <div className="fw-bold">{user.fullName}</div>
                        <small className="text-muted">{user.email}</small>
                      </div>
                    </li>
                    <li><hr className="dropdown-divider" /></li>
                    <li>
                      <Link className="dropdown-item" to="/dashboard/profile">
                        <i className="bi bi-person me-2"></i>
                        Mon Profil
                      </Link>
                    </li>
                    <li>
                      <Link className="dropdown-item" to="/dashboard/settings">
                        <i className="bi bi-gear me-2"></i>
                        Paramètres
                      </Link>
                    </li>
                    <li>
                      <button 
                        className="dropdown-item text-danger" 
                        onClick={() => {
                          if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
                            logout();
                          }
                        }}
                      >
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

      {isAdmin && (
        <div className="bg-warning bg-opacity-10 border-start border-warning border-5">
          <div className="container py-2">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="bi bi-shield-check text-warning me-2"></i>
                <small className="text-warning">
                  <strong>Mode Administrateur</strong> - Accès complet au système
                </small>
              </div>
              <div className="text-warning small">
                Rôles: {normalizedRoles.join(', ')}
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="container mt-4 mb-5">
        <div className="row">
          <div className="col-12">
            <nav aria-label="breadcrumb" className="mb-4">
              <ol className="breadcrumb">
                <li className="breadcrumb-item">
                  <Link to="/dashboard">Dashboard</Link>
                </li>
                {location.pathname !== '/dashboard' && (
                  <li className="breadcrumb-item active" aria-current="page">
                    {location.pathname.split('/').pop()}
                  </li>
                )}
              </ol>
            </nav>
            
            <div className="card shadow-sm">
              <div className="card-body">
                <Outlet />
              </div>
            </div>
            
            {/* Debug info seulement en local */}
            {isDevelopment && (
              <div className="mt-3 text-muted small">
                <details>
                  <summary>Debug Info</summary>
                  <pre className="mt-2 p-2 bg-dark text-white rounded" style={{fontSize: '12px'}}>
                    {JSON.stringify({
                      path: location.pathname,
                      user: { id: user.id, email: user.email },
                      roles: normalizedRoles,
                      permissions: { isAdmin, isUser },
                      hostname: window.location.hostname
                    }, null, 2)}
                  </pre>
                </details>
              </div>
            )}
          </div>
        </div>
      </div>

      <footer className="bg-dark text-white py-3 mt-auto">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <span className="text-warning">MoroccanCrypto P2P</span> &copy; {new Date().getFullYear()}
            </div>
            <div className="col-md-6 text-md-end">
              <span className="badge bg-secondary me-2">
                v1.0.0
              </span>
              <span className="badge bg-info">
                {isAdmin ? 'Mode Admin' : 'Mode Utilisateur'}
              </span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;