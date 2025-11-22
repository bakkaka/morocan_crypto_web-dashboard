// src/components/AdCreate.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

interface Currency {
  id: number;
  code: string;
  name: string;
}

interface PaymentMethod {
  id: number;
  name: string;
  details?: string;
}

interface AdCreateData {
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  paymentMethod: string;
  currency: string; // IRI format: "/api/currencies/1"
  acceptedPaymentMethods: string[]; // Array of IRIs: ["/api/payment_methods/1", "/api/payment_methods/2"]
}

const AdCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [dataLoading, setDataLoading] = useState(true);
  
  const [formData, setFormData] = useState<AdCreateData>({
    type: 'buy',
    amount: 0,
    price: 0,
    paymentMethod: '',
    currency: '',
    acceptedPaymentMethods: []
  });

  // Charger les données réelles depuis l'API
  useEffect(() => {
    const loadFormData = async () => {
      try {
        setDataLoading(true);
        console.log('🔄 Chargement des données depuis API...');
        
        // Charger les devises depuis l'API
        const currenciesResponse = await api.get('/currencies');
        console.log('📥 Réponse currencies:', currenciesResponse.data);
        
        let currenciesData = [];
        if (currenciesResponse.data.member && Array.isArray(currenciesResponse.data.member)) {
          currenciesData = currenciesResponse.data.member;
        } else if (currenciesResponse.data['hydra:member'] && Array.isArray(currenciesResponse.data['hydra:member'])) {
          currenciesData = currenciesResponse.data['hydra:member'];
        } else if (Array.isArray(currenciesResponse.data)) {
          currenciesData = currenciesResponse.data;
        }
        
        setCurrencies(currenciesData);
        console.log(`✅ ${currenciesData.length} devise(s) chargée(s)`);

        // Charger les méthodes de paiement depuis l'API
        const paymentMethodsResponse = await api.get('/payment_methods');
        console.log('📥 Réponse payment_methods:', paymentMethodsResponse.data);
        
        let paymentMethodsData = [];
        if (paymentMethodsResponse.data.member && Array.isArray(paymentMethodsResponse.data.member)) {
          paymentMethodsData = paymentMethodsResponse.data.member;
        } else if (paymentMethodsResponse.data['hydra:member'] && Array.isArray(paymentMethodsResponse.data['hydra:member'])) {
          paymentMethodsData = paymentMethodsResponse.data['hydra:member'];
        } else if (Array.isArray(paymentMethodsResponse.data)) {
          paymentMethodsData = paymentMethodsResponse.data;
        }
        
        setPaymentMethods(paymentMethodsData);
        console.log(`✅ ${paymentMethodsData.length} méthode(s) de paiement chargée(s)`);
        
      } catch (err) {
        console.error('❌ Erreur lors du chargement des données:', err);
        setError('Impossible de charger les données nécessaires. Vérifiez la connexion API.');
      } finally {
        setDataLoading(false);
      }
    };

    loadFormData();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: name === 'amount' || name === 'price' ? parseFloat(value) || 0 : value
    }));
  };

  const handlePaymentMethodToggle = (methodIri: string) => {
    setFormData(prev => {
      const isSelected = prev.acceptedPaymentMethods.includes(methodIri);
      if (isSelected) {
        return {
          ...prev,
          acceptedPaymentMethods: prev.acceptedPaymentMethods.filter(iri => iri !== methodIri)
        };
      } else {
        return {
          ...prev,
          acceptedPaymentMethods: [...prev.acceptedPaymentMethods, methodIri]
        };
      }
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      // Validation
      if (!formData.currency || formData.acceptedPaymentMethods.length === 0) {
        throw new Error('Veuillez sélectionner une devise et au moins une méthode de paiement');
      }

      if (formData.amount <= 0 || formData.price <= 0) {
        throw new Error('Les montants doivent être positifs');
      }

      if (!formData.paymentMethod.trim()) {
        throw new Error('Veuillez saisir une méthode de paiement principale');
      }

      // Préparer les données pour l'API Platform
      const postData = {
        type: formData.type,
        amount: formData.amount,
        price: formData.price,
        paymentMethod: formData.paymentMethod,
        currency: formData.currency, // Déjà au format IRI
        acceptedPaymentMethods: formData.acceptedPaymentMethods, // Déjà au format IRI
        status: 'active'
      };

      console.log('📤 Données envoyées à l\'API:', postData);

      // Envoyer à l'API réelle
      const response = await api.post('/ads', postData);
      console.log('✅ Réponse API:', response.data);
      
      if (response.status === 201) {
        console.log('🎉 Annonce créée avec succès!');
        // Redirection vers la liste des annonces
        navigate('/dashboard/ads');
      } else {
        throw new Error(`Erreur API: ${response.status} ${response.statusText}`);
      }
      
    } catch (err: any) {
      console.error('❌ Erreur création annonce:', err);
      
      // Gestion détaillée des erreurs
      if (err.response?.data) {
        const apiError = err.response.data;
        console.error('📋 Détails erreur API:', apiError);
        
        if (apiError.violations) {
          // Erreurs de validation Symfony
          const errorMessages = apiError.violations.map((v: any) => `${v.propertyPath}: ${v.message}`).join(', ');
          setError(`Erreurs de validation: ${errorMessages}`);
        } else if (apiError.detail) {
          setError(apiError.detail);
        } else if (apiError.message) {
          setError(apiError.message);
        } else {
          setError('Erreur lors de la création de l\'annonce');
        }
      } else {
        setError(err.message || 'Une erreur est survenue lors de la création');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* En-tête */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 mb-1">Créer une annonce</h1>
              <p className="text-muted">Publiez votre offre d'achat ou de vente</p>
            </div>
            <button 
              type="button" 
              className="btn btn-outline-secondary"
              onClick={() => navigate('/dashboard/ads')}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Retour
            </button>
          </div>

          {/* Formulaire */}
          <div className="card">
            <div className="card-body">
              {error && (
                <div className="alert alert-danger" role="alert">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <strong>Erreur</strong>
                  <div className="mt-1">{error}</div>
                </div>
              )}

              <form onSubmit={handleSubmit}>
                {/* Type d'annonce */}
                <div className="row mb-4">
                  <div className="col-12">
                    <label className="form-label fw-bold">Type d'annonce *</label>
                    <div className="d-grid gap-2 d-md-flex">
                      <button
                        type="button"
                        className={`btn btn-lg flex-fill ${formData.type === 'buy' ? 'btn-success' : 'btn-outline-success'}`}
                        onClick={() => setFormData(prev => ({ ...prev, type: 'buy' }))}
                      >
                        <i className="bi bi-arrow-down-circle me-2"></i>
                        Je veux ACHETER
                      </button>
                      <button
                        type="button"
                        className={`btn btn-lg flex-fill ${formData.type === 'sell' ? 'btn-danger' : 'btn-outline-danger'}`}
                        onClick={() => setFormData(prev => ({ ...prev, type: 'sell' }))}
                      >
                        <i className="bi bi-arrow-up-circle me-2"></i>
                        Je veux VENDRE
                      </button>
                    </div>
                  </div>
                </div>

                {/* Montant et Prix */}
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="amount" className="form-label">
                      Montant disponible *
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-lg"
                      id="amount"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      placeholder="1000"
                      required
                    />
                    <div className="form-text">
                      Quantité totale disponible
                    </div>
                  </div>

                  <div className="col-md-6 mb-3">
                    <label htmlFor="price" className="form-label">
                      Prix (MAD) *
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-lg"
                      id="price"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      step="0.01"
                      min="0"
                      placeholder="10.50"
                      required
                    />
                    <div className="form-text">
                      Prix en dirhams par unité
                    </div>
                  </div>
                </div>

                {/* Devise */}
                <div className="mb-3">
                  <label htmlFor="currency" className="form-label">
                    Devise de transaction *
                  </label>
                  <select
                    className="form-select"
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    required
                    disabled={dataLoading}
                  >
                    <option value="">{dataLoading ? 'Chargement...' : 'Sélectionnez une devise'}</option>
                    {currencies.map(currency => (
                      <option key={currency.id} value={`/api/currencies/${currency.id}`}>
                        {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                  {currencies.length === 0 && !dataLoading && (
                    <div className="text-warning small mt-1">
                      Aucune devise disponible. Vérifiez votre base de données.
                    </div>
                  )}
                </div>

                {/* Méthode de paiement principale */}
                <div className="mb-3">
                  <label htmlFor="paymentMethod" className="form-label">
                    Méthode de paiement principale *
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    id="paymentMethod"
                    name="paymentMethod"
                    value={formData.paymentMethod}
                    onChange={handleInputChange}
                    placeholder="Ex: Virement CIH, Cash Casablanca, PayPal..."
                    required
                  />
                  <div className="form-text">
                    Décrivez votre méthode de paiement préférée
                  </div>
                </div>

                {/* Méthodes de paiement acceptées */}
                <div className="mb-4">
                  <label className="form-label">
                    Méthodes de paiement acceptées *
                  </label>
                  <div className="border rounded p-3">
                    {dataLoading ? (
                      <div className="text-center text-muted py-3">
                        <div className="spinner-border spinner-border-sm me-2"></div>
                        Chargement des méthodes de paiement...
                      </div>
                    ) : paymentMethods.length === 0 ? (
                      <div className="text-center text-warning py-3">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Aucune méthode de paiement disponible
                      </div>
                    ) : (
                      <div className="row">
                        {paymentMethods.map(method => (
                          <div key={method.id} className="col-md-6 mb-2">
                            <div className="form-check">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`method-${method.id}`}
                                checked={formData.acceptedPaymentMethods.includes(`/api/payment_methods/${method.id}`)}
                                onChange={() => handlePaymentMethodToggle(`/api/payment_methods/${method.id}`)}
                              />
                              <label className="form-check-label" htmlFor={`method-${method.id}`}>
                                <strong>{method.name}</strong>
                                {method.details && (
                                  <small className="text-muted d-block">{method.details}</small>
                                )}
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  {formData.acceptedPaymentMethods.length === 0 && !dataLoading && paymentMethods.length > 0 && (
                    <div className="text-danger small mt-2">
                      Veuillez sélectionner au moins une méthode de paiement
                    </div>
                  )}
                </div>

                {/* Boutons de soumission */}
                <div className="d-grid gap-2 d-md-flex justify-content-md-end">
                  <button
                    type="button"
                    className="btn btn-outline-secondary me-md-2"
                    onClick={() => navigate('/dashboard/ads')}
                    disabled={loading}
                  >
                    Annuler
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading || !formData.currency || formData.acceptedPaymentMethods.length === 0 || !formData.paymentMethod.trim() || dataLoading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Création...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        Créer l'annonce
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdCreate;