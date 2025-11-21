// src/pages/Login.tsx
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser, testAPIConnection } from '../api/AuthService';

const Login: React.FC = () => {
  const navigate = useNavigate();

  // États du formulaire
  const [formData, setFormData] = useState({
    email: '',
    password: ''
  });

  // États de l'interface
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ connected: boolean; message: string } | null>(null);

  // Test de connexion API au chargement
  useEffect(() => {
    const checkAPI = async () => {
      const status = await testAPIConnection();
      setApiStatus(status);
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
        password: '***' // Ne pas logger le mot de passe en clair
      });

      // Utiliser le service d'authentification
      const response = await loginUser({
        email: formData.email,
        password: formData.password
      });

      console.log('✅ Connexion réussie:', response);

      setMessage({
        text: '✅ Connexion réussie ! Redirection...',
        type: 'success'
      });

      // Réinitialiser le formulaire
      setFormData({
        email: '',
        password: '',
      });

      // Redirection vers la page d'accueil après délai
      setTimeout(() => navigate('/'), 2000);

    } catch (error: any) {
      console.error('💥 Erreur de connexion détaillée:', error);
      
      let errorMessage = 'Erreur lors de la connexion';
      
      if (error.message) {
        errorMessage = error.message;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 401) {
        errorMessage = 'Email ou mot de passe incorrect';
      } else if (error.response?.status === 404) {
        errorMessage = 'Service de connexion indisponible';
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'La requête a expiré. Veuillez réessayer.';
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
                        <small>Assurez-vous que le serveur Symfony est démarré sur localhost:8000</small>
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

              {/* Section debug (à cacher en production) */}
              <div className="mt-4 p-3 bg-light rounded">
                <small className="text-muted">
                  <strong>Debug Info:</strong><br />
                  - API Status: {apiStatus?.connected ? 'Connected ✅' : 'Disconnected ❌'}<br />
                  - Loading: {loading ? 'Yes' : 'No'}<br />
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