// src/components/Currency.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

interface Currency {
  id: number;
  code: string;
  name: string;
  type: 'crypto' | 'fiat';
  decimals: number;
  createdAt: string;
}

interface CurrencyProps {
  adminView?: boolean;
}

const Currency: React.FC<CurrencyProps> = ({ adminView = false }) => {
  const navigate = useNavigate();
  const { user, isAdmin } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  
  const [formData, setFormData] = useState({
    code: '',
    name: '',
    type: 'crypto',
    decimals: 6
  });

  useEffect(() => {
    const loadCurrencies = async () => {
      try {
        setDataLoading(true);
        setError(null);
        
        const response = await api.get('/currencies');
        
        // Handle Hydra format
        let currenciesData: Currency[] = [];
        if (response.data['hydra:member']) {
          currenciesData = response.data['hydra:member'];
        } else if (Array.isArray(response.data)) {
          currenciesData = response.data;
        } else if (response.data.member && Array.isArray(response.data.member)) {
          currenciesData = response.data.member;
        }
        
        console.log('📥 Devises chargées:', currenciesData.length);
        setCurrencies(currenciesData);
        
      } catch (err: any) {
        console.error('❌ Erreur chargement devises:', err);
        setError('Impossible de charger les devises');
      } finally {
        setDataLoading(false);
      }
    };

    if (user && (adminView ? isAdmin : true)) {
      loadCurrencies();
    } else if (!user) {
      navigate('/login');
    }
  }, [user, isAdmin, adminView, navigate]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseInt(value) || 0 : value
    }));
    
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validation
      if (!formData.code.trim()) throw new Error('Le code est requis');
      if (!formData.name.trim()) throw new Error('Le nom est requis');
      if (formData.decimals < 0 || formData.decimals > 18) {
        throw new Error('Les décimales doivent être entre 0 et 18');
      }

      const postData = {
        code: formData.code.toUpperCase().trim(),
        name: formData.name.trim(),
        type: formData.type,
        decimals: formData.decimals
      };

      console.log('📤 Envoi création devise:', postData);

      const response = await api.post('/currencies', postData);
      console.log('✅ Devise créée:', response.data);

      setSuccess(`✅ Devise ${postData.code} créée avec succès !`);
      
      // Reset form
      setFormData({
        code: '',
        name: '',
        type: 'crypto',
        decimals: 6
      });

      // Reload list
      setTimeout(() => {
        window.location.reload();
      }, 1500);
      
    } catch (err: any) {
      console.error('❌ Erreur création devise:', err);
      if (err.response?.data?.violations) {
        const violations = err.response.data.violations;
        const errorMsg = violations.map((v: any) => `${v.propertyPath}: ${v.message}`).join(', ');
        setError(`Erreur validation: ${errorMsg}`);
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data?.title) {
        setError(err.response.data.title);
      } else {
        setError(err.message || 'Erreur lors de la création');
      }
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-MA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const getCurrencyTypeLabel = (type: string): string => {
    return type === 'crypto' ? 'Crypto' : 'Fiat';
  };

  const getCurrencyTypeColor = (type: string): string => {
    return type === 'crypto' ? 'primary' : 'success';
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <i className="bi bi-currency-exchange me-2"></i>
          {adminView ? 'Gestion des Devises' : 'Devises Disponibles'}
        </h2>
        <button
          type="button"
          className="btn btn-outline-secondary"
          onClick={() => navigate('/dashboard')}
          disabled={loading}
        >
          <i className="bi bi-arrow-left me-2"></i>
          Retour
        </button>
      </div>

      {/* Status Messages */}
      {error && (
        <div className="alert alert-danger alert-dismissible fade show" role="alert">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>Erreur :</strong> {error}
          <button type="button" className="btn-close" onClick={() => setError(null)}></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success alert-dismissible fade show" role="alert">
          <i className="bi bi-check-circle me-2"></i>
          <strong>Succès !</strong> {success}
        </div>
      )}

      {/* Admin: Form to add new currency */}
      {adminView && (
        <div className="card shadow-sm border-0 mb-4">
          <div className="card-header bg-primary text-white">
            <h5 className="card-title mb-0">
              <i className="bi bi-plus-circle me-2"></i>
              Ajouter une Nouvelle Devise
            </h5>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="row g-3">
                <div className="col-md-3">
                  <label className="form-label fw-semibold">Code *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="code"
                    value={formData.code}
                    onChange={handleInputChange}
                    placeholder="Ex: BTC"
                    required
                    disabled={loading}
                    maxLength={10}
                  />
                  <div className="form-text">Code ISO (ex: BTC, USDT, MAD)</div>
                </div>

                <div className="col-md-4">
                  <label className="form-label fw-semibold">Nom Complet *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    placeholder="Ex: Bitcoin"
                    required
                    disabled={loading}
                  />
                </div>

                <div className="col-md-3">
                  <label className="form-label fw-semibold">Type</label>
                  <select
                    className="form-select"
                    name="type"
                    value={formData.type}
                    onChange={handleInputChange}
                    disabled={loading}
                  >
                    <option value="crypto">Cryptomonnaie</option>
                    <option value="fiat">Devise Fiat</option>
                  </select>
                </div>

                <div className="col-md-2">
                  <label className="form-label fw-semibold">Décimales</label>
                  <input
                    type="number"
                    className="form-control"
                    name="decimals"
                    value={formData.decimals}
                    onChange={handleInputChange}
                    min="0"
                    max="18"
                    required
                    disabled={loading}
                  />
                  <div className="form-text">0-18 décimales</div>
                </div>

                <div className="col-12">
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2"></span>
                        Création...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle me-2"></i>
                        Ajouter la Devise
                      </>
                    )}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Currency List */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-light d-flex justify-content-between align-items-center">
          <h5 className="card-title mb-0">
            <i className="bi bi-list-ul me-2"></i>
            Liste des Devises
          </h5>
          <div className="d-flex gap-2">
            <span className="badge bg-primary">
              {currencies.filter(c => c.type === 'crypto').length} Crypto(s)
            </span>
            <span className="badge bg-success">
              {currencies.filter(c => c.type === 'fiat').length} Fiat(s)
            </span>
          </div>
        </div>
        
        <div className="card-body p-0">
          {dataLoading ? (
            <div className="text-center py-5">
              <div className="spinner-border text-primary" role="status">
                <span className="visually-hidden">Chargement...</span>
              </div>
              <p className="mt-3 text-muted">Chargement des devises...</p>
            </div>
          ) : currencies.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-currency-exchange fs-1 text-muted mb-3"></i>
              <p className="text-muted mb-3">Aucune devise disponible</p>
              {adminView && (
                <p className="small text-muted">
                  Utilisez le formulaire ci-dessus pour ajouter des devises
                </p>
              )}
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th>Code</th>
                    <th>Nom</th>
                    <th>Type</th>
                    <th>Décimales</th>
                    <th>Date de Création</th>
                    {adminView && <th className="text-end">Actions</th>}
                  </tr>
                </thead>
                <tbody>
                  {currencies.map(currency => (
                    <tr key={currency.id}>
                      <td>
                        <strong className={`text-${getCurrencyTypeColor(currency.type)}`}>
                          {currency.code}
                        </strong>
                      </td>
                      <td>{currency.name}</td>
                      <td>
                        <span className={`badge bg-${getCurrencyTypeColor(currency.type)}`}>
                          {getCurrencyTypeLabel(currency.type)}
                        </span>
                      </td>
                      <td>
                        <span className="badge bg-info">{currency.decimals}</span>
                      </td>
                      <td className="text-muted small">
                        {formatDate(currency.createdAt)}
                      </td>
                      {adminView && (
                        <td className="text-end">
                          <div className="btn-group btn-group-sm">
                            <button
                              type="button"
                              className="btn btn-outline-warning"
                              title="Modifier"
                              disabled
                            >
                              <i className="bi bi-pencil"></i>
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-danger"
                              title="Supprimer"
                              disabled
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Information Card */}
          <div className="card border-0 bg-light m-3">
            <div className="card-body">
              <h6 className="card-title text-primary">
                <i className="bi bi-info-circle me-2"></i>
                Informations sur les Devises
              </h6>
              <div className="row">
                <div className="col-md-6">
                  <ul className="small mb-0">
                    <li className="mb-2">
                      <span className="badge bg-primary me-2">Crypto</span>
                      Cryptomonnaies pour échanges P2P
                    </li>
                    <li className="mb-2">
                      <span className="badge bg-success me-2">Fiat</span>
                      Devises traditionnelles (MAD, EUR, USD)
                    </li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <ul className="small mb-0">
                    <li className="mb-2">
                      <span className="badge bg-info me-2">Décimales</span>
                      Précision pour calculs et affichage
                    </li>
                    <li>
                      <span className="badge bg-warning me-2">USDT</span>
                      Devise principale des échanges
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Currency;