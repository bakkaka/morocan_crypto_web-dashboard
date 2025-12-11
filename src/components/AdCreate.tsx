// src/components/AdCreate.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

// Types
interface Currency {
  id: number;
  code: string;
  name: string;
  decimals: number;
  type: 'crypto' | 'fiat';
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

// Constants
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

  // Data states
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [userBankDetails, setUserBankDetails] = useState<UserBankDetail[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  // Form state
  const [formData, setFormData] = useState<AdCreateData>({
    type: 'buy',
    amount: 100,
    price: 10.5,
    currency: '',
    minAmountPerTransaction: undefined,
    maxAmountPerTransaction: undefined,
    timeLimitMinutes: VALIDATION.DEFAULT_TIME_LIMIT,
    acceptedBankDetails: [],
    terms: ''
  });

  const extractHydraMember = useCallback((data: any): any[] => {
    if (data?.member && Array.isArray(data.member)) return data.member;
    if (data?.['hydra:member'] && Array.isArray(data['hydra:member'])) return data['hydra:member'];
    if (Array.isArray(data)) return data;
    return [];
  }, []);

  const getCryptoCurrencies = useCallback((): Currency[] => {
    if (!currencies.length) return [];
    return currencies.filter(c => c.type === 'crypto');
  }, [currencies]);

  const getActiveBankDetails = useCallback((): UserBankDetail[] => {
    return userBankDetails.filter(bank => bank.isActive);
  }, [userBankDetails]);

  // Load initial data
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
          bankDetails: bankDetailsData.length,
          cryptoCurrencies: currenciesData.filter((c: Currency) => c.type === 'crypto').length
        });

        setCurrencies(currenciesData);
        setUserBankDetails(bankDetailsData);

        // Auto-select first crypto currency
        const cryptoCurrencies = currenciesData.filter((c: Currency) => c.type === 'crypto');
        
        if (cryptoCurrencies.length > 0 && !formData.currency) {
          setFormData(prev => ({
            ...prev,
            currency: `/api/currencies/${cryptoCurrencies[0].id}`
          }));
        }

        // Auto-select active bank details
        const activeBanks = bankDetailsData.filter((b: UserBankDetail) => b.isActive);
        if (activeBanks.length > 0) {
          setFormData(prev => ({
            ...prev,
            acceptedBankDetails: activeBanks.map((b: UserBankDetail) => b.id)
          }));
        }

      } catch (err: any) {
        console.error('❌ Erreur chargement données:', err);
        setError('Impossible de charger les données. Vérifiez la connexion API.');
      } finally {
        setDataLoading(false);
      }
    };

    if (user) {
      loadFormData();
    } else {
      navigate('/login');
    }
  }, [user, navigate, extractHydraMember]);

  const handleInputChange = useCallback((
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value === '' ? 0 : parseFloat(value)) : value
    }));
    
    if (error) setError(null);
    if (success) setSuccess(null);
  }, [error, success]);

  const handleBankDetailToggle = useCallback((bankDetailId: number) => {
    setFormData(prev => ({
      ...prev,
      acceptedBankDetails: prev.acceptedBankDetails.includes(bankDetailId)
        ? prev.acceptedBankDetails.filter(id => id !== bankDetailId)
        : [...prev.acceptedBankDetails, bankDetailId]
    }));
  }, []);

  const calculateTotal = useCallback((): number => {
    return formData.amount * formData.price;
  }, [formData.amount, formData.price]);

  const getSelectedCurrency = useCallback((): Currency | undefined => {
    if (!formData.currency) return undefined;
    const match = formData.currency.match(/\/(\d+)$/);
    return match ? currencies.find(c => c.id.toString() === match[1]) : undefined;
  }, [formData.currency, currencies]);

  const getSelectedBankDetails = useCallback((): UserBankDetail[] => {
    return userBankDetails.filter(bank =>
      formData.acceptedBankDetails.includes(bank.id)
    );
  }, [formData.acceptedBankDetails, userBankDetails]);

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

    // Validate min/max transaction amounts
    if (formData.minAmountPerTransaction && formData.maxAmountPerTransaction) {
      if (formData.minAmountPerTransaction > formData.maxAmountPerTransaction) {
        return 'Le montant minimum par transaction ne peut pas dépasser le maximum';
      }
      if (formData.minAmountPerTransaction > formData.amount) {
        return 'Le montant minimum par transaction ne peut pas dépasser le montant total';
      }
      if (formData.maxAmountPerTransaction < formData.minAmountPerTransaction) {
        return 'Le montant maximum par transaction ne peut pas être inférieur au minimum';
      }
    }

    return null;
  }, [formData, getSelectedCurrency]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const validationError = validateForm();
      if (validationError) throw new Error(validationError);

      const selectedCurrency = getSelectedCurrency();
      const selectedBanks = getSelectedBankDetails();

      const postData = {
        type: formData.type,
        amount: formData.amount.toString(),
        price: formData.price.toString(),
        currency: formData.currency,
        acceptedBankDetails: formData.acceptedBankDetails.map(id => `/api/user_bank_details/${id}`),
        minAmountPerTransaction: formData.minAmountPerTransaction?.toString() || null,
        maxAmountPerTransaction: formData.maxAmountPerTransaction?.toString() || null,
        timeLimitMinutes: formData.timeLimitMinutes,
        status: 'active',
        terms: formData.terms?.trim() || undefined,
        paymentMethod: `${selectedBanks.map(b => b.bankName).join(', ')}`
      };

      console.log('📤 Envoi création annonce:', postData);

      const response = await api.post('/ads', postData);
      console.log('✅ Annonce créée:', response.data);

      setSuccess(`✅ Annonce ${formData.type === 'buy' ? 'd\'achat' : 'de vente'} créée avec succès !`);
      
      setTimeout(() => {
        navigate('/dashboard/ads');
      }, 2000);

    } catch (err: any) {
      console.error('❌ Erreur création annonce:', err);
      if (err.response?.data?.violations) {
        const violations = err.response.data.violations;
        const errorMsg = violations.map((v: any) => `${v.propertyPath}: ${v.message}`).join(', ');
        setError(`Erreur validation: ${errorMsg}`);
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError(err.message || 'Erreur lors de la création');
      }
    } finally {
      setLoading(false);
    }
  };

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
        <div className="text-center text-warning py-4">
          <i className="bi bi-exclamation-triangle fs-4 mb-3 d-block"></i>
          <p className="mb-2 fw-semibold">Aucune information bancaire configurée</p>
          <p className="small text-muted mb-3">
            Vous devez configurer vos coordonnées bancaires avant de créer une annonce
          </p>
          <button
            type="button"
            className="btn btn-primary"
            onClick={() => navigate('/dashboard/bank-details')}
            disabled={loading}
          >
            <i className="bi bi-plus-circle me-2"></i>
            Gérer mes coordonnées bancaires
          </button>
        </div>
      );
    }

    return (
      <div className="row">
        {activeBanks.map(bank => (
          <div key={bank.id} className="col-md-6 mb-3">
            <div className={`form-check card p-3 ${formData.acceptedBankDetails.includes(bank.id) ? 'border-primary shadow-sm' : 'border-light'}`}>
              <input
                className="form-check-input"
                type="checkbox"
                id={`bank-${bank.id}`}
                checked={formData.acceptedBankDetails.includes(bank.id)}
                onChange={() => handleBankDetailToggle(bank.id)}
                disabled={loading}
              />
              <label className="form-check-label ms-2 w-100" htmlFor={`bank-${bank.id}`}>
                <div className="d-flex justify-content-between align-items-start">
                  <div>
                    <strong className="d-block">{bank.bankName}</strong>
                    <small className="text-muted d-block">
                      <i className="bi bi-person me-1"></i>
                      {bank.accountHolder}
                    </small>
                    <small className="text-muted d-block">
                      <i className="bi bi-credit-card me-1"></i>
                      {bank.maskedAccountNumber || '••••' + (bank.accountNumber?.slice(-4) || '')}
                    </small>
                    {bank.branchName && (
                      <small className="text-muted d-block">
                        <i className="bi bi-geo-alt me-1"></i>
                        {bank.branchName}
                      </small>
                    )}
                  </div>
                  <span className={`badge ${bank.isActive ? 'bg-success' : 'bg-secondary'}`}>
                    {bank.isActive ? '✓ Actif' : 'Inactif'}
                  </span>
                </div>
              </label>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const cryptoCurrencies = getCryptoCurrencies();
  const selectedCurrency = getSelectedCurrency();
  const selectedBankDetails = getSelectedBankDetails();
  const totalAmount = calculateTotal();
  const validationError = validateForm();
  const hasBankDetails = getActiveBankDetails().length > 0;
  const canSubmit = !validationError && !loading && !dataLoading && selectedCurrency && hasBankDetails;

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-8">
          {/* Header */}
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 mb-1 fw-bold">
                <i className="bi bi-plus-circle me-2"></i>
                Nouvelle Annonce P2P
              </h1>
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
              Annuler
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

          {/* Main Form */}
          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                {/* Section 1: Ad Type */}
                <div className="mb-5">
                  <h5 className="mb-3 fw-bold text-primary">
                    <i className="bi bi-tag me-2"></i>
                    1. Type d'Annonce
                  </h5>
                  <div className="row g-3">
                    <div className="col-md-6">
                      <button
                        type="button"
                        className={`btn w-100 h-100 py-4 ${formData.type === 'buy' 
                          ? 'btn-success border-3 shadow-sm' 
                          : 'btn-outline-success'}`}
                        onClick={() => setFormData(prev => ({ ...prev, type: 'buy' }))}
                        disabled={loading}
                      >
                        <i className="bi bi-arrow-down-circle fs-2 mb-2 d-block"></i>
                        <span className="fw-bold fs-5 d-block">ACHETER</span>
                        <small className="d-block mt-1 text-muted">
                          Je veux acheter de la crypto avec des MAD
                        </small>
                      </button>
                    </div>
                    <div className="col-md-6">
                      <button
                        type="button"
                        className={`btn w-100 h-100 py-4 ${formData.type === 'sell' 
                          ? 'btn-danger border-3 shadow-sm' 
                          : 'btn-outline-danger'}`}
                        onClick={() => setFormData(prev => ({ ...prev, type: 'sell' }))}
                        disabled={loading}
                      >
                        <i className="bi bi-arrow-up-circle fs-2 mb-2 d-block"></i>
                        <span className="fw-bold fs-5 d-block">VENDRE</span>
                        <small className="d-block mt-1 text-muted">
                          Je veux vendre ma crypto contre des MAD
                        </small>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Section 2: Exchange Details */}
                <div className="mb-5">
                  <h5 className="mb-3 fw-bold text-primary">
                    <i className="bi bi-currency-exchange me-2"></i>
                    2. Détails de l'Échange
                  </h5>
                  
                  {/* Cryptocurrency Selection */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-coin me-1"></i>
                      Crypto-monnaie *
                    </label>
                    <select
                      className={`form-select form-select-lg ${!formData.currency ? 'border-warning' : ''}`}
                      name="currency"
                      value={formData.currency}
                      onChange={handleInputChange}
                      required
                      disabled={dataLoading || loading}
                    >
                      <option value="">
                        {dataLoading ? 'Chargement des cryptos...' : '👉 Sélectionnez une crypto'}
                      </option>
                      {cryptoCurrencies.map(currency => (
                        <option key={currency.id} value={`/api/currencies/${currency.id}`}>
                          {currency.name} ({currency.code}) - {currency.type === 'crypto' ? 'Crypto' : 'Fiat'}
                        </option>
                      ))}
                    </select>
                    <div className="form-text">
                      {dataLoading ? 'Chargement...' : `${cryptoCurrencies.length} crypto(s) disponible(s)`}
                    </div>
                  </div>

                  {/* Amount and Price */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="bi bi-cash-stack me-1"></i>
                        {formData.type === 'buy' ? 'Montant à acheter *' : 'Montant à vendre *'}
                      </label>
                      <div className="input-group input-group-lg">
                        <input
                          type="number"
                          className="form-control"
                          name="amount"
                          value={formData.amount}
                          onChange={handleInputChange}
                          step="0.000001"
                          min={VALIDATION.MIN_AMOUNT}
                          max={VALIDATION.MAX_AMOUNT}
                          required
                          disabled={loading || !formData.currency}
                          placeholder="Ex: 1000"
                        />
                        <span className="input-group-text bg-light fw-semibold">
                          {selectedCurrency?.code || '...'}
                        </span>
                      </div>
                      <div className="form-text">
                        Minimum: {VALIDATION.MIN_AMOUNT} {selectedCurrency?.code || 'crypto'}
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="bi bi-tag me-1"></i>
                        Prix unitaire (MAD) *
                      </label>
                      <div className="input-group input-group-lg">
                        <input
                          type="number"
                          className="form-control"
                          name="price"
                          value={formData.price}
                          onChange={handleInputChange}
                          step="0.01"
                          min={VALIDATION.MIN_PRICE}
                          required
                          disabled={loading}
                          placeholder="Ex: 10.50"
                        />
                        <span className="input-group-text bg-light fw-semibold">MAD</span>
                      </div>
                      <div className="form-text">
                        Prix en dirhams marocains par {selectedCurrency?.code || 'crypto'}
                      </div>
                    </div>
                  </div>

                  {/* Transaction Limits (Optional) */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="bi bi-arrow-down me-1"></i>
                        Limite minimale par transaction
                        <span className="text-muted fw-normal"> (optionnel)</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          name="minAmountPerTransaction"
                          value={formData.minAmountPerTransaction || ''}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          disabled={loading || !formData.currency}
                          placeholder="Ex: 100"
                        />
                        <span className="input-group-text bg-light">{selectedCurrency?.code || '...'}</span>
                      </div>
                      <div className="form-text text-muted">
                        Montant minimum que l'autre partie doit échanger
                      </div>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-semibold">
                        <i className="bi bi-arrow-up me-1"></i>
                        Limite maximale par transaction
                        <span className="text-muted fw-normal"> (optionnel)</span>
                      </label>
                      <div className="input-group">
                        <input
                          type="number"
                          className="form-control"
                          name="maxAmountPerTransaction"
                          value={formData.maxAmountPerTransaction || ''}
                          onChange={handleInputChange}
                          step="0.01"
                          min="0"
                          disabled={loading || !formData.currency}
                          placeholder="Ex: 5000"
                        />
                        <span className="input-group-text bg-light">{selectedCurrency?.code || '...'}</span>
                      </div>
                      <div className="form-text text-muted">
                        Montant maximum que l'autre partie peut échanger
                      </div>
                    </div>
                  </div>

                  {/* Total Calculation */}
                  {formData.amount > 0 && formData.price > 0 && selectedCurrency && (
                    <div className="alert alert-primary shadow-sm">
                      <div className="row align-items-center">
                        <div className="col-md-8">
                          <strong className="d-block fs-6">
                            <i className="bi bi-calculator me-2"></i>
                            Montant total de la transaction :
                          </strong>
                          <small className="text-muted">
                            {formData.amount} {selectedCurrency.code} × {formData.price} MAD
                          </small>
                        </div>
                        <div className="col-md-4 text-end">
                          <span className="fs-3 fw-bold text-primary">
                            {totalAmount.toLocaleString('fr-MA', { 
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2 
                            })} MAD
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Section 3: Payment & Duration */}
                <div className="mb-5">
                  <h5 className="mb-3 fw-bold text-primary">
                    <i className="bi bi-credit-card-2-front me-2"></i>
                    3. Paiement & Durée
                  </h5>

                  {/* Bank Details */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-bank me-1"></i>
                      {formData.type === 'buy' 
                        ? 'Vos informations bancaires pour recevoir les MAD *'
                        : 'Vos informations bancaires pour recevoir les paiements *'
                      }
                    </label>
                    <div className="border rounded p-3 bg-light">
                      {renderBankDetails()}
                    </div>
                    {selectedBankDetails.length > 0 && (
                      <div className="mt-2 text-success small">
                        <i className="bi bi-check-circle me-1"></i>
                        {selectedBankDetails.length} banque(s) sélectionnée(s) : 
                        {selectedBankDetails.map(b => ` ${b.bankName}`).join(',')}
                      </div>
                    )}
                  </div>

                  {/* Ad Duration */}
                  <div className="mb-4">
                    <label className="form-label fw-semibold">
                      <i className="bi bi-clock me-1"></i>
                      Durée de validité
                    </label>
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
                      L'annonce sera automatiquement désactivée après cette durée
                    </div>
                  </div>

                  {/* Additional Terms */}
                  <div>
                    <label className="form-label fw-semibold">
                      <i className="bi bi-chat-left-text me-1"></i>
                      Conditions supplémentaires
                      <span className="text-muted fw-normal"> (optionnel)</span>
                    </label>
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
                      Précisez vos conditions, horaires, ou instructions particulières
                    </div>
                  </div>
                </div>

                {/* Submit Buttons */}
                <div className="d-flex justify-content-between align-items-center pt-4 border-top">
                  <div>
                    {validationError && (
                      <div className="text-danger small">
                        <i className="bi bi-exclamation-circle me-1"></i>
                        {validationError}
                      </div>
                    )}
                    {!validationError && selectedCurrency && hasBankDetails && (
                      <div className="text-success small">
                        <i className="bi bi-check-circle me-1"></i>
                        Formulaire valide - Prêt à publier
                      </div>
                    )}
                  </div>
                  <div className="d-flex gap-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-4"
                      onClick={() => navigate('/dashboard/ads')}
                      disabled={loading}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary px-4"
                      disabled={!canSubmit}
                    >
                      {loading ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Publication...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          {formData.type === 'buy' ? 'Publier la Demande' : 'Publier l\'Offre'}
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>

          {/* Important Information */}
          <div className="card mt-4 bg-light border-0">
            <div className="card-body">
              <h6 className="card-title fw-bold text-primary">
                <i className="bi bi-info-circle me-2"></i>
                Informations Importantes
              </h6>
              <div className="row">
                <div className="col-md-6">
                  <ul className="list-unstyled small mb-0">
                    <li className="mb-2">
                      <i className="bi bi-shield-check text-success me-2"></i>
                      Transactions sécurisées par système d'escrow
                    </li>
                    <li className="mb-2">
                      <i className="bi bi-clock text-primary me-2"></i>
                      Annonce expire automatiquement
                    </li>
                  </ul>
                </div>
                <div className="col-md-6">
                  <ul className="list-unstyled small mb-0">
                    <li className="mb-2">
                      <i className="bi bi-currency-exchange text-warning me-2"></i>
                      Prix fixes pour toute la durée
                    </li>
                    <li>
                      <i className="bi bi-exclamation-triangle text-danger me-2"></i>
                      Respectez les lois marocaines
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

export default AdCreate;