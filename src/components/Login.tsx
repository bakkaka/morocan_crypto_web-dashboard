// src/components/Login.tsx - VERSION CORRIGÉE
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [loginSuccess, setLoginSuccess] = useState(false);
  
  const { login, isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  // ==============================
  // CORRECTION : useEffect pour redirection
  // ==============================
  
  useEffect(() => {
    console.log('🔍 useEffect - isAuthenticated:', isAuthenticated);
    console.log('🔍 useEffect - user:', user?.email);
    
    if (isAuthenticated && user) {
      console.log('✅ Condition redirection remplie!');
      console.log('👤 User:', user.email);
      
      // Petit délai pour laisser le temps à React de tout mettre à jour
      const timer = setTimeout(() => {
        console.log('🔀 Redirection automatique vers /dashboard');
        navigate('/dashboard', { replace: true });
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [isAuthenticated, user, navigate]);

  // ==============================
  // GESTION DE LA CONNEXION
  // ==============================

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoggingIn(true);
    setLoginSuccess(false);
    
    console.log('🔄 Tentative de connexion...', { email, password: '***' });
    
    try {
      console.log('1. Avant appel login()');
      
      // Appel de la connexion
      await login(email, password);
      
      console.log('2. Login réussi, vérification auth state');
      
      // NE PAS vérifier isAuthenticated ici !
      // La redirection se fera via le useEffect
      
      // Marquer le succès pour afficher un message
      setLoginSuccess(true);
      
    } catch (err: any) {
      console.error('❌ Erreur de connexion:', err);
      
      let errorMessage = 'Échec de la connexion';
      if (err.response?.status === 401) {
        errorMessage = 'Email ou mot de passe incorrect';
      } else if (err.message) {
        errorMessage = err.message;
      }
      
      setError(errorMessage);
    } finally {
      setIsLoggingIn(false);
      console.log('🏁 HandleSubmit terminé');
    }
  };

  // ==============================
  // VÉRIFICATION DIRECTE POUR DEBUG
  // ==============================

  useEffect(() => {
    // Debug : vérifier localStorage après la connexion
    if (loginSuccess) {
      const timer = setTimeout(() => {
        console.log('🔍 DEBUG - Vérification après login:');
        console.log('   - localStorage token:', localStorage.getItem('jwt_token') ? 'PRÉSENT' : 'ABSENT');
        console.log('   - localStorage user:', localStorage.getItem('user'));
        console.log('   - AuthContext isAuthenticated:', isAuthenticated);
        console.log('   - AuthContext user:', user?.email);
      }, 300);
      
      return () => clearTimeout(timer);
    }
  }, [loginSuccess, isAuthenticated, user]);

  // ==============================
  // RENDER
  // ==============================

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-6 col-lg-4">
          <div className="card shadow">
            <div className="card-body p-4">
              <h2 className="text-center mb-4">Connexion</h2>
              
              {error && (
                <div className="alert alert-danger">
                  {error}
                </div>
              )}
              
              {loginSuccess && (
                <div className="alert alert-success">
                  ✅ Connexion réussie ! Redirection en cours...
                </div>
              )}
              
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    disabled={isLoggingIn}
                  />
                </div>
                
                <div className="mb-3">
                  <label className="form-label">Mot de passe</label>
                  <input
                    type="password"
                    className="form-control"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoggingIn}
                  />
                </div>
                
                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={isLoggingIn}
                >
                  {isLoggingIn ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </form>
              
              <div className="text-center mt-3">
                <Link to="/register">Créer un compte</Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;