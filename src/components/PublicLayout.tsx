// src/components/PublicLayout.tsx - VERSION OPTIMISÉE
import React, { useState, useEffect } from 'react';
import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const PublicLayout: React.FC = () => {
  const { isAuthenticated, user, logout, isAdmin } = useAuth();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  // Effet pour gérer le scroll de la navbar
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const handleLogout = async () => {
    await logout();
    window.location.href = '/';
  };

  // Navigation items
  const navItems = [
    { path: '/', label: 'Accueil', icon: 'bi-house-door' },
    { path: '/market', label: 'Marketplace', icon: 'bi-shop' },
    { path: '/how-it-works', label: 'Comment ça marche', icon: 'bi-info-circle' },
    { path: '/about', label: 'À propos', icon: 'bi-question-circle' },
  ];

  // Footer links organized
  const footerLinks = {
    quickLinks: [
      { path: '/market', label: 'Marketplace', icon: 'bi-chevron-right' },
      { path: '/how-it-works', label: 'Comment ça marche', icon: 'bi-chevron-right' },
      { path: '/about', label: 'À propos', icon: 'bi-chevron-right' },
      { path: '/contact', label: 'Contact', icon: 'bi-chevron-right' },
    ],
    legalLinks: [
      { path: '/privacy', label: 'Politique de confidentialité', icon: 'bi-shield-check' },
      { path: '/terms', label: 'Conditions d\'utilisation', icon: 'bi-file-text' },
      { path: '/aml', label: 'Politique AML/KYC', icon: 'bi-bank' },
      { path: '/cookies', label: 'Cookies', icon: 'bi-cookie' },
    ],
    contactInfo: [
      { icon: 'bi-envelope', text: 'support@cryptomaroc.ma' },
      { icon: 'bi-telephone', text: '+212 522-XXXXXX' },
      { icon: 'bi-geo-alt', text: 'Casablanca, Maroc' },
    ],
    socialLinks: [
      { icon: 'bi-facebook', url: '#', label: 'Facebook' },
      { icon: 'bi-twitter', url: '#', label: 'Twitter' },
      { icon: 'bi-linkedin', url: '#', label: 'LinkedIn' },
      { icon: 'bi-telegram', url: '#', label: 'Telegram' },
    ],
  };

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* NAVBAR */}
      <nav className={`navbar navbar-expand-lg navbar-dark navbar-gradient shadow-lg fixed-top ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="container">
          {/* Logo */}
          <Link to="/" className="navbar-brand d-flex align-items-center" onClick={() => setMobileMenuOpen(false)}>
            <div className="bg-warning rounded p-2 me-2">
              <span className="text-dark fw-bold fs-4">₿</span>
            </div>
            <span className="fs-3 fw-bold d-none d-md-inline">CryptoMaroc</span>
            <span className="fs-3 fw-bold d-inline d-md-none">CM</span>
          </Link>

          {/* Mobile Menu Button */}
          <button
            className="navbar-toggler"
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          {/* Navigation Links */}
          <div className={`collapse navbar-collapse ${mobileMenuOpen ? 'show' : ''}`}>
            <ul className="navbar-nav mx-auto mb-2 mb-lg-0">
              {navItems.map((item) => (
                <li key={item.path} className="nav-item">
                  <Link 
                    to={item.path} 
                    className={`nav-link ${isActive(item.path) ? 'active fw-bold' : ''}`}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className={`bi ${item.icon} me-1`}></i> 
                    {item.label}
                  </Link>
                </li>
              ))}
              
              {/* Indicateur pour utilisateurs connectés */}
              {isAuthenticated && (
                <li className="nav-item d-lg-none">
                  <div className="nav-link text-success">
                    <i className="bi bi-check-circle me-1"></i>
                    Connecté en tant que {user?.fullName?.split(' ')[0] || 'Utilisateur'}
                  </div>
                </li>
              )}
            </ul>

            {/* Auth Buttons */}
            <div className="d-flex flex-column flex-lg-row gap-2">
              {isAuthenticated ? (
                <>
                  <div className="d-none d-lg-flex align-items-center me-3">
                    <div className="d-flex align-items-center">
                      <div className="bg-success bg-opacity-25 rounded-circle p-1 me-2">
                        <i className="bi bi-check-circle text-success"></i>
                      </div>
                      <div>
                        <span className="text-white small d-block">
                          Bonjour, <strong>{user?.fullName?.split(' ')[0] || 'Utilisateur'}</strong>
                        </span>
                        {isAdmin && (
                          <span className="badge bg-danger bg-opacity-50 small">ADMIN</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <Link 
                    to="/dashboard" 
                    className="btn btn-warning fw-bold d-flex align-items-center justify-content-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-speedometer2 me-1"></i> 
                    <span className="d-none d-md-inline">Dashboard</span>
                    <span className="d-inline d-md-none">Dashboard</span>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="btn btn-outline-light d-flex align-items-center justify-content-center"
                  >
                    <i className="bi bi-box-arrow-right me-1"></i>
                    <span className="d-none d-lg-inline">Déconnexion</span>
                  </button>
                </>
              ) : (
                <>
                  <Link 
                    to="/login" 
                    className="btn btn-outline-light d-flex align-items-center justify-content-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-box-arrow-in-right me-1"></i>
                    <span className="d-none d-lg-inline">Connexion</span>
                    <span className="d-inline d-lg-none">Se connecter</span>
                  </Link>
                  <Link 
                    to="/register" 
                    className="btn btn-warning fw-bold d-flex align-items-center justify-content-center"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <i className="bi bi-person-plus me-1"></i>
                    <span className="d-none d-lg-inline">S'inscrire</span>
                    <span className="d-inline d-lg-none">Inscription</span>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content avec padding pour la navbar fixe */}
      <main className="flex-grow-1 pt-5 mt-4">
        <Outlet />
      </main>

      {/* FOOTER */}
      <footer className="footer-bg text-white py-5 mt-auto">
        <div className="container">
          <div className="row g-4">
            {/* Company Info */}
            <div className="col-lg-3 col-md-6 mb-4">
              <div className="d-flex align-items-center mb-3">
                <div className="bg-warning rounded p-2 me-2">
                  <span className="text-dark fw-bold">₿</span>
                </div>
                <h4 className="fw-bold mb-0">CryptoMaroc</h4>
              </div>
              <p className="text-light-emphasis mb-4">
                La première plateforme P2P marocaine pour échanger des cryptomonnaies en toute sécurité.
              </p>
              <div className="d-flex gap-2">
                {footerLinks.socialLinks.map((social, index) => (
                  <a 
                    key={index}
                    href={social.url} 
                    className="btn btn-outline-light btn-sm rounded-circle"
                    aria-label={social.label}
                    title={social.label}
                  >
                    <i className={`bi ${social.icon}`}></i>
                  </a>
                ))}
              </div>
            </div>

            {/* Quick Links */}
            <div className="col-lg-3 col-md-6 mb-4">
              <h5 className="fw-bold mb-3 text-warning">Liens Rapides</h5>
              <ul className="list-unstyled">
                {footerLinks.quickLinks.map((link, index) => (
                  <li key={index} className="mb-2">
                    <Link 
                      to={link.path} 
                      className="text-light-emphasis text-decoration-none d-flex align-items-center hover-link"
                    >
                      <i className={`bi ${link.icon} me-2`}></i>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Legal */}
            <div className="col-lg-3 col-md-6 mb-4">
              <h5 className="fw-bold mb-3 text-warning">Légal</h5>
              <ul className="list-unstyled">
                {footerLinks.legalLinks.map((link, index) => (
                  <li key={index} className="mb-2">
                    <Link 
                      to={link.path} 
                      className="text-light-emphasis text-decoration-none d-flex align-items-center hover-link"
                    >
                      <i className={`bi ${link.icon} me-2`}></i>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Contact */}
            <div className="col-lg-3 col-md-6 mb-4">
              <h5 className="fw-bold mb-3 text-warning">Contactez-nous</h5>
              <ul className="list-unstyled text-light-emphasis">
                {footerLinks.contactInfo.map((contact, index) => (
                  <li key={index} className="mb-3 d-flex align-items-start">
                    <i className={`bi ${contact.icon} text-warning me-2 mt-1`}></i>
                    <span>{contact.text}</span>
                  </li>
                ))}
              </ul>
              <div className="alert alert-warning alert-sm mt-4">
                <small className="d-flex align-items-center">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <div>
                    <strong>Investissement responsable :</strong>
                    <div className="small">Les cryptomonnaies sont volatiles. Investissez avec prudence.</div>
                  </div>
                </small>
              </div>
            </div>
          </div>

          {/* Copyright */}
          <div className="border-top border-secondary pt-4 mt-4">
            <div className="row align-items-center">
              <div className="col-md-6 mb-3 mb-md-0">
                <p className="mb-0">
                  &copy; {new Date().getFullYear()} CryptoMaroc P2P. Tous droits réservés.
                </p>
              </div>
              <div className="col-md-6 text-md-end">
                <p className="text-light-emphasis small mb-0">
                  <span className="badge bg-success bg-opacity-25 text-success me-2">🇲🇦</span>
                  Service 100% Marocain • Conforme à la réglementation marocaine
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>

      {/* Bouton Back to Top */}
      {scrolled && (
        <button
          className="btn btn-warning rounded-circle shadow-lg back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          aria-label="Retour en haut"
        >
          <i className="bi bi-arrow-up"></i>
        </button>
      )}

      {/* Styles inline pour les améliorations */}
      <style>{`
        .navbar-gradient {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          transition: all 0.3s ease;
        }
        
        .navbar-scrolled {
          padding-top: 0.5rem;
          padding-bottom: 0.5rem;
          background: rgba(102, 126, 234, 0.95) !important;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
        }
        
        .footer-bg {
          background: linear-gradient(135deg, #2c3e50 0%, #1a252f 100%);
        }
        
        .hover-link:hover {
          color: #ffc107 !important;
          transform: translateX(5px);
          transition: all 0.2s ease;
        }
        
        .alert-sm {
          padding: 0.75rem;
          font-size: 0.875rem;
        }
        
        .back-to-top {
          position: fixed;
          bottom: 30px;
          right: 30px;
          width: 50px;
          height: 50px;
          z-index: 1000;
          opacity: 0.9;
        }
        
        .back-to-top:hover {
          opacity: 1;
          transform: translateY(-3px);
        }
        
        @media (max-width: 768px) {
          .navbar-brand span {
            font-size: 1.5rem !important;
          }
          
          .btn span {
            font-size: 0.875rem;
          }
        }
      `}</style>
    </div>
  );
};

export default PublicLayout;