import React from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Link, Outlet } from 'react-router-dom';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();

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

  return (
    <div className="min-vh-100 bg-light">
      {/* Navigation Bootstrap */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary shadow">
        <div className="container">
          <Link className="navbar-brand fw-bold d-flex align-items-center" to="/dashboard">
            <span className="bg-warning text-dark rounded px-2 py-1 me-2">₿</span>
            MoroccanCrypto
          </Link>

          <div className="navbar-nav ms-auto align-items-center flex-row">
            <Link className="nav-link text-white mx-2" to="/dashboard">Dashboard</Link>
            <Link className="nav-link text-white mx-2" to="/dashboard/ads">Annonces</Link>
            <Link className="nav-link text-white mx-2" to="/dashboard/transactions">Transactions</Link>
            <Link className="nav-link text-white mx-2" to="/dashboard/profile">Profil</Link>
            
            <div className="dropdown ms-3">
              <button className="btn btn-outline-light dropdown-toggle d-flex align-items-center" 
                      type="button" data-bs-toggle="dropdown">
                <div className="bg-white text-primary rounded-circle d-flex align-items-center justify-content-center me-2" 
                     style={{width: '32px', height: '32px'}}>
                  <span className="fw-bold">{user.fullName.charAt(0)}</span>
                </div>
                {user.fullName}
              </button>
              <ul className="dropdown-menu dropdown-menu-end">
                <li><span className="dropdown-item-text small text-muted">{user.email}</span></li>
                <li><hr className="dropdown-divider" /></li>
                <li>
                  <button className="dropdown-item text-danger" onClick={logout}>
                    Déconnexion
                  </button>
                </li>
              </ul>
            </div>
          </div>
        </div>
      </nav>

      {/* Contenu des routes enfants */}
      <div className="container mt-4">
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;