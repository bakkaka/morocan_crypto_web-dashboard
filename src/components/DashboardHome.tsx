// src/components/DashboardHome.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardHome: React.FC = () => {
  const { user } = useAuth();

  return (
    <div>
      {/* En-tête */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card bg-primary text-white">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h1 className="h2 mb-2">Bonjour, {user?.fullName} 👋</h1>
                  <p className="mb-0 opacity-75">Tableau de bord - Vue d'ensemble</p>
                </div>
                <div className="col-md-4 text-end">
                  <div className="bg-white text-primary rounded-circle d-inline-flex align-items-center justify-content-center" 
                       style={{width: '80px', height: '80px', fontSize: '32px'}}>
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Statistiques rapides */}
      <div className="row mb-5">
        <div className="col-md-3 mb-4">
          <div className="card border-primary shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-primary mb-3">
                <i className="bi bi-megaphone fs-1"></i>
              </div>
              <h3 className="card-title text-primary">4</h3>
              <p className="card-text">Annonces Actives</p>
              <Link to="/dashboard/ads" className="btn btn-primary btn-sm">
                Gérer
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-4">
          <div className="card border-success shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-success mb-3">
                <i className="bi bi-arrow-left-right fs-1"></i>
              </div>
              <h3 className="card-title text-success">0</h3>
              <p className="card-text">Transactions</p>
              <Link to="/dashboard/transactions" className="btn btn-success btn-sm">
                Voir
              </Link>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-4">
          <div className="card border-warning shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-warning mb-3">
                <i className="bi bi-wallet2 fs-1"></i>
              </div>
              <h3 className="card-title text-warning">0.00</h3>
              <p className="card-text">Solde USDT</p>
              <button className="btn btn-warning btn-sm">
                Recharger
              </button>
            </div>
          </div>
        </div>

        <div className="col-md-3 mb-4">
          <div className="card border-info shadow-sm h-100">
            <div className="card-body text-center">
              <div className="text-info mb-3">
                <i className="bi bi-star fs-1"></i>
              </div>
              <h3 className="card-title text-info">⭐ 5.0</h3>
              <p className="card-text">Rating</p>
              <Link to="/dashboard/profile" className="btn btn-info btn-sm">
                Profil
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation rapide */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h5 className="card-title mb-0">
                <i className="bi bi-compass me-2"></i>
                Navigation Rapide
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-4">
                  <Link to="/dashboard/ads" className="btn btn-outline-primary w-100 py-3 text-start">
                    <i className="bi bi-megaphone fs-2 mb-2 d-block"></i>
                    <strong>Annonces</strong>
                    <small className="text-muted d-block">Gérer vos offres d'achat/vente</small>
                  </Link>
                </div>
                <div className="col-md-4">
                  <Link to="/dashboard/transactions" className="btn btn-outline-success w-100 py-3 text-start">
                    <i className="bi bi-arrow-left-right fs-2 mb-2 d-block"></i>
                    <strong>Transactions</strong>
                    <small className="text-muted d-block">Historique des échanges</small>
                  </Link>
                </div>
                <div className="col-md-4">
                  <Link to="/dashboard/profile" className="btn btn-outline-info w-100 py-3 text-start">
                    <i className="bi bi-person fs-2 mb-2 d-block"></i>
                    <strong>Profil</strong>
                    <small className="text-muted d-block">Informations personnelles</small>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;