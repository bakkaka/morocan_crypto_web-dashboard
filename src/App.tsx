// src/App.tsx
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import PublicLayout from "./components/PublicLayout";
import DashboardLayout from "./components/DashboardLayout";
import Home from "./components/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import DashboardHome from "./components/DashboardHome";
import UserList from "./components/UserList";
import AdList from "./components/AdList";
import AdCreate from "./components/AdCreate";
import TransactionList from "./components/TransactionList";
import Profile from "./components/Profile";
import UserBankDetails from "./components/UserBankDetails";
import Currency from './components/Currency';
import PublicAdList from "./components/PublicAdList";
import NotFound from "./components/NotFound";

// Route protégée basique
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    );
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Route protégée pour ADMIN seulement
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Route protégée pour USER seulement
const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="min-h-screen d-flex align-items-center justify-content-center">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
      </div>
    );
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (!isUser) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <>{children}</>;
};

// Page Portefeuille
const WalletPage: React.FC = () => {
  const { user } = useAuth();
  
  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-primary text-white">
            <div className="card-body py-5">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h1 className="h3 mb-2">
                    <i className="bi bi-wallet2 me-2"></i>
                    Mon Portefeuille Crypto
                  </h1>
                  <p className="mb-0 opacity-90">Gérez vos soldes et transactions</p>
                </div>
                <div className="col-md-4 text-end">
                  <div className="bg-white text-primary rounded-3 p-3 d-inline-block">
                    <div className="small text-muted">Solde total</div>
                    <div className="h3 fw-bold mb-0">0.00 USDT</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light">
              <h5 className="card-title mb-0">
                <i className="bi bi-lightning me-2"></i>
                Actions Rapides
              </h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <button className="btn btn-success w-100 py-4">
                    <i className="bi bi-plus-circle fs-2 d-block mb-2"></i>
                    <strong>Recharger</strong>
                    <small className="d-block text-muted">Ajouter des fonds</small>
                  </button>
                </div>
                <div className="col-md-6">
                  <button className="btn btn-outline-primary w-100 py-4">
                    <i className="bi bi-arrow-up-circle fs-2 d-block mb-2"></i>
                    <strong>Retirer</strong>
                    <small className="d-block text-muted">Vers votre compte</small>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="bi bi-clock-history me-2"></i>
                Historique des Transactions
              </h5>
              <span className="badge bg-primary">0 transactions</span>
            </div>
            <div className="card-body">
              <div className="text-center py-5">
                <i className="bi bi-wallet fs-1 text-muted mb-3"></i>
                <h5 className="text-muted">Aucune transaction pour le moment</h5>
                <p className="text-muted small">
                  Vos transactions apparaîtront ici après vos premiers échanges
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow-sm mb-4">
            <div className="card-header bg-light">
              <h5 className="card-title mb-0">
                <i className="bi bi-graph-up me-2"></i>
                Statistiques
              </h5>
            </div>
            <div className="card-body">
              <div className="mb-4">
                <small className="text-muted">Solde Total</small>
                <h3 className="text-primary fw-bold">0.00 USDT</h3>
              </div>
              <div className="mb-4">
                <small className="text-muted">Nombre de Transactions</small>
                <h5 className="fw-bold">0</h5>
              </div>
              <div className="mb-4">
                <small className="text-muted">Dernière Activité</small>
                <h5 className="fw-bold">---</h5>
              </div>
              <div>
                <small className="text-muted">Portefeuille ID</small>
                <div className="text-truncate bg-light p-2 rounded">
                  <small>{user?.id ? `WALLET-${user.id.toString().padStart(6, '0')}` : 'Non défini'}</small>
                </div>
              </div>
            </div>
          </div>

          <div className="alert alert-info">
            <h6 className="alert-heading">
              <i className="bi bi-shield-check me-2"></i>
              Sécurité
            </h6>
            <p className="small mb-0">
              Votre portefeuille est sécurisé avec un chiffrement de niveau bancaire.
              Activez la 2FA pour plus de sécurité.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Page Analytics Admin
const AnalyticsPage: React.FC = () => {
  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-dark text-white">
            <div className="card-body py-4">
              <h1 className="h3 mb-2">
                <i className="bi bi-graph-up-arrow me-2"></i>
                Analytics Plateforme
              </h1>
              <p className="mb-0 opacity-75">Surveillance complète et statistiques en temps réel</p>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card bg-primary text-white shadow-sm">
            <div className="card-body text-center py-4">
              <i className="bi bi-people fs-1 mb-3"></i>
              <h2 className="fw-bold">156</h2>
              <p className="mb-0">Utilisateurs</p>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card bg-success text-white shadow-sm">
            <div className="card-body text-center py-4">
              <i className="bi bi-megaphone fs-1 mb-3"></i>
              <h2 className="fw-bold">47</h2>
              <p className="mb-0">Annonces Actives</p>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card bg-info text-white shadow-sm">
            <div className="card-body text-center py-4">
              <i className="bi bi-arrow-left-right fs-1 mb-3"></i>
              <h2 className="fw-bold">24</h2>
              <p className="mb-0">Transactions/Jour</p>
            </div>
          </div>
        </div>
        <div className="col-xl-3 col-md-6 mb-3">
          <div className="card bg-warning text-dark shadow-sm">
            <div className="card-body text-center py-4">
              <i className="bi bi-currency-exchange fs-1 mb-3"></i>
              <h2 className="fw-bold">2,450</h2>
              <p className="mb-0">MAD Revenus</p>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light">
              <h5 className="card-title mb-0">
                <i className="bi bi-bar-chart me-2"></i>
                Statistiques Détaillées
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center py-5">
                <i className="bi bi-graph-up fs-1 text-muted mb-3"></i>
                <h5 className="text-muted">Module Analytics en développement</h5>
                <p className="text-muted">
                  Cette fonctionnalité sera disponible dans la prochaine mise à jour.
                  Elle inclura des graphiques, tendances et rapports détaillés.
                </p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-lg-4">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-light">
              <h5 className="card-title mb-0">
                <i className="bi bi-activity me-2"></i>
                Activité Récente
              </h5>
            </div>
            <div className="card-body">
              <div className="text-center py-4">
                <i className="bi bi-clock-history fs-1 text-muted mb-3"></i>
                <p className="text-muted small">
                  Surveillance des activités en temps réel
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// Page "Comment ça marche"
const HowItWorksPage: React.FC = () => {
  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h1 className="display-5 fw-bold mb-3">
          <i className="bi bi-question-circle text-primary me-2"></i>
          Comment ça marche ?
        </h1>
        <p className="lead text-muted">
          Découvrez comment échanger des cryptomonnaies en toute sécurité
        </p>
      </div>

      <div className="row g-4">
        {[
          { icon: 'bi-person-plus', color: 'primary', title: '1. Inscription', text: 'Créez votre compte gratuitement en moins de 2 minutes.' },
          { icon: 'bi-bank', color: 'success', title: '2. Ajoutez vos RIB', text: 'Configurez vos coordonnées bancaires pour recevoir et envoyer des virements.' },
          { icon: 'bi-megaphone', color: 'warning', title: '3. Créez une annonce', text: 'Publiez votre offre d\'achat ou de vente. Fixez vos prix et conditions.' },
          { icon: 'bi-chat-left-text', color: 'info', title: '4. Négociez', text: 'Contactez d\'autres utilisateurs via notre système de messagerie sécurisé.' },
          { icon: 'bi-shield-check', color: 'danger', title: '5. Échangez en sécurité', text: 'Notre système d\'escrow garantit la sécurité des fonds.' },
        ].map((step, index) => (
          <div key={index} className={step.title.includes('4.') || step.title.includes('5.') ? 'col-md-6' : 'col-md-4'}>
            <div className="card h-100 border-0 shadow-sm">
              <div className="card-body text-center p-4">
                <div className={`bg-${step.color} bg-opacity-10 rounded-circle d-inline-flex align-items-center justify-content-center mb-4`} style={{width: '80px', height: '80px'}}>
                  <i className={`bi ${step.icon} fs-2 text-${step.color}`}></i>
                </div>
                <h4 className="card-title">{step.title}</h4>
                <p className="card-text text-muted">{step.text}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="text-center mt-5">
        <div className="card bg-primary bg-opacity-10 border-primary">
          <div className="card-body p-5">
            <h3 className="card-title">Prêt à commencer ?</h3>
            <p className="card-text">
              Rejoignez des milliers d'utilisateurs qui échangent en toute confiance
            </p>
            <a href="/register" className="btn btn-primary btn-lg px-5">
              <i className="bi bi-rocket me-2"></i>
              S'inscrire Gratuitement
            </a>
          </div>
        </div>
      </div>
    </div>
  );
};

// Page "À propos"
const AboutPage: React.FC = () => {
  return (
    <div className="container py-5">
      <div className="text-center mb-5">
        <h1 className="display-5 fw-bold mb-3">
          <i className="bi bi-info-circle text-primary me-2"></i>
          À propos de MoroccanCrypto
        </h1>
        <p className="lead text-muted">
          La première plateforme P2P marocaine dédiée aux cryptomonnaies
        </p>
      </div>

      <div className="row align-items-center mb-5">
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-5">
              <h3 className="card-title mb-4">Notre Mission</h3>
              <p className="card-text mb-4">
                MoroccanCrypto a été créé pour démocratiser l'accès aux cryptomonnaies au Maroc.
                Nous croyons en un échange financier plus libre, transparent et accessible à tous.
              </p>
              <ul className="list-unstyled">
                <li className="mb-2">
                  <i className="bi bi-check-circle-fill text-success me-2"></i>
                  Sécurité bancaire pour toutes les transactions
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle-fill text-success me-2"></i>
                  Conformité avec la réglementation marocaine
                </li>
                <li className="mb-2">
                  <i className="bi bi-check-circle-fill text-success me-2"></i>
                  Support client dédié 7j/7
                </li>
                <li>
                  <i className="bi bi-check-circle-fill text-success me-2"></i>
                  Frais parmi les plus bas du marché
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm">
            <div className="card-body p-5">
              <h3 className="card-title mb-4">Nos Valeurs</h3>
              <div className="mb-4">
                <h5><i className="bi bi-shield-check text-primary me-2"></i>Transparence</h5>
                <p className="text-muted">Tous les frais sont affichés clairement, aucune surprise.</p>
              </div>
              <div className="mb-4">
                <h5><i className="bi bi-lock text-success me-2"></i>Sécurité</h5>
                <p className="text-muted">Système d'escrow et vérification 2FA obligatoire.</p>
              </div>
              <div className="mb-4">
                <h5><i className="bi bi-people text-warning me-2"></i>Communauté</h5>
                <p className="text-muted">Notation des utilisateurs et support entre pairs.</p>
              </div>
              <div>
                <h5><i className="bi bi-graph-up-arrow text-info me-2"></i>Innovation</h5>
                <p className="text-muted">Amélioration continue de la plateforme.</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row text-center mb-5">
        {[
          { value: '50M+', label: 'DH Échangés', color: 'primary' },
          { value: '10K+', label: 'Utilisateurs', color: 'success' },
          { value: '99.8%', label: 'Taux de Satisfaction', color: 'warning' },
          { value: '24/7', label: 'Support Client', color: 'info' },
        ].map((stat, index) => (
          <div key={index} className="col-md-3">
            <div className="bg-light p-4 rounded-3">
              <h2 className={`text-${stat.color} fw-bold`}>{stat.value}</h2>
              <p className="text-muted">{stat.label}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Page Contact simplifiée
const ContactPage: React.FC = () => (
  <div className="container py-5">
    <h1 className="display-5 fw-bold mb-4">Contactez-nous</h1>
    <p className="lead mb-5">Page contact en développement...</p>
  </div>
);

// Page Confidentialité simplifiée
const PrivacyPage: React.FC = () => (
  <div className="container py-5">
    <h1 className="display-5 fw-bold mb-4">Politique de confidentialité</h1>
    <p className="lead mb-5">Page en développement...</p>
  </div>
);

// Page d'édition d'annonce simplifiée
const AdEditPage: React.FC = () => (
  <div className="container-fluid py-4">
    <h2>Édition d'annonce</h2>
    <p>Fonctionnalité en développement...</p>
  </div>
);

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* ⭐ PUBLIC ROUTES avec PublicLayout */}
          <Route path="/" element={<PublicLayout />}>
            {/* Pages publiques principales */}
            <Route index element={<Home />} />
            <Route path="login" element={<Login />} />
            <Route path="register" element={<Register />} />
            <Route path="market" element={<PublicAdList />} />
            <Route path="how-it-works" element={<HowItWorksPage />} />
            <Route path="about" element={<AboutPage />} />
            <Route path="contact" element={<ContactPage />} />
            <Route path="privacy" element={<PrivacyPage />} />
            
            {/* Page 404 à l'intérieur du layout public */}
            <Route path="*" element={<NotFound />} />
          </Route>

          {/* ⭐ PROTECTED ROUTES avec DashboardLayout */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            {/* Dashboard Home */}
            <Route index element={<DashboardHome />} />
            
            {/* ROUTES UTILISATEUR */}
            <Route path="wallet" element={<WalletPage />} />
            <Route path="transactions" element={<TransactionList />} />
            <Route path="profile" element={<Profile />} />
            
            {/* Gestion bancaire */}
            <Route path="bank-details" element={
              <UserRoute>
                <UserBankDetails />
              </UserRoute>
            } />
            
            {/* Devises */}
            <Route path="currencies" element={<Currency />} />
            
            {/* ANNONCES */}
            <Route path="ads">
              <Route index element={<AdList filter="all" />} />
              <Route path="create" element={<UserRoute><AdCreate /></UserRoute>} />
              <Route path="my" element={<UserRoute><AdList filter="my-ads" /></UserRoute>} />
              <Route path="edit/:id" element={<UserRoute><AdEditPage /></UserRoute>} />
            </Route>
            
            {/* ⭐ ROUTES ADMIN */}
            <Route path="admin">
              <Route path="users" element={<AdminRoute><UserList /></AdminRoute>} />
              <Route path="ads" element={<AdminRoute><AdList filter="moderation" /></AdminRoute>} />
              <Route path="analytics" element={<AdminRoute><AnalyticsPage /></AdminRoute>} />
              <Route path="bank-details" element={<AdminRoute><UserBankDetails adminView={true} /></AdminRoute>} />
              <Route path="currencies" element={<AdminRoute><Currency adminView={true} /></AdminRoute>} />
            </Route>
            
            {/* 404 dans dashboard */}
            <Route path="*" element={
              <div className="container-fluid py-4">
                <h1>404 - Page non trouvée</h1>
                <p>Cette page n'existe pas dans le dashboard.</p>
              </div>
            } />
          </Route>

          {/* Fallback global 404 (si aucune route ne correspond) */}
          <Route path="*" element={<PublicLayout />}>
  <Route index element={<NotFound />} />
</Route>
          
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;