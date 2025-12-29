import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

// Types
interface StatCard {
  id: string;
  title: string;
  value: string | number;
  icon: string;
  color: string;
  link: string;
  description?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
}

interface QuickActionProps {
  link: string;
  icon: string;
  color: string;
  title: string;
  subtitle: string;
  badge?: string | number;
  disabled?: boolean;
}

interface RecentActivity {
  id: number;
  type: 'ad' | 'transaction' | 'notification' | 'user';
  title: string;
  description: string;
  timestamp: string;
  icon: string;
  color: string;
}

// Composant QuickAction optimisé avec React.memo
const QuickAction: React.FC<QuickActionProps> = React.memo(({ 
  link, 
  icon, 
  color, 
  title, 
  subtitle, 
  badge,
  disabled = false
}) => (
  <div className="col-xl-3 col-lg-4 col-md-6">
    <Link 
      to={link} 
      className={`btn btn-outline-${color} w-100 py-3 px-3 text-start d-flex flex-column 
        hover-lift transition-all duration-300 ${disabled ? 'disabled opacity-50' : ''}`}
      aria-label={`${title} - ${subtitle}`}
      onClick={(e) => disabled && e.preventDefault()}
    >
      <div className="d-flex justify-content-between align-items-start mb-2">
        <i className={`bi ${icon} fs-2 text-${color}`} />
        {badge && (
          <span className={`badge bg-${color} text-white small`}>
            {badge}
          </span>
        )}
      </div>
      <div className="mt-auto">
        <strong className="d-block mb-1">{title}</strong>
        <small className="text-muted d-block">{subtitle}</small>
      </div>
      <div className="text-end mt-2">
        <i className={`bi bi-arrow-right text-${color}`}></i>
      </div>
    </Link>
  </div>
));

QuickAction.displayName = 'QuickAction';

// Composant StatCard
const StatCard: React.FC<StatCard> = ({ 
  id, 
  title, 
  value, 
  icon, 
  color, 
  link, 
  description,
  trend,
  trendValue 
}) => (
  <div className="col-xl-3 col-lg-6 col-md-6">
    <Link to={link} className="text-decoration-none" aria-label={`Voir ${title}`}>
      <div className={`card border-start border-${color} border-4 shadow-sm h-100 
        hover-lift transition-all duration-300`}>
        <div className="card-body p-4">
          <div className="d-flex justify-content-between align-items-start">
            <div>
              <div className={`text-${color} mb-2`}>
                <i className={`bi ${icon} fs-2`} />
              </div>
              <h3 className={`card-title text-${color} mb-1`}>
                {typeof value === 'number' && value > 99 ? '99+' : value}
              </h3>
              <p className="card-text text-dark fw-semibold mb-1">{title}</p>
              {description && (
                <small className="text-muted">{description}</small>
              )}
            </div>
            {trend && trendValue && (
              <div className="text-end">
                <div className={`small d-flex align-items-center ${trend === 'up' ? 'text-success' : 'text-danger'}`}>
                  <i className={`bi bi-${trend === 'up' ? 'arrow-up' : 'arrow-down'}-circle me-1`}></i>
                  {trendValue}%
                </div>
              </div>
            )}
          </div>
          <div className="mt-3">
            <span className="small text-muted">
              <i className="bi bi-arrow-right-circle me-1"></i>
              Voir détails
            </span>
          </div>
        </div>
      </div>
    </Link>
  </div>
);

// Composant RecentActivity
const RecentActivityItem: React.FC<RecentActivity> = ({ 
  type, 
  title, 
  description, 
  timestamp, 
  icon, 
  color 
}) => (
  <div className="list-group-item border-0 d-flex justify-content-between align-items-center py-3">
    <div className="d-flex align-items-center">
      <div className={`bg-${color} bg-opacity-10 rounded-circle p-2 me-3`}>
        <i className={`bi ${icon} text-${color}`}></i>
      </div>
      <div>
        <div className="fw-medium">{title}</div>
        <small className="text-muted">{description}</small>
      </div>
    </div>
    <small className="text-muted">{timestamp}</small>
  </div>
);

