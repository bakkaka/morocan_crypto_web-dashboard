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
import UserBankDetails from "./components/UserBankDetails"; // Nouveau composant

// Route protégée basique
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }
  
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" />;
};

// Route protégée pour ADMIN seulement
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!isAdmin) {
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};

// Route protégée pour USER seulement
const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isUser, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Chargement...</div>;
  }
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  if (!isUser) {
    return <Navigate to="/dashboard" />;
  }
  
  return <>{children}</>;
};

// Page Portefeuille
const WalletPage: React.FC = () => {
  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2><i className="bi bi-wallet2 me-2"></i>Mon Portefeuille USDT</h2>
        <div className="badge bg-primary fs-6">Solde: 0.00 USDT</div>
      </div>

      <div className="row">
        <div className="col-md-8">
          <div className="card shadow-sm">
            <div className="card-header bg-light">
              <h5 className="card-title mb-0">Actions Rapides</h5>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-md-6">
                  <button className="btn btn-success w-100 py-3">
                    <i className="bi bi-plus-circle fs-4 d-block mb-2"></i>
                    <strong>Recharger</strong>
                    <small className="d-block text-muted">Ajouter des USDT</small>
                  </button>
                </div>
                <div className="col-md-6">
                  <button className="btn btn-outline-primary w-100 py-3">
                    <i className="bi bi-arrow-up-circle fs-4 d-block mb-2"></i>
                    <strong>Retirer</strong>
                    <small className="d-block text-muted">Vers mon compte</small>
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="card shadow-sm mt-4">
            <div className="card-header bg-light">
              <h5 className="card-title mb-0">Historique des Transactions</h5>
            </div>
            <div className="card-body">
              <div className="text-center py-4">
                <i className="bi bi-clock-history fs-1 text-muted mb-3"></i>
                <p className="text-muted">Aucune transaction pour le moment</p>
              </div>
            </div>
          </div>
        </div>

        <div className="col-md-4">
          <div className="card shadow-sm">
            <div className="card-header bg-light">
              <h5 className="card-title mb-0">Statistiques</h5>
            </div>
            <div className="card-body">
              <div className="mb-3">
                <small className="text-muted">Solde Total</small>
                <h4 className="text-primary">0.00 USDT</h4>
              </div>
              <div className="mb-3">
                <small className="text-muted">Transactions Total</small>
                <h5>0</h5>
              </div>
              <div className="mb-3">
                <small className="text-muted">Dernière Activité</small>
                <h5>---</h5>
              </div>
            </div>
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
      <h2><i className="bi bi-graph-up me-2"></i>Analytics Plateforme</h2>
      
      <div className="row mb-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body text-center">
              <h3>156</h3>
              <p className="mb-0">Utilisateurs</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body text-center">
              <h3>47</h3>
              <p className="mb-0">Annonces Actives</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body text-center">
              <h3>24</h3>
              <p className="mb-0">Transactions/Jour</p>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-dark">
            <div className="card-body text-center">
              <h3>2,450 MAD</h3>
              <p className="mb-0">Revenus Journaliers</p>
            </div>
          </div>
        </div>
      </div>

      <div className="card">
        <div className="card-body">
          <h5 className="card-title">Statistiques Détaillées</h5>
          <p className="text-muted">Fonctionnalité analytics en cours de développement...</p>
        </div>
      </div>
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* PUBLIC ROUTES avec PublicLayout */}
          <Route path="/" element={
            <PublicLayout>
              <Home />
            </PublicLayout>
          } />
          <Route path="/login" element={
            <PublicLayout>
              <Login />
            </PublicLayout>
          } />
          <Route path="/register" element={
            <PublicLayout>
              <Register />
            </PublicLayout>
          } />
          <Route path="/market" element={
            <PublicLayout>
              <div className="container py-5">
                <h1>Marché</h1>
                <p>Page marché en construction...</p>
              </div>
            </PublicLayout>
          } />
          <Route path="/how-it-works" element={
            <PublicLayout>
              <div className="container py-5">
                <h1>Comment ça marche</h1>
                <p>Page comment ça marche en construction...</p>
              </div>
            </PublicLayout>
          } />

          {/* PROTECTED ROUTES avec DashboardLayout */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <DashboardLayout />
            </ProtectedRoute>
          }>
            {/* Page d'accueil Dashboard */}
            <Route index element={<DashboardHome />} />
            
            {/* ROUTES UTILISATEUR */}
            <Route path="wallet" element={<WalletPage />} />
            
            {/* Gestion des coordonnées bancaires */}
            <Route path="bank-details" element={
              <UserRoute>
                <UserBankDetails />
              </UserRoute>
            } />
            
            {/* Annonces */}
            <Route path="ads">
              {/* Marketplace - Toutes les annonces */}
              <Route index element={<AdList />} />
              {/* Créer une annonce */}
              <Route path="create" element={
                <UserRoute>
                  <AdCreate />
                </UserRoute>
              } />
              {/* Mes annonces */}
              <Route path="my" element={
                <UserRoute>
                  <AdList filter="my-ads" />
                </UserRoute>
              } />
            </Route>
            
            <Route path="transactions" element={<TransactionList />} />
            <Route path="profile" element={<Profile />} />
            
            {/* ROUTES ADMIN */}
            <Route path="admin">
              <Route path="users" element={
                <AdminRoute>
                  <UserList />
                </AdminRoute>
              } />
              <Route path="ads" element={
                <AdminRoute>
                  <AdList filter="moderation" />
                </AdminRoute>
              } />
              <Route path="analytics" element={
                <AdminRoute>
                  <AnalyticsPage />
                </AdminRoute>
              } />
              <Route path="bank-details" element={
                <AdminRoute>
                  <UserBankDetails adminView={true} />
                </AdminRoute>
              } />
            </Route>
          </Route>

          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;