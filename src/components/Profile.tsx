// src/components/Profile.tsx
import React, { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

const Profile: React.FC = () => {
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    fullName: user?.fullName ?? '',
    email: user?.email ?? '',
    phone: user?.phone ?? '',
    walletAddress: user?.walletAddress ?? ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    // Simulation API
    setTimeout(() => {
      setMessage('Profil mis à jour avec succès ✔️');
      setLoading(false);
    }, 1000);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-8">

          {/* HEADER */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 mb-1">Mon Profil</h1>
              <p className="text-muted">Gérez vos informations personnelles</p>
            </div>
          </div>

          <div className="row">

            {/* FORMULAIRE */}
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
                    <div className="alert alert-success">{message}</div>
                  )}

                  <form onSubmit={handleSubmit}>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="fullName" className="form-label">Nom complet *</label>
                        <input
                          id="fullName"
                          name="fullName"
                          type="text"
                          className="form-control"
                          value={formData.fullName}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label htmlFor="email" className="form-label">Email *</label>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          className="form-control"
                          value={formData.email}
                          onChange={handleInputChange}
                          required
                        />
                      </div>
                    </div>

                    <div className="row">
                      <div className="col-md-6 mb-3">
                        <label htmlFor="phone" className="form-label">Téléphone *</label>
                        <input
                          id="phone"
                          name="phone"
                          type="tel"
                          className="form-control"
                          value={formData.phone}
                          onChange={handleInputChange}
                          required
                        />
                      </div>

                      <div className="col-md-6 mb-3">
                        <label htmlFor="walletAddress" className="form-label">Adresse Wallet (USDT)</label>
                        <input
                          id="walletAddress"
                          name="walletAddress"
                          type="text"
                          className="form-control"
                          placeholder="TXYZ123..."
                          value={formData.walletAddress}
                          onChange={handleInputChange}
                        />
                      </div>
                    </div>

                    <div className="text-end">
                      <button className="btn btn-primary" type="submit" disabled={loading}>
                        {loading ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-2"></span>
                            Mise à jour...
                          </>
                        ) : (
                          <>✔️ Mettre à jour</>
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>

            {/* PROFIL + STATISTIQUES */}
            <div className="col-md-4">
              <div className="card mb-4 text-center">
                <div className="card-body">

                  <div
                    className="bg-primary text-white rounded-circle mx-auto mb-3 d-flex align-items-center justify-content-center"
                    style={{ width: '80px', height: '80px', fontSize: '32px' }}
                  >
                    {user?.fullName?.charAt(0) ?? 'U'}
                  </div>

                  <h5 className="card-title">{user?.fullName}</h5>
                  <p className="text-muted small">{user?.email}</p>

                  <span className="badge bg-success">
                    <i className="bi bi-patch-check me-1"></i> Vérifié
                  </span>
                </div>
              </div>

              <div className="card">
                <div className="card-header"><h6 className="mb-0">Statistiques</h6></div>
                <div className="card-body">

                  <div className="mb-3">
                    <small className="text-muted">Rating</small>
                    <div><strong>5.0 ⭐</strong></div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted">Transactions</small>
                    <div><strong>12</strong></div>
                  </div>

                  <div className="mb-3">
                    <small className="text-muted">Annonces actives</small>
                    <div><strong>3</strong></div>
                  </div>

                  <div>
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
