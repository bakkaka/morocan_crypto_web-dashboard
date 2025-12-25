// src/components/AdEditPage.tsx
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

interface AdEditData {
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  currency: string;
  minAmountPerTransaction?: number;
  maxAmountPerTransaction?: number;
  timeLimitMinutes: number;
  acceptedBankDetails: number[];
  terms?: string;
  status: 'active' | 'paused';
}

interface Currency {
  id: number;
  code: string;
  name: string;
  type: 'crypto' | 'fiat';
}

interface UserBankDetail {
  id: number;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  isActive: boolean;
}

const AdEditPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [currencies, setCurrencies] = useState<Currency[]>([]);
  const [bankDetails, setBankDetails] = useState<UserBankDetail[]>([]);
  const [adData, setAdData] = useState<AdEditData | null>(null);

  useEffect(() => {
    if (id) {
      loadData();
    }
  }, [id]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Charger l'annonce
      const adResponse = await api.get(`/ads/${id}`);
      const ad = adResponse.data;
      
      // Charger les devises
      const currenciesResponse = await api.get('/currencies');
      const currenciesData = extractHydraMember(currenciesResponse.data);
      
      // Charger les infos bancaires
      const bankResponse = await api.get('/user_bank_details');
      const bankData = extractHydraMember(bankResponse.data);
      
      setCurrencies(currenciesData);
      setBankDetails(bankData);
      
      // Préparer les données du formulaire
      setAdData({
        type: ad.type,
        amount: ad.amount,
        price: ad.price,
        currency: ad.currency?.['@id'] || '',
        minAmountPerTransaction: ad.minAmountPerTransaction,
        maxAmountPerTransaction: ad.maxAmountPerTransaction,
        timeLimitMinutes: ad.timeLimitMinutes || 60,
        acceptedBankDetails: ad.acceptedBankDetails?.map((b: any) => b.id) || [],
        terms: ad.terms || '',
        status: ad.status || 'active'
      });
      
    } catch (err: any) {
      console.error('Erreur chargement:', err);
      setError('Impossible de charger l\'annonce');
    } finally {
      setLoading(false);
    }
  };

  const extractHydraMember = (data: any): any[] => {
    if (data?.['hydra:member']) return data['hydra:member'];
    if (Array.isArray(data)) return data;
    return [];
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adData || !id) return;
    
    try {
      setSaving(true);
      setError(null);
      
      const payload = {
        ...adData,
        currency: adData.currency,
        acceptedBankDetails: adData.acceptedBankDetails.map(id => `/api/user_bank_details/${id}`)
      };
      
      await api.put(`/ads/${id}`, payload);
      
      setSuccess('Annonce mise à jour avec succès');
      setTimeout(() => navigate('/dashboard/ads'), 2000);
      
    } catch (err: any) {
      console.error('Erreur mise à jour:', err);
      setError(err.response?.data?.message || 'Erreur lors de la mise à jour');
    } finally {
      setSaving(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    
    if (!adData) return;
    
    setAdData(prev => ({
      ...prev!,
      [name]: type === 'number' ? parseFloat(value) : value
    }));
  };

  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3">Chargement de l'annonce...</p>
        </div>
      </div>
    );
  }

  if (!adData) {
    return (
      <div className="container py-5">
        <div className="alert alert-danger">
          <i className="bi bi-exclamation-triangle me-2"></i>
          Annonce non trouvée
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row justify-content-center">
        <div className="col-lg-10 col-xl-8">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <div>
              <h1 className="h2 mb-1 fw-bold">
                <i className="bi bi-pencil-square me-2"></i>
                Modifier l'annonce
              </h1>
              <p className="text-muted mb-0">ID: {id}</p>
            </div>
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => navigate('/dashboard/ads')}
              disabled={saving}
            >
              <i className="bi bi-arrow-left me-2"></i>
              Annuler
            </button>
          </div>

          {error && (
            <div className="alert alert-danger alert-dismissible fade show" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {error}
              <button type="button" className="btn-close" onClick={() => setError(null)}></button>
            </div>
          )}

          {success && (
            <div className="alert alert-success alert-dismissible fade show" role="alert">
              <i className="bi bi-check-circle me-2"></i>
              {success}
            </div>
          )}

          <div className="card shadow-sm border-0">
            <div className="card-body p-4">
              <form onSubmit={handleSubmit}>
                {/* Votre formulaire d'édition ici */}
                <div className="d-flex justify-content-between pt-4 border-top">
                  <div>
                    <button
                      type="button"
                      className="btn btn-outline-danger"
                      onClick={async () => {
                        if (window.confirm('Supprimer cette annonce?')) {
                          try {
                            await api.delete(`/ads/${id}`);
                            navigate('/dashboard/ads');
                          } catch (err) {
                            setError('Erreur suppression');
                          }
                        }
                      }}
                    >
                      <i className="bi bi-trash me-2"></i>
                      Supprimer
                    </button>
                  </div>
                  <div className="d-flex gap-3">
                    <button
                      type="button"
                      className="btn btn-outline-secondary px-4"
                      onClick={() => navigate('/dashboard/ads')}
                      disabled={saving}
                    >
                      Annuler
                    </button>
                    <button
                      type="submit"
                      className="btn btn-primary px-4"
                      disabled={saving}
                    >
                      {saving ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2"></span>
                          Enregistrement...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-check-circle me-2"></i>
                          Enregistrer
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdEditPage;