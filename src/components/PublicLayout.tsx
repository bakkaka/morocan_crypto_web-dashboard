// src/components/PublicLayout.tsx
import React, { useState } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PublicLayout: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg navbar-dark navbar-gradient shadow-lg">
        <div className="container">
          {/* Logo */}
          <Link to="/" className="navbar-brand d-flex align-items-center">
            <div className="bg-warning rounded p-2 me-2">
              <span className="text-dark fw-bold fs-4">₿</span>
            </div>
            <span className="fs-3 fw-bold">CryptoMaroc</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="navbar-toggler"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Navigation Links */}
          <div className={`collapse navbar-collapse ${mobileMenuOpen ? 'show' : ''}`}>
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
              <li className="nav-item">
                <Link 
                  to="/" 
                  className={`nav-link ${isActive('/') ? 'active fw-bold' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <i className="bi bi-house-door me-1"></i> Accueil
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  to="/market" 
                  className={`nav-link ${isActive('/market') ? 'active fw-bold' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <i className="bi bi-shop me-1"></i> Marketplace
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  to="/how-it-works" 
                  className={`nav-link ${isActive('/how-it-works') ? 'active fw-bold' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <i className="bi bi-info-circle me-1"></i> Comment ça marche
                </Link>
              </li>
              <li className="nav-item">
                <Link 
                  to="/about" 
                  className={`nav-link ${isActive('/about') ? 'active fw-bold' : ''}`}
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <i className="bi bi-question-circle me-1"></i> À propos
                </Link>
              </li>
            </ul>

            {/* Auth Buttons */}
            <div className="d-flex flex-column flex-lg-row gap-2">
              {isAuthenticated ? (
                <>
                  <div className="d-none d-lg-flex align-items-center me-3">
                    <span className="text-white">
                      <i className="bi bi-person-circle me-1"></i>
                      Bonjour, {user?.fullName?.split(' ')[0] || 'Utilisateur'}
                    </span>
                  </div>
                  <Link 
                    to="/dashboard" 
                    className="btn btn-warning fw-bold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-speedometer2 me-1"></i> Dashboard
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="btn btn-outline-light"
                  >
                    <i className="bi bi-box-arrow-right me-1"></i> Déconnexion
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="btn btn-outline-light"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-box-arrow-in-right me-1"></i> Connexion
                  </Link>
                  <Link 
                    to="/register" 
                    className="btn btn-warning fw-bold"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-person-plus me-1"></i> S'inscrire
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="flex-grow-1">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="footer-bg text-white py-5 mt-auto">
        <div className="container">
          <div className="row">
            {/* Company Info */}
            <div className="col-lg-3 col-md-6 mb-4">
              <div className="d-flex align-items-center mb-3">
                <div className="bg-warning rounded p-2 me-2">
                  <span className="text-dark fw-bold">₿</span>
                </div>
                <h4 className="fw-bold mb-0">CryptoMaroc</h4>
              </div>
              <p className="text-light-emphasis">
                La première plateforme P2P marocaine pour échanger des cryptomonnaies en toute sécurité.
              </p>
              <div className="d-flex gap-2">
                <a href="#" className="btn btn-outline-light btn-sm rounded-circle">
                  <i className="bi bi-facebook"></i>
                </a>
                <a href="#" className="btn btn-outline-light btn-sm rounded-circle">
                  <i className="bi bi-twitter"></i>
                </a>
                <a href="#" className="btn btn-outline-light btn-sm rounded-circle">
                  <i className="bi bi-linkedin"></i>
                </a>
                <a href="#" className="btn btn-outline-light btn-sm rounded-circle">
                  <i className="bi bi-telegram"></i>
                </a>
              </div>
            </div>

            {/* Quick Links */}
            <div className="col-lg-3 col-md-6 mb-4">
              <h5 className="fw-bold mb-3 text-warning">Liens Rapides</h5>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <Link to="/market" className="text-light-emphasis text-decoration-none">
                    <i className="bi bi-chevron-right me-1"></i> Marketplace
                  </Link>
                </li>
                <li className="mb-2">
                  <Link to="/how-it-works" className="text-light-emphasis text-decoration-none">
                    <i className="bi bi-chevron-right me-1"></i> Comment ça marche
                  </Link>
                </li>
                <li className="mb-2">
                  <Link to="/about" className="text-light-emphasis text-decoration-none">
                    <i className="bi bi-chevron-right me-1"></i> À propos
                  </Link>
                </li>
                <li className="mb-2">
                  <Link to="/contact" className="text-light-emphasis text-decoration-none">
                    <i className="bi bi-chevron-right me-1"></i> Contact
                  </Link>
                </li>
              </ul>
            </div>

            {/* Legal */}
            <div className="col-lg-3 col-md-6 mb-4">
              <h5 className="fw-bold mb-3 text-warning">Légal</h5>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <Link to="/privacy" className="text-light-emphasis text-decoration-none">
                    <i className="bi bi-shield-check me-1"></i> Politique de confidentialité
                  </Link>
                </li>
                <li className="mb-2">
                  <Link to="/terms" className="text-light-emphasis text-decoration-none">
                    <i className="bi bi-file-text me-1"></i> Conditions d'utilisation
                  </Link>
                </li>
                <li className="mb-2">
                  <Link to="/aml" className="text-light-emphasis text-decoration-none">
                    <i className="bi bi-bank me-1"></i> Politique AML/KYC
                  </Link>
                </li>
                <li className="mb-2">
                  <Link to="/cookies" className="text-light-emphasis text-decoration-none">
                    <i className="bi bi-cookie me-1"></i> Cookies
                  </Link>
                </li>
              </ul>
            </div>

            {/* Contact */}
            <div className="col-lg-3 col-md-6 mb-4">
              <h5 className="fw-bold mb-3 text-warning">Contactez-nous</h5>
              <ul className="list-unstyled text-light-emphasis">
                <li className="mb-3">
                  <i className="bi bi-envelope text-warning me-2"></i>
                  support@cryptomaroc.ma
                </li>
                <li className="mb-3">
                  <i className="bi bi-telephone text-warning me-2"></i>
                  +212 522-XXXXXX
                </li>
                <li className="mb-3">
                  <i className="bi bi-geo-alt text-warning me-2"></i>
                  Casablanca, Maroc
                </li>
              </ul>
              <div className="alert alert-warning mt-4">
                <small>
                  <i className="bi bi-exclamation-triangle me-1"></i>
                  Les cryptomonnaies sont volatiles. Investissez avec prudence.
                </small>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-top border-secondary pt-4 mt-4 text-center">
            <p className="mb-2">
              &copy; {new Date().getFullYear()} CryptoMaroc P2P. Tous droits réservés.
            </p>
            <p className="text-light-emphasis small">
              Service 100% Marocain 🇲🇦 • Conforme à la réglementation marocaine
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default PublicLayout;