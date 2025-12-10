// src/pages/Register.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { registerUser, UserServiceError } from '../api/UserService';
import type { RegisterUserData } from '../api/UserService';

const Register: React.FC = () => {
  const navigate = useNavigate();

  // États du formulaire
  const [formData, setFormData] = useState<RegisterUserData>({
    fullName: '',
    email: '',
    phone: '',
    password: '', // correspond à plainPassword dans UserService.ts
  });

  // États de l'interface
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);
  const [loading, setLoading] = useState(false);
  const [apiStatus, setApiStatus] = useState<{ connected: boolean; message: string } | null>(null);

  // Test de connexion API au chargement
  useEffect(() => {
    const checkAPI = async () => {
      try {
        // Même test que dans Login.tsx
        const response = await fetch('https://morocancryptobackend-production-f3b6.up.railway.app/api');
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
    setFormData(prev => ({ ...prev, [id]: value }));
    if (message) setMessage(null);
  };

  // Vérification si le bouton doit être désactivé
  const isSubmitDisabled = loading || (apiStatus !== null && !apiStatus.connected);

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (apiStatus && !apiStatus.connected) {
      setMessage({
        text: '❌ Impossible de se connecter au serveur. Vérifiez que le backend est démarré.',
        type: 'error',
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      console.log('🔄 Tentative d\'inscription...', formData);

      // Appel au service
      await registerUser(formData);

      setMessage({
        text: '✅ Inscription réussie ! Redirection vers la connexion...',
        type: 'success',
      });

      // Réinitialiser le formulaire
      setFormData({ fullName: '', email: '', phone: '', password: '' });

      // Redirection après 2 secondes
      setTimeout(() => navigate('/login'), 2000);

    } catch (error: any) {
      console.error('💥 Erreur inscription:', error);

      let errorMessage = 'Erreur lors de l\'inscription';

      if (error instanceof UserServiceError) {
        errorMessage = error.message;
      } else if (error.response?.data?.['hydra:description']) {
        errorMessage = error.response.data['hydra:description'];
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.code === 'ERR_NETWORK') {
        errorMessage = 'Impossible de se connecter au serveur. Vérifiez votre connexion.';
      } else if (error.code === 'ECONNABORTED') {
        errorMessage = 'La requête a expiré. Veuillez réessayer.';
      }

      setMessage({ text: `❌ ${errorMessage}`, type: 'error' });
    } finally {
      setLoading(false);
    }
  };

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
              <h2 className="card-title text-center mb-0">Créer un compte</h2>
            </div>
            <div className="card-body p-4">

              {/* Statut API */}
              {apiStatus && (
                <div className={`alert ${apiStatus.connected ? 'alert-success' : 'alert-warning'} mb-4`}>
                  <small>
                    <strong>Statut serveur:</strong> {apiStatus.message}
                    {!apiStatus.connected && (
                      <div>
                        <small>Connexion au serveur distant Railway...</small>
                      </div>
                    )}
                  </small>
                </div>
              )}

              {/* Message de résultat */}
              {message && (
                <div className={`alert ${getAlertClass(message.type)} alert-dismissible fade show`}>
                  <div className="d-flex align-items-center">
                    <span className="me-2">{message.text.includes('✅') ? '✅' : '❌'}</span>
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
                  <label htmlFor="fullName" className="form-label">
                    Nom complet <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    className="form-control"
                    value={formData.fullName}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    minLength={2}
                    placeholder="Votre nom complet"
                  />
                  <div className="form-text">Minimum 2 caractères</div>
                </div>

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

                <div className="mb-3">
                  <label htmlFor="phone" className="form-label">
                    Téléphone <span className="text-danger">*</span>
                  </label>
                  <input
                    type="tel"
                    id="phone"
                    className="form-control"
                    value={formData.phone}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                    placeholder="+33 6 12 34 56 78"
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
                    minLength={6}
                    placeholder="Minimum 6 caractères"
                  />
                  <div className="form-text">Au moins 6 caractères</div>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100 py-2 fw-bold"
                  disabled={isSubmitDisabled}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                      Création en cours...
                    </>
                  ) : 'Créer mon compte'}
                </button>
              </form>

              <div className="text-center mt-4">
                <p className="mb-2">
                  Déjà un compte ? <Link to="/login" className="fw-bold text-primary">Connectez-vous</Link>
                </p>
                <p className="mb-0">
                  <Link to="/" className="text-muted text-decoration-none">← Retour à l'accueil</Link>
                </p>
              </div>

              {/* Debug info */}
              <div className="mt-4 p-3 bg-light rounded">
                <small className="text-muted">
                  <strong>Debug Info:</strong><br />
                  - API Status: {apiStatus?.connected ? 'Connected ✅' : 'Disconnected ❌'}<br />
                  - Loading: {loading ? 'Yes' : 'No'}<br />
                  - Form Filled: {formData.fullName && formData.email && formData.phone && formData.password ? 'Yes' : 'No'}
                </small>
              </div>

            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;