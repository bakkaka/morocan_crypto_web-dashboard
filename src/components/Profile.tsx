// src/components/Profile.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  //const { user, updateProfile } = useAuth();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    fullName: user?.fullName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    walletAddress: user?.walletAddress || ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // Simulation mise à jour profil
      setTimeout(() => {
        setMessage('✅ Profil mis à jour avec succès !');
        setLoading(false);
      }, 1000);
    } catch (error) {
      setMessage('❌ Erreur lors de la mise à jour');
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-8">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 mb-1">Mon Profil</h1>
              <p className="text-muted">Gérez vos informations personnelles</p>
            </div>
          </div>

          <div className="row">
            {/* Informations personnelles */}
            <div className="col-md-8">
              <div className="card">
                <div className="card-header">
                  <h5 className="card-title mb-0">
                    <i className="bi bi-person me-2"></i>
                    Informations personnelles
                  </h5>
                </div>
                <div className="card-body">
                  {message && (
                    <div className={`alert ${message.includes('✅') ? 'alert-success' : 'alert-danger'}`}>
                      {message}
                    </div>
                  )}

                  <form onSubmit={handleSubmit}>
                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="fullName" className="form-label">
                          Nom complet *
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="fullName"
                          name="fullName"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label htmlFor="email" className="form-label">
                          Email *
                        </label>
                        <input
                          type="email"
                          className="form-control"
                          id="email"
                          name="email"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="phone" className="form-label">
                          Téléphone *
                        </label>
                        <input
                          type="tel"
                          className="form-control"
                          id="phone"
                          name="phone"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label htmlFor="walletAddress" className="form-label">
                          Adresse Wallet USDT
                        </label>
                        <input
                          type="text"
                          className="form-control"
                          id="walletAddress"
                          name="walletAddress"
                          value={formData.walletAddress}
                          onChange={handleInputChange}
                          placeholder="TXYZ123..."
                        />
                      </div>
                    </div>

                    <div className="d-flex justify-content-end">
                      <button
                        type="submit"
                        className="btn btn-primary"
                        disabled={loading}
                      >
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Mise à jour...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-check-circle me-2"></i>
                            Mettre à jour
                          </>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* Statistiques profil */}
            <div className="col-md-4">
              <div className="card mb-4">
                <div className="card-body text-center">
                  <div className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center mx-auto mb-3" 
                       style={{width: '80px', height: '80px', fontSize: '32px'}}>
                    {user?.fullName?.charAt(0) || 'U'}
                  </div>
                  <h5 className="card-title">{user?.fullName}</h5>
                  <p className="text-muted small">{user?.email}</p>
                  
                  <div className="d-grid gap-2">
                    <span className="badge bg-success">
                      <i className="bi bi-patch-check me-1"></i>
                      Vérifié
                    </span>
                  </div>
                </div>
              </div>

              <div className="card">
                <div className="card-header">
                  <h6 className="card-title mb-0">Statistiques</h6>
                </div>
                <div className="card-body">
                  <div className="mb-3">
                    <small className="text-muted">Rating</small>
                    <div className="d-flex align-items-center">
                      <i className="bi bi-star-fill text-warning me-1"></i>
                      <strong>5.0</strong>
                      <small className="text-muted ms-1">/5.0</small>
                    </div>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-muted">Transactions</small>
                    <div><strong>12</strong></div>
                  </div>
                  
                  <div className="mb-3">
                    <small className="text-muted">Annonces actives</small>
                    <div><strong>3</strong></div>
                  </div>
                  
                  <div className="mb-0">
                    <small className="text-muted">Membre depuis</small>
                    <div><strong>Jan 2024</strong></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;