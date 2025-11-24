// src/components/PublicLayout.tsx
import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface PublicLayoutProps {
  children: React.ReactNode;
}

const PublicLayout: React.FC<PublicLayoutProps> = ({ children }) => {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation publique - TOUJOURS visible */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow">
        <div className="container">
          {/* Logo */}
          <Link className="navbar-brand fw-bold d-flex align-items-center" to="/">
            <span className="bg-warning text-dark rounded px-2 py-1 me-2">₿</span>
            MoroccanCrypto
          </Link>

          {/* Bouton mobile */}
          <button 
            className="navbar-toggler" 
            type="button" 
            data-bs-toggle="collapse" 
            data-bs-target="#publicNavbar"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Navigation - TOUJOURS visible même connecté */}
          <div className="collapse navbar-collapse" id="publicNavbar">
            <div className="navbar-nav me-auto">
              <Link 
                className={`nav-link mx-2 ${location.pathname === '/' ? 'active' : ''}`} 
                to="/"
              >
                Accueil
              </Link>
              <Link 
                className={`nav-link mx-2 ${location.pathname === '/market' ? 'active' : ''}`} 
                to="/market"
              >
                Marché
              </Link>
              <Link 
                className={`nav-link mx-2 ${location.pathname === '/how-it-works' ? 'active' : ''}`} 
                to="/how-it-works"
              >
                Comment ça marche
              </Link>
              
              {/* Liens DASHBOARD visibles seulement si connecté */}
              {isAuthenticated && (
                <Link 
                  className={`nav-link mx-2 ${location.pathname.startsWith('/dashboard') ? 'active' : ''}`} 
                  to="/dashboard"
                >
                  Tableau de Bord
                </Link>
              )}
            </div>

            {/* Actions utilisateur */}
            <div className="navbar-nav align-items-center flex-row">
              {isAuthenticated ? (
                // Si connecté - menu utilisateur
                <div className="d-flex align-items-center">
                  <span className="text-white me-3 d-none d-md-block">
                    Bonjour, {user?.fullName}
                  </span>
                  <div className="dropdown">
                    <button 
                      className="btn btn-outline-light dropdown-toggle" 
                      type="button" 
                      data-bs-toggle="dropdown"
                    >
                      Mon Compte
                    </button>
                    <ul className="dropdown-menu dropdown-menu-end">
                      <li>
                        <Link className="dropdown-item" to="/dashboard">
                          <i className="bi bi-speedometer2 me-2"></i>
                          Tableau de Bord
                        </Link>
                      </li>
                      <li>
                        <Link className="dropdown-item" to="/dashboard/profile">
                          <i className="bi bi-person me-2"></i>
                          Mon Profil
                        </Link>
                      </li>
                      <li><hr className="dropdown-divider" /></li>
                      <li>
                        <Link className="dropdown-item text-danger" to="/logout">
                          <i className="bi bi-box-arrow-right me-2"></i>
                          Déconnexion
                        </Link>
                      </li>
                    </ul>
                  </div>
                </div>
              ) : (
                // Si non connecté - connexion/inscription
                <div className="d-flex align-items-center gap-2">
                  <Link 
                    to="/login" 
                    className={`btn btn-outline-light ${location.pathname === '/login' ? 'active' : ''}`}
                  >
                    Connexion
                  </Link>
                  <Link 
                    to="/register" 
                    className="btn btn-warning text-dark fw-bold"
                  >
                    Créer un compte
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Contenu des pages */}
      <main>
        {children}
      </main>

      {/* Footer public */}
      <footer className="bg-dark text-white py-4 mt-5">
        <div className="container">
          <div className="row">
            <div className="col-md-6">
              <h5>MoroccanCrypto</h5>
              <p className="mb-0">La plateforme P2P la plus simple au Maroc</p>
            </div>
            <div className="col-md-6 text-end">
              <p className="mb-0">&copy; 2024 MoroccanCrypto. Tous droits réservés.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;