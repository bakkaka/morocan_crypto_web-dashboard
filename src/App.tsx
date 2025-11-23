import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Home from "./components/Home";
import Login from "./components/Login";
import Register from "./components/Register";
import Dashboard from "./components/Dashboard";
import UserList from "./components/UserList";
import AdList from "./components/AdList";
import AdCreate from "./components/AdCreate";
import TransactionList from "./components/TransactionList";
import Profile from "./components/Profile";
import DashboardHome from "./components/DashboardHome";

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

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* PUBLIC ROUTES */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />

          {/* PROTECTED ROUTES */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }>
            {/* Redirige /dashboard vers /dashboard/home */}
            <Route index element={<DashboardHome />} />
            
            {/* ROUTES ADMIN SEULEMENT */}
            <Route path="users" element={
              <AdminRoute>
                <UserList />
              </AdminRoute>
            } />
            
            {/* ROUTES POUR TOUS LES UTILISATEURS CONNECTÉS */}
            <Route path="ads">
              <Route index element={<AdList />} />
              <Route path="create" element={
                <UserRoute>
                  <AdCreate />
                </UserRoute>
              } />
            </Route>
            
            <Route path="transactions" element={<TransactionList />} />
            <Route path="profile" element={<Profile />} />
          </Route>

          {/* Redirection par défaut */}
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;