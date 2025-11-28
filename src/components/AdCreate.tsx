// src/components/AdCreate.tsx
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

interface Currency {
  id: number;
  code: string;
  name: string;
  decimals: number;
  type?: 'crypto' | 'fiat';
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
  currency: string;
  acceptedPaymentMethods: string[];
  terms?: string;
}

const AdCreate: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  const [formData, setFormData] = useState<AdCreateData>({
    type: 'buy',
    amount: 0,
    price: 0,
    currency: '',
    acceptedPaymentMethods: [],
    terms: ''
  });

  const extractHydraMember = (data: any): any[] => {
    if (data.member && Array.isArray(data.member)) {
      return data.member;
    } else if (data['hydra:member'] && Array.isArray(data['hydra:member'])) {
      return data['hydra:member'];
    } else if (Array.isArray(data)) {
      return data;
    }
    return [];
  };

  const getCryptoCurrencies = (): Currency[] => {
    return currencies.filter(currency => {
      if (currency.type !== undefined) {
        return currency.type === 'crypto';
      }
      return ['USDT', 'BTC', 'ETH'].includes(currency.code);
    });
  };

  useEffect(() => {
    const loadFormData = async () => {
      try {
        setDataLoading(true);
        setError(null);
        console.log('🔄 Chargement des données depuis API...');

        const [currenciesResponse, paymentMethodsResponse] = await Promise.all([
          api.get('/currencies'),
          api.get('/payment_methods')
        ]);

        const currenciesData = extractHydraMember(currenciesResponse.data);
        const paymentMethodsData = extractHydraMember(paymentMethodsResponse.data);

        console.log('📥 Devises chargées:', currenciesData);
        console.log('📥 Méthodes de paiement chargées:', paymentMethodsData);

        setCurrencies(currenciesData);
        setPaymentMethods(paymentMethodsData);

        const defaultCurrency = currenciesData.find((c: Currency) =>
          c.code === 'USDT' || (c.type && c.type === 'crypto')
        );

        if (defaultCurrency && !formData.currency) {
          setFormData(prev => ({
            ...prev,
            currency: `/api/currencies/${defaultCurrency.id}`
          }));
        }
      } catch (err: any) {
        console.error('❌ Erreur lors du chargement des données:', err);
        setError('Impossible de charger les données nécessaires. Vérifiez la connexion API.');
      } finally {
        setDataLoading(false);
      }
    };

    loadFormData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;

    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? parseFloat(value) || 0 : value
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

  const calculateTotal = (): number => {
    return formData.amount * formData.price;
  };

  const getSelectedCurrency = (): Currency | undefined => {
    return currencies.find(c => `/api/currencies/${c.id}` === formData.currency);
  };

  const getSelectedPaymentMethods = (): PaymentMethod[] => {
    return paymentMethods.filter(method =>
      formData.acceptedPaymentMethods.includes(`/api/payment_methods/${method.id}`)
    );
  };

  const validateForm = (): string | null => {
    if (!formData.currency) {
      return 'Veuillez sélectionner une crypto-monnaie';
    }

    if (formData.acceptedPaymentMethods.length === 0) {
      return 'Veuillez sélectionner au moins une méthode de paiement';
    }

    if (formData.amount <= 0) {
      return formData.type === 'buy'
        ? 'Le montant à acheter doit être positif'
        : 'Le montant à vendre doit être positif';
    }

    if (formData.price <= 0) {
      return 'Le prix doit être positif';
    }

    if (formData.amount < 10) {
      return 'Le montant minimum est de 10 USDT';
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const validationError = validateForm();
      if (validationError) {
        throw new Error(validationError);
      }

      // Préparer les données pour l'API Platform
      const postData = {
        type: formData.type,
        amount: formData.amount,
        price: formData.price,
        currency: formData.currency,
        acceptedPaymentMethods: formData.acceptedPaymentMethods,
        paymentMethod: `Principal: ${getSelectedPaymentMethods()[0]?.name || 'Multiple méthodes'}`,
        status: 'active',
        terms: formData.terms || undefined
      };

      console.log('📤 Données envoyées à l\'API:', postData);

      const response = await api.post('/ads', postData);
      console.log('✅ Réponse API:', response.data);

      if (response.status === 201) {
        console.log('🎉 Annonce créée avec succès!');
        navigate('/dashboard/ads');
      }

    } catch (err: any) {
      console.error('❌ Erreur création annonce:', err);
      handleApiError(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApiError = (err: any) => {
    if (err.response?.data) {
      const apiError = err.response.data;
      console.error('📋 Détails erreur API:', apiError);

      if (apiError.violations) {
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
  };

  const renderPaymentMethods = () => {
    if (dataLoading) {
      return (
        <div className="text-center text-muted py-3">
          <div className="spinner-border spinner-border-sm me-2"></div>
          Chargement des méthodes de paiement...
        </div>
      );
    }

    if (paymentMethods.length === 0) {
      return (
        <div className="text-center text-warning py-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Aucune méthode de paiement disponible
        </div>
      );
    }

    return (
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
                disabled={loading}
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
    );
  };

  const cryptoCurrencies = getCryptoCurrencies();
  const selectedCurrency = getSelectedCurrency();
  const selectedPaymentMethods = getSelectedPaymentMethods();

  return (
    <div className="container">
      <div className="row justify-content-center">
        <div className="col-md-8">
          {/* En-tête */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 mb-1">Créer une annonce</h1>
              <p className="text-muted">
                {formData.type === 'buy'
                  ? 'Publiez votre demande d\'achat'
                  : 'Publiez votre offre de vente'
                }
              </p>
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate('/dashboard/ads')}
              disabled={loading}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Retour
            </button>
          </div>

          {/* Formulaire */}
          <div className="card">
            <div className="card-body">
              {error && (
                <div className="alert alert-danger d-flex align-items-center" role="alert">
                  <i className="bi bi-exclamation-triangle me-2 fs-5"></i>
                  <div>
                    <strong>Erreur</strong>
                    <div className="mt-1">{error}</div>
                  </div>
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
                        disabled={loading}
                      >
                        <i className="bi bi-arrow-down-circle me-2"></i>
                        Je veux ACHETER
                      </button>
                      <button
                        type="button"
                        className={`btn btn-lg flex-fill ${formData.type === 'sell' ? 'btn-danger' : 'btn-outline-danger'}`}
                        onClick={() => setFormData(prev => ({ ...prev, type: 'sell' }))}
                        disabled={loading}
                      >
                        <i className="bi bi-arrow-up-circle me-2"></i>
                        Je veux VENDRE
                      </button>
                    </div>
                  </div>
                </div>

                {/* Résumé de l'annonce */}
                {formData.amount > 0 && formData.price > 0 && (
                  <div className={`alert ${formData.type === 'buy' ? 'alert-success' : 'alert-danger'} mb-4`}>
                    <div className="d-flex justify-content-between align-items-center">
                      <div>
                        <strong>
                          {formData.type === 'buy' ? '🛒 Vous voulez ACHETER' : '💰 Vous voulez VENDRE'}
                        </strong>
                        <div className="mt-1">
                          <strong>{formData.amount} {selectedCurrency?.code || 'USDT'}</strong>
                          {' à '}
                          <strong>{formData.price} MAD/{selectedCurrency?.code || 'USDT'}</strong>
                          <br />
                          <span className="text-muted">
                            Total: <strong>{calculateTotal().toFixed(2)} MAD</strong>
                          </span>
                        </div>
                      </div>
                      {selectedPaymentMethods.length > 0 && (
                        <div className="text-end">
                          <small className="text-muted">
                            {selectedPaymentMethods.length} méthode(s) sélectionnée(s)
                          </small>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Crypto à échanger */}
                <div className="mb-3">
                  <label htmlFor="currency" className="form-label">
                    Crypto-monnaie à échanger *
                  </label>
                  <select
                    className="form-select"
                    id="currency"
                    name="currency"
                    value={formData.currency}
                    onChange={handleInputChange}
                    required
                    disabled={dataLoading || loading}
                  >
                    <option value="">
                      {dataLoading ? 'Chargement...' : 'Sélectionnez une crypto-monnaie'}
                    </option>
                    {cryptoCurrencies.map(currency => (
                      <option key={currency.id} value={`/api/currencies/${currency.id}`}>
                        {currency.name} ({currency.code})
                      </option>
                    ))}
                  </select>
                  {cryptoCurrencies.length === 0 && !dataLoading && (
                    <div className="alert alert-warning mt-2 py-2">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      Aucune crypto-monnaie disponible
                    </div>
                  )}
                  <div className="form-text">
                    Choisissez la crypto-monnaie que vous voulez acheter ou vendre
                  </div>
                </div>

                {/* Montant et Prix */}
                <div className="row">
                  <div className="col-md-6 mb-3">
                    <label htmlFor="amount" className="form-label">
                      {formData.type === 'buy' ? 'Montant à acheter *' : 'Montant à vendre *'}
                    </label>
                    <input
                      type="number"
                      className="form-control form-control-lg"
                      id="amount"
                      name="amount"
                      value={formData.amount}
                      onChange={handleInputChange}
                      step="0.000001"
                      min="10"
                      placeholder={formData.type === 'buy' ? "1000" : "500"}
                      required
                      disabled={loading}
                    />
                    <div className="form-text">
                      {formData.type === 'buy'
                        ? `Quantité de ${selectedCurrency?.code || 'crypto'} que vous souhaitez acheter (min: 10)`
                        : `Quantité de ${selectedCurrency?.code || 'crypto'} que vous mettez en vente (min: 10)`
                      }
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
                      min="0.01"
                      placeholder="10.50"
                      required
                      disabled={loading}
                    />
                    <div className="form-text">
                      Prix en dirhams marocains par unité de {selectedCurrency?.code || 'crypto'}
                    </div>
                  </div>
                </div>

                {/* Calcul automatique du total */}
                {formData.amount > 0 && formData.price > 0 && (
                  <div className="alert alert-info mb-3">
                    <div className="row">
                      <div className="col-6">
                        <strong>Montant total:</strong>
                      </div>
                      <div className="col-6 text-end">
                        <strong className="text-primary fs-5">
                          {calculateTotal().toFixed(2)} MAD
                        </strong>
                      </div>
                    </div>
                    <small className="text-muted">
                      {formData.amount} {selectedCurrency?.code || 'USDT'} × {formData.price} MAD
                    </small>
                  </div>
                )}

                {/* Méthodes de paiement acceptées */}
                <div className="mb-4">
                  <label className="form-label">
                    {formData.type === 'buy'
                      ? 'Méthodes de paiement que vous utiliserez *'
                      : 'Méthodes de paiement que vous acceptez *'
                    }
                  </label>
                  <div className="border rounded p-3">
                    {renderPaymentMethods()}
                  </div>
                  {formData.acceptedPaymentMethods.length === 0 && !dataLoading && paymentMethods.length > 0 && (
                    <div className="text-danger small mt-2">
                      <i className="bi bi-exclamation-circle me-1"></i>
                      Veuillez sélectionner au moins une méthode de paiement
                    </div>
                  )}
                </div>

                {/* Conditions supplémentaires */}
                <div className="mb-4">
                  <label htmlFor="terms" className="form-label">
                    Conditions supplémentaires (optionnel)
                  </label>
                  <textarea
                    className="form-control"
                    id="terms"
                    name="terms"
                    value={formData.terms}
                    onChange={handleInputChange}
                    placeholder="Ex: Disponible de 9h à 18h, transfert immédiat requis, limite par transaction..."
                    rows={3}
                    disabled={loading}
                  />
                  <div className="form-text">
                    Précisez vos conditions particulières (horaires, délais, limites, etc.)
                  </div>
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
                    disabled={loading || !formData.currency || formData.acceptedPaymentMethods.length === 0 || formData.amount < 10 || formData.price <= 0 || dataLoading}
                  >
                    {loading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Création...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-check-circle me-2"></i>
                        {formData.type === 'buy' ? 'Publier la demande' : 'Publier l\'offre'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* Informations importantes */}
          <div className="card mt-4 bg-light">
            <div className="card-body">
              <h6 className="card-title">
                <i className="bi bi-info-circle me-2"></i>
                Informations importantes
              </h6>
              <ul className="small mb-0">
                <li>Votre annonce sera visible par tous les utilisateurs de la plateforme</li>
                <li>Le montant minimum est de 10 USDT (ou équivalent)</li>
                <li>Vous pouvez mettre en pause votre annonce à tout moment</li>
                <li>Les transactions sont sécurisées par notre système</li>
                <li>Respectez les lois marocaines concernant les transactions financières</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdCreate;
