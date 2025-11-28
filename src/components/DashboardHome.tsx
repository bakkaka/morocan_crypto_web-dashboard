// src/components/DashboardHome.tsx
import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const DashboardHome: React.FC = () => {
  const { user, isAdmin } = useAuth();

  const userStats = [
    { title: 'Mes Annonces', value: '3', icon: 'bi-megaphone', color: 'primary', link: '/dashboard/ads/my' },
    { title: 'Solde USDT', value: '0.00', icon: 'bi-wallet2', color: 'success', link: '/dashboard/wallet' },
    { title: 'Transactions', value: '0', icon: 'bi-arrow-left-right', color: 'info', link: '/dashboard/transactions' },
    { title: 'Rating', value: '⭐ 5.0', icon: 'bi-star', color: 'warning', link: '/dashboard/profile' }
  ];

  const adminStats = [
    { title: 'Utilisateurs', value: '156', icon: 'bi-people', color: 'primary', link: '/dashboard/admin/users' },
    { title: 'Annonces', value: '47', icon: 'bi-megaphone', color: 'success', link: '/dashboard/admin/ads' },
    { title: 'Transactions', value: '24', icon: 'bi-arrow-left-right', color: 'info', link: '/dashboard/transactions' },
    { title: 'Revenus', value: '2,450 MAD', icon: 'bi-graph-up', color: 'warning', link: '/dashboard/admin/analytics' }
  ];

  const stats = isAdmin ? adminStats : userStats;

  return (
    <div className="container-fluid py-4">

      {/* HEADER */}
      <div className="row mb-4">
        <div className="col-12">
          <div className={`card ${isAdmin ? 'bg-dark text-white' : 'bg-primary text-white'}`}>
            <div className="card-body py-4">
              <div className="row align-items-center">
                <div className="col-md-8">

                  <h1 className="h3 mb-2">
                    {isAdmin ? '🛡️ Tableau Admin' : `👋 Bonjour, ${user?.fullName}`}
                  </h1>

                  <p className="mb-0 opacity-75">
                    {isAdmin ? 'Supervision complète de la plateforme' : 'Bienvenue dans votre espace trading'}
                  </p>

                </div>

                <div className="col-md-4 text-end">
                  <div className={`rounded-circle d-inline-flex align-items-center justify-content-center 
                    ${isAdmin ? 'bg-warning text-dark' : 'bg-white text-primary'}`}
                    style={{ width: '60px', height: '60px', fontSize: '24px' }}>
                    {user?.fullName?.charAt(0) ?? 'U'}
                  </div>
                </div>

              </div>
            </div>
          </div>
        </div>
      </div>

      {/* STATISTIQUES */}
      <div className="row mb-5">
        <div className="col-12">
          <h2 className="h4 mb-4">
            <i className="bi bi-graph-up me-2"></i>
            {isAdmin ? 'Aperçu Plateforme' : 'Mes Statistiques'}
          </h2>

          <div className="row">
            {stats.map((stat, i) => (
              <div key={i} className="col-xl-3 col-md-6 mb-4">
                <Link to={stat.link} className="text-decoration-none">
                  <div className={`card border-${stat.color} shadow-sm h-100`}>
                    <div className="card-body text-center">
                      <div className={`text-${stat.color} mb-3`}>
                        <i className={`bi ${stat.icon} fs-1`} />
                      </div>
                      <h3 className={`card-title text-${stat.color}`}>{stat.value}</h3>
                      <p className="card-text text-dark">{stat.title}</p>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>

        </div>
      </div>

      {/* ACTIONS */}
      <div className="row">
        <div className="col-12">
          <div className="card shadow-sm">
            <div className="card-header bg-light">
              <h3 className="mb-0">
                <i className="bi bi-lightning me-2"></i>
                {isAdmin ? 'Actions Admin' : 'Actions Rapides'}
              </h3>
            </div>

            <div className="card-body">

              {isAdmin ? (
                <div className="row g-3">
                  <QuickAction link="/dashboard/admin/users" icon="bi-people" color="primary" title="Gérer Utilisateurs" subtitle="Modération des comptes" />
                  <QuickAction link="/dashboard/admin/ads" icon="bi-shield-check" color="success" title="Modérer Annonces" subtitle="Validation" />
                  <QuickAction link="/dashboard/admin/analytics" icon="bi-graph-up" color="info" title="Analytics" subtitle="Statistiques globales" />
                  <QuickAction link="/dashboard/transactions" icon="bi-eye" color="warning" title="Surveillance" subtitle="Transactions suspectes" />
                </div>
              ) : (
                <div className="row g-3">
                  <QuickAction link="/dashboard/ads/create" icon="bi-plus-circle" color="primary" title="Créer Annonce" subtitle="Nouvelle offre" />
                  <QuickAction link="/dashboard/ads" icon="bi-search" color="success" title="Marketplace" subtitle="Voir les offres" />
                  <QuickAction link="/dashboard/wallet" icon="bi-wallet2" color="warning" title="Portefeuille" subtitle="Gérer solde" />
                  <QuickAction link="/dashboard/profile" icon="bi-person" color="info" title="Mon Profil" subtitle="Paramètres" />
                </div>
              )}

            </div>
          </div>
        </div>
      </div>

      {/* MESSAGE INFO */}
      <div className="row mt-4">
        <div className="col-12">
          <div className={`alert ${isAdmin ? 'alert-warning' : 'alert-info'}`}>
            <h5 className="alert-heading">
              <i className={`bi ${isAdmin ? 'bi-shield-check' : 'bi-rocket'} me-2`} />
              {isAdmin ? 'Espace Administrateur' : 'Bienvenue sur MoroccanCrypto!'}
            </h5>
            <p className="mb-0">
              {isAdmin
                ? "Accès total à la modération et supervision."
                : "Explorez le marketplace ou créez votre première annonce."}
            </p>
          </div>
        </div>
      </div>

    </div>
  );
};

// ❗ extraction du bouton rapide pour éviter duplication
const QuickAction = ({
  link,
  icon,
  color,
  title,
  subtitle
}: {
  link: string;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
}) => (
  <div className="col-md-3">
    <Link to={link} className={`btn btn-outline-${color} w-100 py-3 text-start`}>
      <i className={`bi ${icon} fs-2 d-block mb-2`} />
      <strong>{title}</strong>
      <small className="text-muted d-block">{subtitle}</small>
    </Link>
  </div>
);

export default DashboardHome;