const DashboardHome: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const navigate = useNavigate();
  
  // États
  const [loading, setLoading] = useState(true);
  const [statsData, setStatsData] = useState<Record<string, number>>({
    userAds: 0,
    userBalance: 0,
    userTransactions: 0,
    adminUsers: 0,
    adminAds: 0,
    adminRevenue: 0,
    pendingAds: 0,
    completedTransactions: 0
  });

  // Charger les statistiques
  useEffect(() => {
    const loadStats = async () => {
      setLoading(true);
      try {
        // Simulation d'appel API avec timeout
        await new Promise(resolve => setTimeout(resolve, 800));
        
        // Données simulées - À remplacer par votre API réelle
        const mockStats = {
          userAds: 3,
          userBalance: 1250.50,
          userTransactions: 7,
          adminUsers: 156,
          adminAds: 47,
          adminRevenue: 2450,
          pendingAds: 12,
          completedTransactions: 89
        };
        
        setStatsData(mockStats);
      } catch (error) {
        console.error('Erreur chargement stats:', error);
      } finally {
        setLoading(false);
      }
    };

    loadStats();
    
    // Refresh périodique toutes les 30 secondes
    const interval = setInterval(() => {
      if (document.visibilityState === 'visible') {
        loadStats();
      }
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  // Fonction pour obtenir les initiales
  const getUserInitials = useCallback((name: string): string => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }, []);

  // Formatage de la date
  const formattedDate = useMemo(() => {
    return new Date().toLocaleDateString('fr-FR', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }, []);

  const formattedTime = useMemo(() => {
    return new Date().toLocaleTimeString('fr-FR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  }, []);

  // Statistiques utilisateur
  const userStats = useMemo<StatCard[]>(() => [
    {
      id: 'user-ads',
      title: 'Mes Annonces',
      value: statsData.userAds,
      icon: 'bi-megaphone',
      color: 'primary',
      link: '/dashboard/ads/my',
      description: 'Annonces actives',
      trend: 'up',
      trendValue: 15
    },
    {
      id: 'user-balance',
      title: 'Solde USDT',
      value: `${statsData.userBalance.toLocaleString('fr-FR', { minimumFractionDigits: 2 })}`,
      icon: 'bi-wallet2',
      color: 'success',
      link: '/dashboard/wallet',
      description: 'Disponible',
      trend: 'up',
      trendValue: 8
    },
    {
      id: 'user-transactions',
      title: 'Transactions',
      value: statsData.userTransactions,
      icon: 'bi-arrow-left-right',
      color: 'info',
      link: '/dashboard/transactions',
      description: 'Total effectuées',
      trend: 'stable',
      trendValue: 0
    },
    {
      id: 'user-rating',
      title: 'Rating',
      value: '⭐ 5.0',
      icon: 'bi-star',
      color: 'warning',
      link: '/dashboard/profile',
      description: 'Score de confiance'
    }
  ], [statsData]);

  // Statistiques admin
  const adminStats = useMemo<StatCard[]>(() => [
    {
      id: 'admin-users',
      title: 'Utilisateurs',
      value: statsData.adminUsers,
      icon: 'bi-people',
      color: 'primary',
      link: '/dashboard/admin/users',
      description: 'Comptes actifs',
      trend: 'up',
      trendValue: 12
    },
    {
      id: 'admin-ads',
      title: 'Annonces',
      value: statsData.adminAds,
      icon: 'bi-megaphone',
      color: 'success',
      link: '/dashboard/admin/ads',
      description: `${statsData.pendingAds} en attente`,
      trend: 'up',
      trendValue: 23
    },
    {
      id: 'admin-transactions',
      title: 'Transactions',
      value: statsData.completedTransactions,
      icon: 'bi-arrow-left-right',
      color: 'info',
      link: '/dashboard/transactions',
      description: 'Terminées',
      trend: 'up',
      trendValue: 18
    },
    {
      id: 'admin-revenue',
      title: 'Revenus',
      value: `${statsData.adminRevenue.toLocaleString('fr-FR')} MAD`,
      icon: 'bi-graph-up',
      color: 'warning',
      link: '/dashboard/admin/analytics',
      description: '30 derniers jours',
      trend: 'up',
      trendValue: 32
    }
  ], [statsData]);

  const stats = isAdmin ? adminStats : userStats;

  // Quick Actions utilisateur
  const userQuickActions = useMemo<QuickActionProps[]>(() => [
    {
      link: '/dashboard/ads/create',
      icon: 'bi-plus-circle',
      color: 'primary',
      title: 'Créer Annonce',
      subtitle: 'Nouvelle offre',
      badge: 'Nouveau'
    },
    {
      link: '/dashboard/ads',
      icon: 'bi-search',
      color: 'success',
      title: 'Marketplace',
      subtitle: 'Voir les offres',
      badge: 'Hot'
    },
    {
      link: '/dashboard/wallet',
      icon: 'bi-wallet2',
      color: 'warning',
      title: 'Portefeuille',
      subtitle: 'Gérer solde'
    },
    {
      link: '/dashboard/profile',
      icon: 'bi-person',
      color: 'info',
      title: 'Mon Profil',
      subtitle: 'Paramètres'
    }
  ], []);

  // Quick Actions admin
  const adminQuickActions = useMemo<QuickActionProps[]>(() => [
    {
      link: '/dashboard/admin/users',
      icon: 'bi-people',
      color: 'primary',
      title: 'Gérer Utilisateurs',
      subtitle: 'Modération des comptes',
      badge: statsData.adminUsers
    },
    {
      link: '/dashboard/admin/ads',
      icon: 'bi-shield-check',
      color: 'success',
      title: 'Modérer Annonces',
      subtitle: 'Validation & publication',
      badge: statsData.pendingAds
    },
    {
      link: '/dashboard/admin/analytics',
      icon: 'bi-graph-up',
      color: 'info',
      title: 'Analytics',
      subtitle: 'Statistiques globales'
    },
    {
      link: '/dashboard/transactions',
      icon: 'bi-eye',
      color: 'warning',
      title: 'Surveillance',
      subtitle: 'Transactions suspectes',
      badge: '24h'
    }
  ], [statsData]);

  const quickActions = isAdmin ? adminQuickActions : userQuickActions;

  // Activités récentes
  const recentActivities = useMemo<RecentActivity[]>(() => [
    {
      id: 1,
      type: 'ad',
      title: 'Nouvelle annonce créée',
      description: 'Vente USDT - 300 unités',
      timestamp: 'Il y a 2h',
      icon: 'bi-megaphone',
      color: 'primary'
    },
    {
      id: 2,
      type: 'transaction',
      title: 'Transaction en attente',
      description: 'Achat BTC - 0.05 BTC',
      timestamp: 'Il y a 4h',
      icon: 'bi-arrow-left-right',
      color: 'success'
    },
    {
      id: 3,
      type: 'notification',
      title: 'Notification système',
      description: 'Mise à jour des conditions',
      timestamp: 'Il y a 1 jour',
      icon: 'bi-bell',
      color: 'warning'
    },
    {
      id: 4,
      type: 'user',
      title: 'Nouvel utilisateur',
      description: 'Inscription vérifiée',
      timestamp: 'Il y a 2 jours',
      icon: 'bi-person-plus',
      color: 'info'
    }
  ], []);

  // Fonction pour le bouton d'action principale
  const handleMainAction = useCallback(() => {
    navigate(isAdmin ? '/dashboard/admin/ads' : '/dashboard/ads/create');
  }, [isAdmin, navigate]);

  // Animation pour le chargement
  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3 text-muted">Chargement de votre tableau de bord...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* HEADER AVEC AVATAR */}
      <div className="row mb-5">
        <div className="col-12">
          <div className={`card ${isAdmin ? 'bg-dark-gradient text-white' : 'bg-primary-gradient text-white'} border-0 shadow-lg`}>
            <div className="card-body py-4 px-4 px-md-5">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <div className="d-flex align-items-center mb-3">
                    <h1 className="h2 mb-0">
                      {isAdmin ? '🛡️ Tableau de bord Admin' : `👋 Bonjour, ${user?.fullName || 'Trader'}`}
                    </h1>
                    {isAdmin && (
                      <span className="badge bg-warning text-dark ms-3">ADMIN</span>
                    )}
                  </div>
                  
                  <p className="mb-0 opacity-85 lead">
                    {isAdmin 
                      ? 'Supervision complète de la plateforme - Modération en temps réel'
                      : 'Bienvenue dans votre espace trading sécurisé'
                    }
                  </p>
                  
                  <div className="mt-3 d-flex flex-wrap gap-2">
                    <span className="badge bg-white text-dark">
                      <i className="bi bi-calendar-check me-1"></i>
                      {formattedDate}
                    </span>
                    <span className={`badge ${isAdmin ? 'bg-warning text-dark' : 'bg-light text-dark'}`}>
                      <i className="bi bi-clock me-1"></i>
                      {formattedTime}
                    </span>
                    {user?.isVerified && (
                      <span className="badge bg-success">
                        <i className="bi bi-check-circle me-1"></i>
                        Vérifié
                      </span>
                    )}
                  </div>
                </div>

                <div className="col-md-4 text-center text-md-end mt-4 mt-md-0">
                  <div className="position-relative d-inline-block">
                    <div 
                      className={`rounded-circle d-flex align-items-center justify-content-center shadow-lg
                        ${isAdmin ? 'bg-warning-gradient' : 'bg-white-gradient'}`}
                      style={{ 
                        width: '100px', 
                        height: '100px', 
                        fontSize: '36px',
                        border: '4px solid rgba(255,255,255,0.3)'
                      }}
                    >
                      <span className={`fw-bold ${isAdmin ? 'text-dark' : 'text-primary'}`}>
                        {getUserInitials(user?.fullName || '')}
                      </span>
                    </div>
                    
                    {/* Badge de statut */}
                    <div className="position-absolute bottom-0 end-0 translate-middle">
                      <div className={`rounded-circle d-flex align-items-center justify-content-center
                        ${user?.isVerified ? 'bg-success' : 'bg-secondary'}`}
                        style={{ width: '28px', height: '28px' }}
                        title={user?.isVerified ? 'Vérifié' : 'Non vérifié'}
                      >
                        <i className={`bi bi-${user?.isVerified ? 'check' : 'clock'} text-white small`}></i>
                      </div>
                    </div>
                  </div>
                  
                  <div className="mt-3">
                    <span className={`badge ${isAdmin ? 'bg-warning text-dark' : 'bg-light text-dark'}`}>
                      <i className="bi bi-person-badge me-1"></i>
                      {isAdmin ? 'Administrateur' : 'Utilisateur'}
                    </span>
                    {user?.reputation && (
                      <span className="badge bg-info ms-2">
                        <i className="bi bi-star me-1"></i>
                        {user.reputation}/5
                      </span>
                    )}
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
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h2 className="h4 mb-0">
              <i className="bi bi-graph-up me-2"></i>
              {isAdmin ? '📊 Aperçu Plateforme' : '📈 Mes Statistiques'}
            </h2>
            <button 
              className="btn btn-sm btn-outline-secondary"
              onClick={() => navigate(isAdmin ? '/dashboard/admin/analytics' : '/dashboard/transactions')}
              aria-label="Voir les détails des statistiques"
            >
              <i className="bi bi-arrow-right-circle me-1"></i>
              Voir détails
            </button>
          </div>

          <div className="row g-4">
            {stats.map((stat) => (
              <StatCard key={stat.id} {...stat} />
            ))}
          </div>
        </div>
      </div>

      {/* ACTIONS RAPIDES */}
      <div className="row mb-5">
        <div className="col-12">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light border-0 py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h3 className="mb-0">
                  <i className="bi bi-lightning me-2"></i>
                  {isAdmin ? '⚡ Actions Admin' : '🚀 Actions Rapides'}
                </h3>
                <span className="badge bg-primary">
                  {quickActions.length} options
                </span>
              </div>
            </div>

            <div className="card-body p-4">
              <div className="row g-3">
                {quickActions.map((action, index) => (
                  <QuickAction key={index} {...action} />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* WIDGETS COMPLÉMENTAIRES */}
      <div className="row g-4">
        {/* Widget activité récente */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-light border-0 d-flex justify-content-between align-items-center">
              <h5 className="mb-0">
                <i className="bi bi-activity me-2"></i>
                Activité Récente
              </h5>
              <button 
                className="btn btn-sm btn-outline-primary"
                onClick={() => navigate(isAdmin ? '/dashboard/admin/activity' : '/dashboard/activity')}
              >
                Voir tout
              </button>
            </div>
            <div className="card-body">
              <div className="list-group list-group-flush">
                {recentActivities.map((activity) => (
                  <RecentActivityItem key={activity.id} {...activity} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Widget informations */}
        <div className="col-lg-6">
          <div className={`card ${isAdmin ? 'alert-warning border-warning' : 'alert-info border-info'} border-0 shadow-sm h-100`}>
            <div className="card-body">
              <h5 className="alert-heading mb-3">
                <i className={`bi ${isAdmin ? 'bi-shield-check' : 'bi-rocket'} me-2`} />
                {isAdmin ? '🔐 Espace Administrateur' : '🎯 Bienvenue sur MoroccanCrypto!'}
              </h5>
              <p className="mb-3">
                {isAdmin
                  ? "Vous avez un accès complet à la modération, surveillance et configuration du système. Utilisez les outils de modération pour garantir la sécurité des transactions."
                  : "Commencez par créer votre première annonce ou explorez le marketplace pour trouver les meilleures offres. Votre portefeuille est sécurisé et vos transactions sont protégées."
                }
              </p>
              
              <div className="row g-2 mb-3">
                <div className="col-6">
                  <div className="text-center p-2 border rounded bg-light">
                    <div className="text-primary fw-bold">24/7</div>
                    <small className="text-muted">Support</small>
                  </div>
                </div>
                <div className="col-6">
                  <div className="text-center p-2 border rounded bg-light">
                    <div className="text-success fw-bold">100%</div>
                    <small className="text-muted">Sécurisé</small>
                  </div>
                </div>
              </div>
              
              <div className="d-grid">
                <button 
                  className={`btn ${isAdmin ? 'btn-warning' : 'btn-primary'} fw-semibold`}
                  onClick={handleMainAction}
                  aria-label={isAdmin ? 'Accéder à la modération' : 'Créer une annonce'}
                >
                  <i className={`bi ${isAdmin ? 'bi-shield-check' : 'bi-plus-circle'} me-2`} />
                  {isAdmin ? 'Accéder à la modération' : 'Créer une annonce'}
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* PERFORMANCE METRICS */}
      <div className="row mt-4">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light border-0">
              <h5 className="mb-0">
                <i className="bi bi-speedometer2 me-2"></i>
                Métriques de Performance
              </h5>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-md-3 col-6 mb-3">
                  <div className="p-3 border rounded bg-success bg-opacity-10">
                    <div className="text-success fw-bold fs-4">99.8%</div>
                    <small className="text-muted">Disponibilité</small>
                  </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="p-3 border rounded bg-primary bg-opacity-10">
                    <div className="text-primary fw-bold fs-4">{"< 2s"}</div>
                    <small className="text-muted">Temps de réponse</small>
                  </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="p-3 border rounded bg-info bg-opacity-10">
                    <div className="text-info fw-bold fs-4">0</div>
                    <small className="text-muted">Incidents sécurité</small>
                  </div>
                </div>
                <div className="col-md-3 col-6 mb-3">
                  <div className="p-3 border rounded bg-warning bg-opacity-10">
                    <div className="text-warning fw-bold fs-4">98%</div>
                    <small className="text-muted">Satisfaction</small>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FOOTER DU DASHBOARD */}
      <div className="row mt-5">
        <div className="col-12">
          <div className="text-center text-muted small border-top pt-3">
            <div className="d-flex justify-content-center flex-wrap gap-3 mb-2">
              <span><i className="bi bi-shield-check text-primary me-1"></i>Plateforme sécurisée</span>
              <span><i className="bi bi-headset text-success me-1"></i>Support 24/7</span>
              <span><i className="bi bi-lock text-info me-1"></i>Transactions cryptées</span>
              <span><i className="bi bi-lightning-charge text-warning me-1"></i>Rapidité</span>
            </div>
            <p className="mb-0">
              MoroccanCrypto P2P &copy; {new Date().getFullYear()} - Version 1.2.0
              {isAdmin && <span className="text-warning ms-2">| Mode Administrateur Actif</span>}
            </p>
            <div className="mt-2">
              <span className="badge bg-light text-dark me-2">
                <i className="bi bi-cpu me-1"></i>
                React 18
              </span>
              <span className="badge bg-light text-dark me-2">
                <i className="bi bi-braces me-1"></i>
                Symfony 6
              </span>
              <span className="badge bg-light text-dark">
                <i className="bi bi-database me-1"></i>
                MySQL
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DashboardHome;