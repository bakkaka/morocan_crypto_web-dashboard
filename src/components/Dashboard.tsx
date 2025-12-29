import React, { useEffect, useMemo, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';

// Interface pour le breadcrumb
interface BreadcrumbItem {
  path: string;
  label: string;
}

// Interface pour NavLink props
interface NavLinkProps {
  to: string;
  icon: string;
  label: string;
  isActive: boolean;
}

// Composant NavLink séparé pour la performance
const NavLink: React.FC<NavLinkProps> = React.memo(({ to, icon, label, isActive }) => (
  <Link 
    className={`nav-link mx-2 ${isActive ? 'active fw-bold' : ''}`} 
    to={to}
    aria-current={isActive ? 'page' : undefined}
  >
    <i className={`${icon} me-1`}></i>
    <span className="d-none d-lg-inline">{label}</span>
  </Link>
));

NavLink.displayName = 'NavLink';

const Dashboard: React.FC = () => {
  const { user, logout, isAdmin, isUser } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Constantes pour l'environnement
  const isDevelopment = useMemo(() => 
    window.location.hostname === 'localhost' || 
    window.location.hostname === '127.0.0.1',
    []
  );

  // Debug roles seulement en dev
  useEffect(() => {
    if (isDevelopment && user) {
      console.log('🔍 DEBUG RÔLES:', {
        user,
        roles: user?.roles,
        isAdmin,
        isUser,
        rawStorage: localStorage.getItem('mc_auth_data')
      });
    }
  }, [user, isAdmin, isUser, isDevelopment]);

  // Vérification utilisateur avec timeout
  useEffect(() => {
    if (!user) {
      const timer = setTimeout(() => {
        navigate('/login');
      }, 3000);

      return () => clearTimeout(timer);
    }
  }, [user, navigate]);

  // Fonction mémoïsée pour vérifier les liens actifs
  const isActiveLink = useCallback((path: string): boolean => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  }, [location.pathname]);

  // Fonction utilitaire pour normaliser les rôles
  const normalizeRoles = useCallback((rolesInput: unknown): string[] => {
    // Cas null/undefined
    if (!rolesInput) return [];
    
    // Cas tableau
    if (Array.isArray(rolesInput)) {
      return rolesInput
        .map(r => String(r).toUpperCase().trim())
        .filter(r => r !== '');
    }
    
    // Cas chaîne
    if (typeof rolesInput === 'string') {
      const trimmed = rolesInput.trim();
      if (trimmed === '') return [];
      
      // Essayer de parser comme JSON
      if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
        try {
          // Nettoyer la chaîne JSON
          const cleanStr = trimmed
            .replace(/\[ "/g, '["')
            .replace(/", "/g, '","')
            .replace(/" \]/g, '"]')
            .replace(/'/g, '"');
          
          const parsed = JSON.parse(cleanStr) as unknown;
          if (Array.isArray(parsed)) {
            return parsed
              .map(r => String(r).toUpperCase().trim())
              .filter(r => r !== '');
          }
        } catch {
          // Si le parsing JSON échoue, continuer
        }
      }
      
      // Traiter comme une chaîne séparée par des virgules
      return trimmed
        .replace(/[\[\]"']/g, '')
        .split(',')
        .map(r => r.trim().toUpperCase())
        .filter(r => r !== '');
    }
    
    // Pour tout autre type
    return [String(rolesInput).toUpperCase().trim()];
  }, []);

  // Normalisation des rôles avec useMemo
  const normalizedRoles = useMemo(() => {
    return normalizeRoles(user?.roles);
  }, [user?.roles, normalizeRoles]);

  // Rôle d'affichage avec useMemo
  const displayRole = useMemo(() => {
    if (normalizedRoles.includes('ROLE_ADMIN')) return 'Administrateur';
    if (normalizedRoles.includes('ROLE_USER')) return 'Utilisateur';
    if (normalizedRoles.includes('ROLE_MODERATOR')) return 'Modérateur';
    return 'Membre';
  }, [normalizedRoles]);

  // Fonction de déconnexion
  const handleLogout = useCallback(() => {
    if (window.confirm('Êtes-vous sûr de vouloir vous déconnecter ?')) {
      logout();
    }
  }, [logout]);

  // Noms des pages pour le breadcrumb
  const breadcrumbLabels = useMemo<Record<string, string>>(() => ({
    'ads': 'Annonces',
    'transactions': 'Transactions',
    'users': 'Utilisateurs',
    'admin': 'Administration',
    'wallet': 'Portefeuille',
    'profile': 'Profil',
    'settings': 'Paramètres',
    'create': 'Créer',
    'edit': 'Modifier',
    'my': 'Mes',
    'details': 'Détails'
  }), []);

  // Générer le breadcrumb
  const breadcrumbItems = useMemo(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean);
    const items: BreadcrumbItem[] = [];
    
    // Toujours ajouter Dashboard comme premier élément
    if (pathSegments.length > 0 && pathSegments[0] === 'dashboard') {
      items.push({
        path: '/dashboard',
        label: 'Dashboard'
      });
    }
    
    for (let i = 1; i < pathSegments.length; i++) {
      const segment = pathSegments[i];
      const path = '/' + pathSegments.slice(0, i + 1).join('/');
      const label = breadcrumbLabels[segment] || segment;
      
      items.push({
        path,
        label: i === pathSegments.length - 1 ? label : label.charAt(0).toUpperCase() + label.slice(1)
      });
    }
    
    return items;
  }, [location.pathname, breadcrumbLabels]);

  // Obtenir les initiales de l'utilisateur
  const userInitials = useMemo(() => {
    if (!user?.fullName) return 'U';
    return user.fullName
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }, [user?.fullName]);

  // Affichage du loading
  if (!user) {
    return (
      <div className="min-vh-100 bg-gradient-light d-flex align-items-center justify-content-center">
        <div className="text-center">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3 text-muted">Chargement de votre profil...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-vh-100 d-flex flex-column bg-light">
      {/* DEBUG PANEL - Seulement en développement */}
      {isDevelopment && (
        <div className="bg-dark text-white p-2 small">
          <div className="container">
            <div className="row align-items-center">
              <div className="col-auto">
                <span className="badge bg-warning text-dark">DEV MODE</span>
              </div>
              <div className="col">
                ID: {user.id} | Rôles: {JSON.stringify(normalizedRoles)} | 
                Admin: {isAdmin.toString()} | User: {isUser.toString()}
              </div>
              <div className="col-auto">
                <button 
                  className="btn btn-sm btn-outline-light"
                  onClick={() => {
                    localStorage.clear();
                    window.location.reload();
                  }}
                  title="Effacer le cache local"
                  aria-label="Effacer le cache"
                >
                  <i className="bi bi-trash"></i> Clear Cache
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation principale */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow-lg sticky-top">
        <div className="container">
          {/* Brand */}
          <Link className="navbar-brand fw-bold d-flex align-items-center" to="/dashboard">
            <span className="bg-warning text-dark rounded px-2 py-1 me-2">₿</span>
            MoroccanCrypto
            {isAdmin && (
              <span className="badge bg-danger ms-2" aria-label="Administrateur">ADMIN</span>
            )}
          </Link>

          {/* Toggle button */}
          <button 
            className="navbar-toggler border-0" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#navbarNav"
            aria-label="Toggle navigation"
            aria-expanded="false"
            aria-controls="navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Navigation links */}
          <div className="collapse navbar-collapse" id="navbarNav">
            <div className="navbar-nav me-auto">
              {/* Lien communs */}
              <NavLink 
                to="/dashboard" 
                icon="bi-speedometer2" 
                label="Dashboard" 
                isActive={isActiveLink('/dashboard')}
              />
              
              <NavLink 
                to="/dashboard/ads" 
                icon="bi-megaphone" 
                label="Annonces" 
                isActive={isActiveLink('/dashboard/ads')}
              />
              
              <NavLink 
                to="/dashboard/transactions" 
                icon="bi-arrow-left-right" 
                label="Transactions" 
                isActive={isActiveLink('/dashboard/transactions')}
              />

              {/* Liens admin */}
              {isAdmin && (
                <>
                  <NavLink 
                    to="/dashboard/admin/users" 
                    icon="bi-people" 
                    label="Utilisateurs" 
                    isActive={isActiveLink('/dashboard/admin/users')}
                  />
                  
                  <div className="nav-item dropdown">
                    <button 
                      className={`nav-link mx-2 dropdown-toggle ${isActiveLink('/dashboard/admin') ? 'active' : ''}`}
                      data-bs-toggle="dropdown"
                      aria-expanded="false"
                      aria-haspopup="true"
                      aria-label="Menu administration"
                    >
                      <i className="bi bi-gear me-1"></i>
                      Administration
                    </button>
                    <ul className="dropdown-menu" aria-label="Sous-menu administration">
                      <li>
                        <Link className="dropdown-item" to="/dashboard/admin">
                          <i className="bi bi-speedometer me-2"></i>
                          Tableau de bord
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item" to="/dashboard/admin/ads">
                          <i className="bi bi-megaphone me-2"></i>
                          Modération annonces
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item" to="/dashboard/admin/transactions">
                          <i className="bi bi-arrow-left-right me-2"></i>
                          Surveillance transactions
                        </Link>
                      </li>
                      <li><hr className="dropdown-divider" /></li>
                      <li>
                        <Link className="dropdown-item" to="/dashboard/admin/settings">
                          <i className="bi bi-sliders me-2"></i>
                          Paramètres système
                        </Link>
                      </li>
                    </ul>
                  </div>
                </>
              )}

              {/* Liens utilisateur */}
              {isUser && (
                <>
                  <NavLink 
                    to="/dashboard/ads/create" 
                    icon="bi-plus-circle" 
                    label="Créer Annonce" 
                    isActive={isActiveLink('/dashboard/ads/create')}
                  />
                  
                  <NavLink 
                    to="/dashboard/wallet" 
                    icon="bi-wallet" 
                    label="Portefeuille" 
                    isActive={isActiveLink('/dashboard/wallet')}
                  />
                </>
              )}
            </div>

            {/* User menu */}
            <div className="navbar-nav align-items-center">
              <div className="d-flex align-items-center gap-3">
                <Link 
                  className={`nav-link ${isActiveLink('/dashboard/profile') ? 'active' : ''}`} 
                  to="/dashboard/profile"
                  aria-label="Accéder au profil"
                >
                  <i className="bi bi-person me-1"></i>
                  <span className="d-none d-md-inline">Profil</span>
                </Link>
                
                {/* User avatar and dropdown */}
                <div className="dropdown">
                  <button 
                    className="btn btn-light rounded-circle d-flex align-items-center justify-content-center p-0" 
                    type="button" 
                    data-bs-toggle="dropdown"
                    style={{ width: '40px', height: '40px' }}
                    aria-expanded="false"
                    aria-label={`Menu utilisateur pour ${user.fullName || 'Utilisateur'}`}
                    title={`${user.fullName || 'Utilisateur'} - ${displayRole}`}
                  >
                    <span className="fw-bold text-primary">
                      {userInitials}
                    </span>
                  </button>
                  
                  <ul className="dropdown-menu dropdown-menu-end shadow-lg" aria-label="Menu utilisateur">
                    <li>
                      <div className="dropdown-header">
                        <div className="fw-bold">{user.fullName || 'Utilisateur'}</div>
                        <small className="text-muted">{user.email}</small>
                        <div className="mt-1">
                          <span className="badge bg-primary">{displayRole}</span>
                        </div>
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
                    
                    {isAdmin && (
                      <li>
                        <Link className="dropdown-item text-warning" to="/dashboard/admin">
                          <i className="bi bi-shield-check me-2"></i>
                          Espace Admin
                        </Link>
                      </li>
                    )}
                    
                    <li><hr className="dropdown-divider" /></li>
                    
                    <li>
                      <button 
                        className="dropdown-item text-danger" 
                        onClick={handleLogout}
                        aria-label="Se déconnecter"
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

      {/* Admin banner */}
      {isAdmin && (
        <div className="bg-warning bg-opacity-10 border-start border-warning border-5 py-1">
          <div className="container">
            <div className="d-flex align-items-center justify-content-between">
              <div className="d-flex align-items-center">
                <i className="bi bi-shield-check text-warning me-2"></i>
                <small className="text-warning">
                  <strong>Mode Administrateur</strong> - Accès complet au système de modération
                </small>
              </div>
              <div className="text-warning small">
                <i className="bi bi-person-badge me-1"></i>
                {displayRole}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Main content */}
      <main className="flex-grow-1 py-4">
        <div className="container">
          {/* Breadcrumb amélioré */}
          {breadcrumbItems.length > 0 && (
            <nav aria-label="Fil d'Ariane" className="mb-4">
              <ol className="breadcrumb bg-light rounded p-2 shadow-sm">
                {breadcrumbItems.map((item, index) => (
                  <li 
                    key={`${item.path}-${index}`} 
                    className={`breadcrumb-item ${index === breadcrumbItems.length - 1 ? 'active' : ''}`}
                    aria-current={index === breadcrumbItems.length - 1 ? 'page' : undefined}
                  >
                    {index === breadcrumbItems.length - 1 ? (
                      <span>{item.label}</span>
                    ) : (
                      <Link to={item.path} className="text-decoration-none">
                        {item.label}
                      </Link>
                    )}
                  </li>
                ))}
              </ol>
            </nav>
          )}

          {/* Outlet content */}
          <div className="card border-0 shadow-lg rounded-3 overflow-hidden">
            <div className="card-body p-0">
              <Outlet />
            </div>
          </div>

          {/* Debug info - seulement en dev */}
          {isDevelopment && (
            <div className="mt-4">
              <details className="border rounded p-2">
                <summary className="text-muted small cursor-pointer">Debug Information</summary>
                <pre className="mt-2 p-2 bg-dark text-white rounded small" style={{ fontSize: '11px', maxHeight: '200px', overflow: 'auto' }}>
                  {JSON.stringify({
                    timestamp: new Date().toISOString(),
                    path: location.pathname,
                    user: { 
                      id: user.id, 
                      email: user.email,
                      name: user.fullName,
                      isVerified: user.isVerified 
                    },
                    roles: normalizedRoles,
                    permissions: { 
                      isAdmin, 
                      isUser
                    },
                    session: {
                      storageKeys: Object.keys(localStorage).filter(k => k.includes('mc_')),
                      hostname: window.location.hostname
                    }
                  }, null, 2)}
                </pre>
              </details>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="bg-dark text-white py-4 mt-auto">
        <div className="container">
          <div className="row align-items-center">
            <div className="col-md-6">
              <div className="d-flex align-items-center mb-2">
                <span className="text-warning fw-bold fs-5">MoroccanCrypto P2P</span>
                <span className="badge bg-success ms-2">Bêta</span>
              </div>
              <p className="small text-white-50 mb-0">
                Plateforme sécurisée d'échange crypto-monnaies P2P
              </p>
            </div>
            
            <div className="col-md-6 text-md-end">
              <div className="d-flex flex-wrap justify-content-md-end gap-2">
                <span className="badge bg-secondary">v1.2.0</span>
                <span className={`badge ${isAdmin ? 'bg-warning text-dark' : 'bg-info'}`}>
                  {isAdmin ? 'Mode Administrateur' : 'Mode Utilisateur'}
                </span>
                <span className="badge bg-light text-dark">
                  <i className="bi bi-shield-check me-1"></i>
                  Sécurisé
                </span>
              </div>
              <div className="small text-white-50 mt-2">
                &copy; {new Date().getFullYear()} - Tous droits réservés
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Dashboard;