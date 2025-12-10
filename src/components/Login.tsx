// src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { isAuthenticated, login, user } = useAuth();

  // États du formulaire
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // États de l'interface
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ connected: boolean; message: string } | null>(null);

  // Redirection si déjà connecté
  useEffect(() => {
    console.log('🔍 useEffect - isAuthenticated:', isAuthenticated);
    if (isAuthenticated) {
      console.log('🔀 Redirection automatique vers /dashboard');
      navigate('/dashboard');
    }
  }, [isAuthenticated, navigate]);

  // Test de connexion API au chargement
  useEffect(() => {
    const checkAPI = async () => {
      try {
        // Pour le test API, on fait un simple fetch
        const response = await fetch('https://morocancryptobackend-production-f3b6.up.railway.app/api/');

        setApiStatus({ 
          connected: response.ok, 
          message: response.ok ? 'Serveur OK' : 'Serveur erreur' 
        });
      } catch (error) {
        setApiStatus({ connected: false, message: 'Serveur non accessible' });
      }
    };
    
    checkAPI();
  }, []);

  // Gestion des changements de champs
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [id]: value
    }));
    
    // Effacer le message d'erreur quand l'utilisateur tape
    if (message) {
      setMessage(null);
    }
  };

  // Vérification si le bouton doit être désactivé
  const isSubmitDisabled = loading || (apiStatus !== null && !apiStatus.connected);

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Vérification de la connexion API
    if (apiStatus && !apiStatus.connected) {
      setMessage({
        text: '❌ Impossible de se connecter au serveur. Vérifiez que le backend est démarré.',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      console.log('🔄 Tentative de connexion...', { 
        email: formData.email, 
        password: '***'
      });

      // DEBUG AVANT LOGIN
      console.log('1. Avant appel login()');

      await login(formData.email, formData.password);

      // DEBUG APRÈS LOGIN RÉUSSI
      console.log('2. Login réussi, vérification auth state');
      console.log('3. isAuthenticated:', isAuthenticated);
      console.log('4. user:', user);

      setMessage({
        text: '✅ Connexion réussie ! Redirection...',
        type: 'success'
      });

      // Réinitialiser le formulaire
      setFormData({
        email: '',
        password: '',
      });

      // DEBUG AVANT REDIRECTION
      console.log('5. Avant redirection vers /dashboard');

      // Redirection vers dashboard
      setTimeout(() => {
        console.log('6. Exécution de la redirection');
        navigate('/dashboard');
      }, 2000);

    } catch (error: any) {
      console.error('💥 Erreur de connexion détaillée:', error);
      
      let errorMessage = 'Erreur lors de la connexion';
      
      if (error.message) {
        errorMessage = error.message;
      }

      setMessage({
        text: `❌ ${errorMessage}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  // Styles pour les messages
  const getAlertClass = (type: string) => {
    switch (type) {
      case 'success': return 'alert-success';
      case 'error': return 'alert-danger';
      case 'info': return 'alert-info';
      default: return 'alert-info';
    }
  };

  // Si déjà connecté, afficher un message
  if (isAuthenticated) {
    return (
      <div className="container mt-5">
        <div className="row justify-content-center">
          <div className="col-md-6">
            <div className="card shadow-lg">
              <div className="card-header bg-success text-white">
                <h2 className="card-title text-center mb-0">Déjà connecté</h2>
              </div>
              <div className="card-body p-4 text-center">
                <p className="mb-4">Vous êtes déjà connecté à votre compte.</p>
                <Link 
                  to="/dashboard" 
                  className="btn btn-primary w-100 py-2 fw-bold"
                >
                  Aller au Tableau de bord
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Rendu normal
  return (
    <div className="container mt-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <div className="card shadow-lg">
            <div className="card-header bg-primary text-white">
              <h2 className="card-title text-center mb-0">Connexion</h2>
            </div>
            
            <div className="card-body p-4">
              {/* Statut API */}
              {apiStatus && (
                <div className={`alert ${apiStatus.connected ? 'alert-success' : 'alert-warning'} mb-4`}>
                  <small>
                    <strong>Statut serveur:</strong> {apiStatus.message}
                    {!apiStatus.connected && (
                      <div>
                        <small>Connexion au serveur distant Railway…</small>
                      </div>
                    )}
                  </small>
                </div>
              )}

              {/* Message de résultat */}
              {message && (
                <div className={`alert ${getAlertClass(message.type)} alert-dismissible fade show`}>
                  <div className="d-flex align-items-center">
                    <span className="me-2">{message.type === 'success' ? '✅' : '❌'}</span>
                    <span>{message.text.replace('✅', '').replace('❌', '')}</span>
                  </div>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => setMessage(null)}
                    aria-label="Close"
                  ></button>
                </div>
              )}

              <form onSubmit={handleSubmit} noValidate>
                <div className="mb-3">
                  <label htmlFor="email" className="form-label">
                    Email <span className="text-danger">*</span>
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="form-control"
                    value={formData.email}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    placeholder="exemple@email.com"
                  />
                </div>

                <div className="mb-4">
                  <label htmlFor="password" className="form-label">
                    Mot de passe <span className="text-danger">*</span>
                  </label>
                  <input
                    type="password"
                    id="password"
                    className="form-control"
                    value={formData.password}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    placeholder="Votre mot de passe"
                  />
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-bold"
                  disabled={isSubmitDisabled}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Connexion...
                    </>
                  ) : (
                    'Se connecter'
                  )}
                </button>
              </form>

              <div className="text-center mt-4">
                <p className="mb-2">
                  Pas encore de compte ? <Link to="/register" className="fw-bold text-primary">Créer un compte</Link>
                </p>
                <p className="mb-0">
                  <Link to="/" className="text-muted text-decoration-none">
                    ← Retour à l'accueil
                  </Link>
                </p>
              </div>

              {/* Section debug */}
              <div className="mt-4 p-3 bg-light rounded">
                <small className="text-muted">
                  <strong>Debug Info:</strong><br />
                  - API Status: {apiStatus?.connected ? 'Connected ✅' : 'Disconnected ❌'}<br />
                  - Loading: {loading ? 'Yes' : 'No'}<br />
                  - Auth State: {isAuthenticated ? 'Authenticated' : 'Not authenticated'}<br />
                  - Form Valid: {formData.email && formData.password ? 'Yes' : 'No'}
                </small>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;