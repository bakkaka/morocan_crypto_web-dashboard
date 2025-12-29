// src/App.tsx - VERSION CORRIGÉE
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
import MessagesPage from "./components/MessagesPage";
import WalletPage from "./components/WalletPage";
import AnalyticsPage from "./components/AnalyticsPage";
import HowItWorksPage from "./components/HowItWorksPage";
import AboutPage from "./components/AboutPage";
import ContactPage from "./components/ContactPage";
import PrivacyPage from "./components/PrivacyPage";
import DashboardAdminAds from "./components/DashboardAdminAds";
import { Suspense, lazy } from "react";

// Composants chargés paresseusement
const AdEditPage = lazy(() => import("./components/AdEditPage"));

// Loader de chargement
const LoadingSpinner = () => (
  <div className="min-h-screen d-flex align-items-center justify-content-center">
    <div className="spinner-border text-primary" role="status">
      <span className="visually-hidden">Chargement...</span>
    </div>
  </div>
);

// Route protégée basique
const ProtectedRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  return isAuthenticated ? <>{children}</> : <Navigate to="/login" replace />;
};

// Route protégée pour ADMIN seulement
const AdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isAdmin, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isAdmin) return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
};

// Route protégée pour USER seulement
const UserRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { isAuthenticated, isUser, loading } = useAuth();
  
  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/login" replace />;
  if (!isUser) return <Navigate to="/dashboard" replace />;
  
  return <>{children}</>;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <Suspense fallback={<LoadingSpinner />}>
          <Routes>
            {/* ⭐ PUBLIC ROUTES avec PublicLayout */}
            <Route path="/" element={<PublicLayout />}>
              <Route index element={<Home />} />
              <Route path="login" element={<Login />} />
              <Route path="register" element={<Register />} />
              <Route path="market" element={<PublicAdList />} />
              <Route path="how-it-works" element={<HowItWorksPage />} />
              <Route path="about" element={<AboutPage />} />
              <Route path="contact" element={<ContactPage />} />
              <Route path="privacy" element={<PrivacyPage />} />
              <Route path="*" element={<NotFound />} />
            </Route>

            {/* ⭐ PROTECTED ROUTES avec DashboardLayout */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout />
              </ProtectedRoute>
            }>
              <Route index element={<DashboardHome />} />
              
              {/* ROUTES UTILISATEUR */}
              <Route path="wallet" element={<WalletPage />} />
              <Route path="transactions" element={<TransactionList />} />
              <Route path="profile" element={<Profile />} />
              <Route path="messages" element={<MessagesPage />} />
              
              {/* Gestion bancaire */}
              <Route path="bank-details" element={
                <UserRoute>
                  <UserBankDetails />
                </UserRoute>
              } />
              
              {/* Devises */}
              <Route path="currencies" element={<Currency />} />
              
              {/* ANNONCES UTILISATEUR */}
              <Route path="ads">
                <Route index element={<AdList filter="all" />} />
                <Route path="create" element={
                  <UserRoute>
                    <AdCreate />
                  </UserRoute>
                } />
                <Route path="my" element={
                  <UserRoute>
                    <AdList filter="my-ads" />
                  </UserRoute>
                } />
                <Route path="edit/:id" element={
                  <UserRoute>
                    <Suspense fallback={<LoadingSpinner />}>
                      <AdEditPage />
                    </Suspense>
                  </UserRoute>
                } />
              </Route>
              
              {/* ⭐ ROUTES ADMIN */}
              <Route path="admin">
                {/* Gestion des utilisateurs */}
                <Route path="users" element={
                  <AdminRoute>
                    <UserList />
                  </AdminRoute>
                } />
                
                {/* Modération des annonces - NOUVEAU COMPOSANT */}
                <Route path="ads" element={
                  <AdminRoute>
                    <DashboardAdminAds />
                  </AdminRoute>
                } />
                
                {/* Analytics & statistiques */}
                <Route path="analytics" element={
                  <AdminRoute>
                    <AnalyticsPage />
                  </AdminRoute>
                } />
                
                {/* Gestion bancaire (vue admin) */}
                <Route path="bank-details" element={
                  <AdminRoute>
                    <UserBankDetails />
                  </AdminRoute>
                } />
                
                {/* Gestion des devises (vue admin) */}
                <Route path="currencies" element={
                  <AdminRoute>
                    <Currency />
                  </AdminRoute>
                } />
              </Route>
              
              {/* 404 dans dashboard */}
              <Route path="*" element={
                <div className="container-fluid py-4">
                  <div className="alert alert-warning">
                    <h1 className="h4 mb-3">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      404 - Page non trouvée
                    </h1>
                    <p className="mb-0">Cette page n'existe pas dans le dashboard.</p>
                  </div>
                  <a href="/dashboard" className="btn btn-primary">
                    <i className="bi bi-house-door me-2"></i>
                    Retour au tableau de bord
                  </a>
                </div>
              } />
            </Route>

            {/* Fallback global */}
            <Route path="*" element={
              <Navigate to="/" replace />
            } />
          </Routes>
        </Suspense>
      </Router>
    </AuthProvider>
  );
}

export default App;