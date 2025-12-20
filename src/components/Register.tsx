// src/components/Register.tsx - VERSION COMPLÈTE ET OPTIMISÉE
import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import UserService from '../api/UserService';

const Register: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  // États du formulaire
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('212');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  // États UI
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  
  // Redirection si déjà connecté
  useEffect(() => {
    if (user) {
      navigate('/dashboard');
    }
  }, [user, navigate]);

  // Validation du téléphone en temps réel
  useEffect(() => {
    if (!phone) {
      setPhoneError(null);
      return;
    }

    // Nettoyer le numéro (enlever + et espaces)
    const cleanedPhone = phone.replace(/[+\s]/g, '');
    
    // Validation format 212XXXXXXXXX
    const phoneRegex = /^212\d{9}$/;
    
    if (!phoneRegex.test(cleanedPhone)) {
      setPhoneError('Format invalide. Doit être: 212XXXXXXXXX (12 chiffres)');
    } else {
      setPhoneError(null);
    }
  }, [phone]);

  // Gestion du changement de téléphone
  const handlePhoneChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    
    // Retirer tout ce qui n'est pas chiffre
    value = value.replace(/\D/g, '');
    
    // S'assurer que ça commence par 212
    if (!value.startsWith('212')) {
      value = '212' + value.replace(/^212/, '');
    }
    
    // Limiter à 12 chiffres (212 + 9 chiffres)
    if (value.length > 12) {
      value = value.slice(0, 12);
    }
    
    setPhone(value);
  };

  // Validation du formulaire
  const validateForm = (): string[] => {
    const errors: string[] = [];

    // Nom complet
    if (!fullName.trim() || fullName.trim().length < 2) {
      errors.push('Nom complet requis (minimum 2 caractères)');
    }

    // Email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) {
      errors.push('Adresse email invalide');
    }

    // Téléphone
    const phoneRegex = /^212\d{9}$/;
    const cleanedPhone = phone.replace(/[+\s]/g, '');
    if (!phoneRegex.test(cleanedPhone)) {
      errors.push('Téléphone invalide. Format: 212XXXXXXXXX (12 chiffres)');
    }

    // Mot de passe
    if (password.length < 6) {
      errors.push('Le mot de passe doit contenir au moins 6 caractères');
    }

    // Confirmation mot de passe
    if (password !== confirmPassword) {
      errors.push('Les mots de passe ne correspondent pas');
    }

    return errors;
  };

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validation client-side
      const validationErrors = validateForm();
      if (validationErrors.length > 0) {
        throw new Error(validationErrors.join('. '));
      }

      // Préparer les données
      const userData = {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        phone: phone.trim(), // Déjà au format 212XXXXXXXXX
        password: password
      };

      console.log('📤 Tentative d\'inscription:', userData);

      // Appel API via UserService
      await UserService.registerUser(userData);

      console.log('✅ Inscription réussie');
      setSuccess('Inscription réussie ! Redirection vers la connexion...');

      // Redirection après 2 secondes
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      console.error('❌ Erreur inscription:', err);
      
      // Gestion des erreurs spécifiques
      if (err.code === 'EMAIL_EXISTS') {
        setError('Cet email est déjà utilisé. Veuillez en choisir un autre.');
      } else if (err.code === 'VALIDATION_ERROR') {
        setError(err.message);
      } else if (err.message.includes('déjà utilisé')) {
        setError('Cet email ou numéro de téléphone est déjà utilisé.');
      } else {
        setError(err.message || 'Une erreur est survenue lors de l\'inscription');
      }
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour formater l'affichage du téléphone
  const formatPhoneDisplay = (value: string): string => {
    if (value.length <= 3) return value;
    return `+${value.slice(0, 3)} ${value.slice(3, 6)} ${value.slice(6, 9)} ${value.slice(9)}`;
  };

  return (
    <div className="container py-5">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body p-4 p-md-5">
              {/* En-tête */}
              <div className="text-center mb-4">
                <div className="mb-3">
                  <i className="bi bi-person-plus-fill text-primary fs-1"></i>
                </div>
                <h1 className="h2 fw-bold text-primary mb-2">
                  Créer un compte
                </h1>
                <p className="text-muted">
                  Rejoignez la plateforme de trading P2P sécurisée
                </p>
              </div>

              {/* Messages d'état */}
              {error && (
                <div className="alert alert-danger alert-dismissible fade show" role="alert">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    <div className="flex-grow-1">{error}</div>
                    <button 
                      type="button" 
                      className="btn-close" 
                      onClick={() => setError(null)}
                      aria-label="Close"
                    ></button>
                  </div>
                </div>
              )}

              {success && (
                <div className="alert alert-success alert-dismissible fade show" role="alert">
                  <div className="d-flex align-items-center">
                    <i className="bi bi-check-circle-fill me-2"></i>
                    <div className="flex-grow-1">{success}</div>
                  </div>
                </div>
              )}

              {/* Formulaire */}
              <form onSubmit={handleSubmit} noValidate>
                {/* Nom complet */}
                <div className="mb-4">
                  <label htmlFor="fullName" className="form-label fw-semibold">
                    <i className="bi bi-person me-1 text-primary"></i>
                    Nom complet *
                  </label>
                  <input
                    type="text"
                    id="fullName"
                    className="form-control form-control-lg"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Votre nom complet"
                    required
                    disabled={loading}
                    minLength={2}
                  />
                  <div className="form-text">Minimum 2 caractères</div>
                </div>

                {/* Email */}
                <div className="mb-4">
                  <label htmlFor="email" className="form-label fw-semibold">
                    <i className="bi bi-envelope me-1 text-primary"></i>
                    Adresse email *
                  </label>
                  <input
                    type="email"
                    id="email"
                    className="form-control form-control-lg"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="votre@email.com"
                    required
                    disabled={loading}
                  />
                  <div className="form-text">Nous ne partagerons jamais votre email</div>
                </div>

                {/* Téléphone */}
                <div className="mb-4">
                  <label htmlFor="phone" className="form-label fw-semibold">
                    <i className="bi bi-phone me-1 text-primary"></i>
                    Téléphone (Maroc) *
                  </label>
                  <div className="input-group input-group-lg">
                    <span className="input-group-text bg-light">
                      <span className="text-muted">+212</span>
                    </span>
                    <input
                      type="tel"
                      id="phone"
                      className={`form-control ${phoneError ? 'is-invalid' : ''}`}
                      value={phone}
                      onChange={handlePhoneChange}
                      placeholder="671486449"
                      required
                      disabled={loading}
                      maxLength={12}
                    />
                  </div>
                  {phoneError ? (
                    <div className="invalid-feedback d-block">{phoneError}</div>
                  ) : (
                    <div className="form-text">
                      {phone ? `Format: ${formatPhoneDisplay(phone)}` : 'Format: 212XXXXXXXXX'}
                    </div>
                  )}
                </div>

                {/* Mot de passe */}
                <div className="mb-4">
                  <label htmlFor="password" className="form-label fw-semibold">
                    <i className="bi bi-lock me-1 text-primary"></i>
                    Mot de passe *
                  </label>
                  <input
                    type="password"
                    id="password"
                    className="form-control form-control-lg"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  <div className="form-text">Minimum 6 caractères</div>
                </div>

                {/* Confirmation mot de passe */}
                <div className="mb-4">
                  <label htmlFor="confirmPassword" className="form-label fw-semibold">
                    <i className="bi bi-lock-fill me-1 text-primary"></i>
                    Confirmer le mot de passe *
                  </label>
                  <input
                    type="password"
                    id="confirmPassword"
                    className="form-control form-control-lg"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    minLength={6}
                  />
                  {password && confirmPassword && password !== confirmPassword && (
                    <div className="text-danger small mt-1">
                      <i className="bi bi-exclamation-circle me-1"></i>
                      Les mots de passe ne correspondent pas
                    </div>
                  )}
                </div>

                {/* Bouton d'inscription */}
                <div className="d-grid gap-2 mb-4">
                  <button
                    type="submit"
                    className="btn btn-primary btn-lg py-3 fw-semibold"
                    disabled={loading || !!phoneError}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Inscription en cours...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-plus me-2"></i>
                        Créer mon compte
                      </>
                    )}
                  </button>
                </div>

                {/* Lien vers connexion */}
                <div className="text-center pt-3 border-top">
                  <p className="text-muted mb-0">
                    Déjà un compte ?{' '}
                    <Link 
                      to="/login" 
                      className="fw-semibold text-decoration-none text-primary"
                    >
                      <i className="bi bi-box-arrow-in-right me-1"></i>
                      Se connecter
                    </Link>
                  </p>
                </div>
              </form>

              {/* Informations de sécurité */}
              <div className="mt-4 pt-3">
                <div className="row g-3">
                  <div className="col-4">
                    <div className="text-center">
                      <i className="bi bi-shield-check text-success fs-4 d-block mb-2"></i>
                      <small className="text-muted d-block">Sécurisé</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="text-center">
                      <i className="bi bi-lightning-charge text-warning fs-4 d-block mb-2"></i>
                      <small className="text-muted d-block">Rapide</small>
                    </div>
                  </div>
                  <div className="col-4">
                    <div className="text-center">
                      <i className="bi bi-currency-exchange text-info fs-4 d-block mb-2"></i>
                      <small className="text-muted d-block">P2P</small>
                    </div>
                  </div>
                </div>
              </div>

              {/* Conditions */}
              <div className="mt-4">
                <p className="text-center text-muted small">
                  En créant un compte, vous acceptez nos{' '}
                  <a href="/conditions" className="text-decoration-none">Conditions d'utilisation</a>{' '}
                  et notre{' '}
                  <a href="/confidentialite" className="text-decoration-none">Politique de confidentialité</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Register;