// src/components/ProtectedRoute.tsx
import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

interface ProtectedRouteProps {
  children: React.ReactNode;
  requireVerified?: boolean; // Optionnel : nécessite un compte vérifié
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ 
  children, 
  requireVerified = false 
}) => {
  const { isAuthenticated, user, loading } = useAuth();
  const location = useLocation();

  // Afficher un loader pendant la vérification
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '50vh' }}>
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <span className="ms-3">Vérification de l'authentification...</span>
      </div>
    );
  }

  // Rediriger vers login si non authentifié
  if (!isAuthenticated) {
    return (
      <Navigate 
        to="/login" 
        state={{ 
          from: location, 
          message: 'Vous devez être connecté pour accéder à cette page' 
        }} 
        replace 
      />
    );
  }

  // Vérifier si un compte vérifié est requis
  if (requireVerified && user && !user.isVerified) {
    return (
      <Navigate 
        to="/verification-required" 
        replace 
      />
    );
  }

  // Tout est bon, afficher le contenu protégé
  return <>{children}</>;
};

export default ProtectedRoute;