// src/components/AdCreate.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

// Types optimisés
interface Currency {
  id: number;
  code: string;
  name: string;
  decimals: number;
  type?: 'crypto' | 'fiat';
}

interface UserBankDetail {
  id: number;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  maskedAccountNumber: string;
  isActive: boolean;
  branchName?: string;
}

interface AdCreateData {
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  currency: string;
  minAmountPerTransaction?: number;
  maxAmountPerTransaction?: number;
  timeLimitMinutes: number;
  acceptedBankDetails: number[];
  terms?: string;
}

// Validation constants
const VALIDATION = {
  MIN_AMOUNT: 10,
  MAX_AMOUNT: 100000,
  MIN_PRICE: 0.01,
  DEFAULT_TIME_LIMIT: 60,
  TIME_OPTIONS: [
    { value: 15, label: '15 minutes (test rapide)' },
    { value: 60, label: '1 heure' },
    { value: 1440, label: '24 heures' },
    { value: 4320, label: '3 jours' },
    { value: 10080, label: '7 jours' }
  ]
} as const;

const AdCreate: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // États pour les données
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [userBankDetails, setUserBankDetails] = useState<UserBankDetail[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // État du formulaire
  const [formData, setFormData] = useState<AdCreateData>({
    type: 'buy',
    amount: 0,
    price: 0,
    currency: '',
    minAmountPerTransaction: undefined,
    maxAmountPerTransaction: undefined,
    timeLimitMinutes: VALIDATION.DEFAULT_TIME_LIMIT,
    acceptedBankDetails: [],
    terms: ''
  });

  // Helper pour extraire les données de l'API Platform
  const extractHydraMember = useCallback((data: any): any[] => {
    if (data?.member && Array.isArray(data.member)) {
      return data.member;
    } else if (data?.['hydra:member'] && Array.isArray(data['hydra:member'])) {
      return data['hydra:member'];
    } else if (Array.isArray(data)) {
      return data;
    }
    return [];
  }, []);

  // Filtrer les crypto-monnaies
  const getCryptoCurrencies = useCallback((): Currency[] => {
    return currencies.filter(currency => {
      if (currency.type !== undefined) {
        return currency.type === 'crypto';
      }
      return ['USDT', 'BTC', 'ETH', 'BNB', 'SOL'].includes(currency.code);
    });
  }, [currencies]);

  // Filtrer les infos bancaires actives
  const getActiveBankDetails = useCallback((): UserBankDetail[] => {
    return userBankDetails.filter(bank => bank.isActive);
  }, [userBankDetails]);

  // Charger les données initiales
  useEffect(() => {
    const loadFormData = async () => {
      try {
        setDataLoading(true);
        setError(null);
        console.log('🔄 Chargement des données pour création d\'annonce...');

        const [currenciesResponse, bankDetailsResponse] = await Promise.all([
          api.get('/currencies'),
          api.get('/user_bank_details')
        ]);

        const currenciesData = extractHydraMember(currenciesResponse.data);
        const bankDetailsData = extractHydraMember(bankDetailsResponse.data);

        console.log('📥 Données chargées:', {
          currencies: currenciesData.length,
          bankDetails: bankDetailsData.length
        });

        setCurrencies(currenciesData);
        setUserBankDetails(bankDetailsData);

        // Sélectionner USDT par défaut
        const defaultCurrency = currenciesData.find((c: Currency) => c.code === 'USDT');
        if (defaultCurrency && !formData.currency) {
          setFormData(prev => ({
            ...prev,
            currency: `/api/currencies/${defaultCurrency.id}`
          }));
        }

        // Sélectionner automatiquement les infos bancaires actives
        const activeBanks = bankDetailsData.filter((b: UserBankDetail) => b.isActive);
        if (activeBanks.length > 0) {
          setFormData(prev => ({
            ...prev,
            acceptedBankDetails: activeBanks.map((b: UserBankDetail) => b.id)
          }));
        }

      } catch (err: any) {
        console.error('❌ Erreur lors du chargement des données:', err);
        setError('Impossible de charger les données nécessaires. Vérifiez la connexion API.');
      } finally {
        setDataLoading(false);
      }
    };

    if (user) {
      loadFormData();
    } else {
      setError('Vous devez être connecté pour créer une annonce');
    }
  }, [user, extractHydraMember]);

  // Gestion des changements de champs
  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => {
      let newValue: any = value;
      
      if (type === 'number') {
        newValue = value === '' ? 0 : parseFloat(value);
        if (isNaN(newValue)) newValue = 0;
      }
      
      return {
        ...prev,
        [name]: newValue
      };
    });

    // Effacer les messages d'erreur/success quand l'utilisateur tape
    if (error) setError(null);
    if (success) setSuccess(null);
  }, [error, success]);

  // Toggle des infos bancaires
  const handleBankDetailToggle = useCallback((bankDetailId: number) => {
    setFormData(prev => {
      const isSelected = prev.acceptedBankDetails.includes(bankDetailId);
      return {
        ...prev,
        acceptedBankDetails: isSelected
          ? prev.acceptedBankDetails.filter(id => id !== bankDetailId)
          : [...prev.acceptedBankDetails, bankDetailId]
      };
    });
  }, []);

  // Calculs
  const calculateTotal = useCallback((): number => {
    return formData.amount * formData.price;
  }, [formData.amount, formData.price]);

  const getSelectedCurrency = useCallback((): Currency | undefined => {
    if (!formData.currency) return undefined;
    const currencyId = formData.currency.split('/').pop();
    return currencies.find(c => c.id.toString() === currencyId);
  }, [formData.currency, currencies]);

  const getSelectedBankDetails = useCallback((): UserBankDetail[] => {
    return userBankDetails.filter(bank =>
      formData.acceptedBankDetails.includes(bank.id)
    );
  }, [formData.acceptedBankDetails, userBankDetails]);

  // Validation
  const validateForm = useCallback((): string | null => {
    const selectedCurrency = getSelectedCurrency();
    
    if (!formData.currency || !selectedCurrency) {
      return 'Veuillez sélectionner une crypto-monnaie';
    }

    if (formData.acceptedBankDetails.length === 0) {
      return 'Veuillez sélectionner au moins une information bancaire';
    }

    if (formData.amount < VALIDATION.MIN_AMOUNT) {
      return `Le montant minimum est de ${VALIDATION.MIN_AMOUNT} ${selectedCurrency.code}`;
    }

    if (formData.amount > VALIDATION.MAX_AMOUNT) {
      return `Le montant maximum est de ${VALIDATION.MAX_AMOUNT} ${selectedCurrency.code}`;
    }

    if (formData.price < VALIDATION.MIN_PRICE) {
      return `Le prix minimum est de ${VALIDATION.MIN_PRICE} MAD`;
    }

    // Validation des limites min/max
    if (formData.minAmountPerTransaction && formData.maxAmountPerTransaction) {
      if (formData.minAmountPerTransaction > formData.maxAmountPerTransaction) {
        return 'Le montant minimum par transaction ne peut pas dépasser le montant maximum';
      }
      if (formData.minAmountPerTransaction > formData.amount) {
        return 'Le montant minimum par transaction ne peut pas dépasser le montant total';
      }
      if (formData.maxAmountPerTransaction < formData.minAmountPerTransaction) {
        return 'Le montant maximum par transaction ne peut pas être inférieur au minimum';
      }
    }

    if (formData.minAmountPerTransaction && formData.minAmountPerTransaction < VALIDATION.MIN_AMOUNT) {
      return `Le montant minimum par transaction doit être d'au moins ${VALIDATION.MIN_AMOUNT}`;
    }

    return null;
  }, [formData, getSelectedCurrency]);

  // Soumission du formulaire
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const validationError = validateForm();
      if (validationError) {
        throw new Error(validationError);
      }

      // Préparation des données pour API Platform
      const postData = {
        type: formData.type,
        amount: formData.amount.toString(), // Decimal en string pour PostgreSQL
        price: formData.price.toString(),   // Decimal en string pour PostgreSQL
        currency: formData.currency,
        acceptedBankDetails: formData.acceptedBankDetails.map(id => `/api/user_bank_details/${id}`),
        minAmountPerTransaction: formData.minAmountPerTransaction?.toString() || null,
        maxAmountPerTransaction: formData.maxAmountPerTransaction?.toString() || null,
        timeLimitMinutes: formData.timeLimitMinutes,
        status: 'active',
        terms: formData.terms?.trim() || undefined,
        paymentMethod: `Multiple méthodes (${getSelectedBankDetails().map(b => b.bankName).join(', ')})`
      };

      console.log('📤 Envoi des données à l\'API:', postData);

      const response = await api.post('/ads', postData);
      console.log('✅ Annonce créée:', response.data);

      setSuccess('✅ Annonce créée avec succès ! Redirection...');
      
      // Redirection après 2 secondes
      setTimeout(() => {
        navigate('/dashboard/ads');
      }, 2000);

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
        const errorMessages = apiError.violations
          .map((v: any) => `${v.propertyPath}: ${v.message}`)
          .join(', ');
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

  // Rendu des infos bancaires
  const renderBankDetails = () => {
    const activeBanks = getActiveBankDetails();

    if (dataLoading) {
      return (
        <div className="text-center text-muted py-3">
          <div className="spinner-border spinner-border-sm me-2"></div>
          Chargement des informations bancaires...
        </div>
      );
    }

    if (activeBanks.length === 0) {
      return (
        <div className="text-center text-warning py-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <p className="mb-2">Aucune information bancaire active</p>
          <button
            type="button"
            className="btn btn-sm btn-outline-primary"
            onClick={() => navigate('/dashboard/bank-details')}
            disabled={loading}
          >
            <i className="bi bi-plus-circle me-1"></i>
            Gérer mes coordonnées bancaires
          </button>
        </div>
      );
    }

    return (
      <div className="row">
        {activeBanks.map(bank => (
          <div key={bank.id} className="col-md-6 mb-3">
            <div className="form-check card p-3">
              <input
                className="form-check-input"
                type="checkbox"
                id={`bank-${bank.id}`}
                checked={formData.acceptedBankDetails.includes(bank.id)}
                onChange={() => handleBankDetailToggle(bank.id)}
                disabled={loading}
              />
              <label className="form-check-label ms-2" htmlFor={`bank-${bank.id}`}>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <strong className="d-block">{bank.bankName}</strong>
                    <small className="text-muted d-block">
                      {bank.accountHolder}
                    </small>
                    <small className="text-muted d-block">
                      {bank.maskedAccountNumber}
                      {bank.branchName && ` • ${bank.branchName}`}
                    </small>
                  </div>
                  <span className={`badge ${bank.isActive ? 'bg-success' : 'bg-secondary'}`}>
                    {bank.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>
              </label>
            </div>
          </div>
        ))}
      </div>
    );
  };

  // Données calculées
  const cryptoCurrencies = getCryptoCurrencies();
  const selectedCurrency = getSelectedCurrency();
  const selectedBankDetails = getSelectedBankDetails();
  const totalAmount = calculateTotal();
  const validationError = validateForm();

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-8">
          {/* En-tête */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 mb-1 fw-bold">📝 Créer une nouvelle annonce</h1>
              <p className="text-muted mb-0">
                {formData.type === 'buy' 
                  ? 'Publiez votre demande d\'achat de crypto'
                  : 'Publiez votre offre de vente de crypto'
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
              Retour aux annonces
            </button>
          </div>

          {/* Messages d'état */}
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
              <strong>Succès :</strong> {success}
            </div>
          )}

          {/* Formulaire principal */}
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                {/* Section 1: Type d'annonce */}
                <div className="mb-5">
                  <h5 className="mb-3 fw-bold">
                    <i className="bi bi-tag me-2"></i>
                    1. Type d'annonce
                  </h5>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <button
                        type="button"
                        className={`btn w-100 h-100 py-3 ${formData.type === 'buy' 
                          ? 'btn-success border-3' 
                          : 'btn-outline-success'}`}
                        onClick={() => setFormData(prev => ({ ...prev, type: 'buy' }))}
                        disabled={loading}
                      >
                        <i className="bi bi-arrow-down-circle fs-4 mb-2 d-block"></i>
                        <span className="fw-bold">ACHETER</span>
                        <small className="d-block mt-1">Je veux acheter de la crypto</small>
                      </button>
                    </div>
                    <div className="col-md-6">
                      <button
                        type="button"
                        className={`btn w-100 h-100 py-3 ${formData.type === 'sell' 
                          ? 'btn-danger border-3' 
                          : 'btn-outline-danger'}`}
                        onClick={() => setFormData(prev => ({ ...prev, type: 'sell' }))}
                        disabled={loading}
                      >
                        <i className="bi bi-arrow-up-circle fs-4 mb-2 d-block"></i>
                        <span className="fw-bold">VENDRE</span>
                        <small className="d-block mt-1">Je veux vendre de la crypto</small>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 2: Détails de l'échange */}
                <div className="mb-5">
                  <h5 className="mb-3 fw-bold">
                    <i className="bi bi-currency-exchange me-2"></i>
                    2. Détails de l'échange
                  </h5>
                  
                  {/* Crypto-monnaie */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Crypto-monnaie *</label>
                    <select
                      className="form-select form-select-lg"
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      required
                      disabled={dataLoading || loading}
                    >
                      <option value="">{dataLoading ? 'Chargement...' : 'Sélectionnez une crypto'}</option>
                      {cryptoCurrencies.map(currency => (
                        <option key={currency.id} value={`/api/currencies/${currency.id}`}>
                          {currency.name} ({currency.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Montant et Prix */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        {formData.type === 'buy' ? 'Montant à acheter *' : 'Montant à vendre *'}
                      </label>
                      <div className="input-group input-group-lg">
                        <input
                          type="number"
                          className="form-control"
                          name="amount"
                          value={formData.amount || ''}
                          onChange={handleInputChange}
                          step="0.000001"
                          min={VALIDATION.MIN_AMOUNT}
                          max={VALIDATION.MAX_AMOUNT}
                          required
                          disabled={loading}
                        />
                        <span className="input-group-text bg-light">
                          {selectedCurrency?.code || 'USDT'}
                        </span>
                      </div>
                      <div className="form-text">
                        Minimum: {VALIDATION.MIN_AMOUNT} {selectedCurrency?.code || 'USDT'}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Prix unitaire *</label>
                      <div className="input-group input-group-lg">
                        <input
                          type="number"
                          className="form-control"
                          name="price"
                          value={formData.price || ''}
                          onChange={handleInputChange}
                          step="0.01"
                          min={VALIDATION.MIN_PRICE}
                          required
                          disabled={loading}
                        />
                        <span className="input-group-text bg-light">MAD</span>
                      </div>
                      <div className="form-text">
                        Prix en dirhams marocains par {selectedCurrency?.code || 'USDT'}
                      </div>
                    </div>
                  </div>

                  {/* Calcul du total */}
                  {formData.amount > 0 && formData.price > 0 && (
                    <div className="alert alert-primary">
                      <div className="row align-items-center">
                        <div className="col-md-8">
                          <strong className="d-block">Montant total de la transaction :</strong>
                          <small className="text-muted">
                            {formData.amount} {selectedCurrency?.code || 'USDT'} × {formData.price} MAD
                          </small>
                        </div>
                        <div className="col-md-4 text-end">
                          <span className="fs-3 fw-bold text-primary">
                            {totalAmount.toLocaleString('fr-MA', { minimumFractionDigits: 2 })} MAD
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Limites par transaction */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Limite minimale par transaction</label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          name="minAmountPerTransaction"
                          value={formData.minAmountPerTransaction || ''}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          disabled={loading}
                          placeholder="Optionnel"
                        />
                        <span className="input-group-text bg-light">{selectedCurrency?.code || 'USDT'}</span>
                      </div>
                      <div className="form-text">
                        Définir une limite basse (optionnel)
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">Limite maximale par transaction</label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          name="maxAmountPerTransaction"
                          value={formData.maxAmountPerTransaction || ''}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          disabled={loading}
                          placeholder="Optionnel"
                        />
                        <span className="input-group-text bg-light">{selectedCurrency?.code || 'USDT'}</span>
                      </div>
                      <div className="form-text">
                        Limiter la taille des transactions (optionnel)
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Paiement et durée */}
                <div className="mb-5">
                  <h5 className="mb-3 fw-bold">
                    <i className="bi bi-credit-card me-2"></i>
                    3. Paiement et durée
                  </h5>

                  {/* Informations bancaires */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      {formData.type === 'buy' 
                        ? 'Vos informations bancaires pour recevoir les fonds *'
                        : 'Vos informations bancaires pour recevoir les paiements *'
                      }
                    </label>
                    <div className="border rounded p-3 bg-light">
                      {renderBankDetails()}
                    </div>
                    {selectedBankDetails.length > 0 && (
                      <div className="mt-2 text-success small">
                        <i className="bi bi-check-circle me-1"></i>
                        {selectedBankDetails.length} information(s) bancaire(s) sélectionnée(s)
                      </div>
                    )}
                  </div>

                  {/* Durée de validité */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">Durée de validité de l'annonce</label>
                    <select
                      className="form-select"
                      name="timeLimitMinutes"
                      value={formData.timeLimitMinutes}
                      onChange={handleInputChange}
                      disabled={loading}
                    >
                      {VALIDATION.TIME_OPTIONS.map(option => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="form-text">
                      L'annonce expirera automatiquement après ce délai
                    </div>
                  </div>

                  {/* Conditions supplémentaires */}
                  <div>
                    <label className="form-label fw-semibold">Conditions supplémentaires</label>
                    <textarea
                      className="form-control"
                      name="terms"
                      value={formData.terms}
                      onChange={handleInputChange}
                      placeholder="Ex: Disponible de 9h à 18h, virements immédiats uniquement, première transaction limitée à 1000 MAD..."
                      rows={3}
                      disabled={loading}
                    />
                    <div className="form-text">
                      Précisez vos conditions particulières (optionnel)
                    </div>
                  </div>
                </div>

                {/* Boutons de soumission */}
                <div className="d-flex justify-content-between align-items-center pt-4 border-top">
                  <div>
                    {validationError && (
                      <div className="text-danger small">
                        <i className="bi bi-exclamation-circle me-1"></i>
                        {validationError}
                      </div>
                    )}
                  </div>
                  <div className="d-flex gap-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => navigate('/dashboard/ads')}
                      disabled={loading}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary px-4"
                      disabled={
                        loading || 
                        dataLoading || 
                        !!validationError ||
                        !formData.currency ||
                        formData.acceptedBankDetails.length === 0 ||
                        formData.amount < VALIDATION.MIN_AMOUNT ||
                        formData.price < VALIDATION.MIN_PRICE
                      }
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Création en cours...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          {formData.type === 'buy' ? 'Publier la demande' : 'Publier l\'offre'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Informations importantes */}
          <div className="card mt-4 bg-light border-0">
            <div className="card-body">
              <h6 className="card-title fw-bold">
                <i className="bi bi-info-circle me-2"></i>
                Informations importantes
              </h6>
              <ul className="list-unstyled small mb-0">
                <li className="mb-2">
                  <i className="bi bi-shield-check text-success me-2"></i>
                  Toutes les transactions sont sécurisées par notre système
                </li>
                <li className="mb-2">
                  <i className="bi bi-clock text-primary me-2"></i>
                  L'annonce expirera automatiquement après la durée sélectionnée
                </li>
                <li className="mb-2">
                  <i className="bi bi-currency-exchange text-warning me-2"></i>
                  Les prix sont fixes pour toute la durée de l'annonce
                </li>
                <li className="mb-2">
                  <i className="bi bi-bank text-info me-2"></i>
                  Seules vos informations bancaires sélectionnées seront visibles
                </li>
                <li>
                  <i className="bi bi-exclamation-triangle text-danger me-2"></i>
                  Respectez les lois marocaines concernant les transactions financières
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdCreate;