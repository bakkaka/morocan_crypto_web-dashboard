// src/components/UserBankDetails.tsx
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

interface UserBankDetail {
  id: number;
  '@id'?: string;
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  maskedAccountNumber?: string;
  swiftCode?: string;
  branchName?: string;
  accountType?: string;
  isActive: boolean;
  createdAt: string;
  updatedAt?: string;
  adsUsingThisDetail?: any[];
  user?: {
    id: number;
    email: string;
    fullName: string;
  };
}

interface UserBankDetailsProps {
  adminView?: boolean;
}

const BANKS_MAROC = [
  'CIH',
  'Attijariwafabank', 
  'Saham Bank',
  'BMCE',
  'BMCI',
  'Crédit du Maroc',
  'Banque Populaire'
];

const ACCOUNT_TYPES = [
  { value: 'current', label: 'Compte Courant' },
  { value: 'savings', label: 'Compte Épargne' },
  { value: 'professional', label: 'Compte Professionnel' }
];

const UserBankDetails: React.FC<UserBankDetailsProps> = ({ adminView = false }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<UserBankDetail[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const [formData, setFormData] = useState({
    bankName: 'CIH',
    accountHolder: '',
    accountNumber: '',
    branchName: '',
    swiftCode: '',
    accountType: 'current',
    isActive: true
  });

  const [editFormData, setEditFormData] = useState({
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    branchName: '',
    swiftCode: '',
    accountType: 'current',
    isActive: true
  });

  const extractHydraMember = useCallback((data: any): any[] => {
    if (data?.member && Array.isArray(data.member)) return data.member;
    if (data?.['hydra:member'] && Array.isArray(data['hydra:member'])) return data['hydra:member'];
    if (Array.isArray(data)) return data;
    return [];
  }, []);

  const loadBankDetails = useCallback(async () => {
    try {
      setDataLoading(true);
      setError(null);
      
      const endpoint = adminView ? '/user_bank_details' : '/user_bank_details';
      const response = await api.get(endpoint);
      const data = extractHydraMember(response.data);
      
      console.log('📥 Données bancaires chargées:', data);
      setBankDetails(data);
    } catch (err: any) {
      console.error('❌ Erreur chargement coordonnées:', err);
      setError('Impossible de charger les coordonnées bancaires');
    } finally {
      setDataLoading(false);
    }
  }, [adminView, extractHydraMember]);

  useEffect(() => {
    if (user) {
      loadBankDetails();
    } else {
      navigate('/login');
    }
  }, [user, navigate, loadBankDetails]);

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
    
    if (error) setError(null);
    if (success) setSuccess(null);
  };

  const handleEditInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
  ) => {
    const { name, value, type } = e.target;
    
    setEditFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      // Validation
      if (!formData.bankName.trim()) throw new Error('Le nom de la banque est requis');
      if (!formData.accountHolder.trim()) throw new Error('Le titulaire du compte est requis');
      if (!formData.accountNumber.trim()) throw new Error('Le numéro de compte est requis');
      
      if (formData.accountNumber.length < 10 || formData.accountNumber.length > 50) {
        throw new Error('Le numéro de compte doit contenir entre 10 et 50 caractères');
      }

      // Vérifier que l'utilisateur est connecté
      if (!user || !user.id) {
        throw new Error('Vous devez être connecté pour ajouter des coordonnées bancaires');
      }

      const postData = {
        bankName: formData.bankName,
        accountHolder: formData.accountHolder,
        accountNumber: formData.accountNumber,
        branchName: formData.branchName.trim() || null,
        swiftCode: formData.swiftCode.trim() || null,
        accountType: formData.accountType,
        isActive: formData.isActive,
        // ⬇️ LIGNE CRITIQUE : Associer l'utilisateur connecté
        user: `/api/users/${user.id}`
      };

      console.log('📤 Envoi création coordonnées:', postData);

      const response = await api.post('/user_bank_details', postData);
      console.log('✅ Coordonnées créées:', response.data);

      setSuccess('✅ Coordonnées bancaires ajoutées avec succès !');
      
      // Reset form
      setFormData({
        bankName: 'CIH',
        accountHolder: '',
        accountNumber: '',
        branchName: '',
        swiftCode: '',
        accountType: 'current',
        isActive: true
      });

      // Reload list
      loadBankDetails();

    } catch (err: any) {
      console.error('❌ Erreur création coordonnées:', err);
      if (err.response?.data?.violations) {
        const violations = err.response.data.violations;
        const errorMsg = violations.map((v: any) => `${v.propertyPath}: ${v.message}`).join(', ');
        setError(`Erreur validation: ${errorMsg}`);
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data?.title) {
        setError(err.response.data.title);
      } else if (err.message.includes('connecté')) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError(err.message || 'Erreur lors de la création');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bank: UserBankDetail) => {
    setEditingId(bank.id);
    setEditFormData({
      bankName: bank.bankName,
      accountHolder: bank.accountHolder,
      accountNumber: bank.accountNumber,
      branchName: bank.branchName || '',
      swiftCode: bank.swiftCode || '',
      accountType: bank.accountType || 'current',
      isActive: bank.isActive
    });
  };

  const handleUpdate = async () => {
    if (editingId === null) return;

    try {
      setLoading(true);
      setError(null);
      
      const updateData = {
        bankName: editFormData.bankName,
        accountHolder: editFormData.accountHolder,
        accountNumber: editFormData.accountNumber,
        branchName: editFormData.branchName.trim() || null,
        swiftCode: editFormData.swiftCode.trim() || null,
        accountType: editFormData.accountType,
        isActive: editFormData.isActive
      };

      const response = await api.put(`/user_bank_details/${editingId}`, updateData);
      console.log('✅ Coordonnées mises à jour:', response.data);

      setSuccess('✅ Coordonnées bancaires mises à jour avec succès !');
      setEditingId(null);
      loadBankDetails();
      
    } catch (err: any) {
      console.error('❌ Erreur mise à jour:', err);
      if (err.response?.data?.violations) {
        const violations = err.response.data.violations;
        const errorMsg = violations.map((v: any) => `${v.propertyPath}: ${v.message}`).join(', ');
        setError(`Erreur validation: ${errorMsg}`);
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else {
        setError('Erreur lors de la mise à jour');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async (id: number, currentStatus: boolean) => {
    try {
      setLoading(true);
      setError(null);
      
      await api.patch(`/user_bank_details/${id}`, {
        isActive: !currentStatus
      });
      
      setSuccess(`✅ Coordonnées ${!currentStatus ? 'activées' : 'désactivées'} avec succès`);
      loadBankDetails();
      
    } catch (err: any) {
      console.error('❌ Erreur modification:', err);
      setError('Erreur lors de la modification');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ces coordonnées bancaires ?')) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      await api.delete(`/user_bank_details/${id}`);
      
      setSuccess('✅ Coordonnées bancaires supprimées avec succès');
      loadBankDetails();
      
    } catch (err: any) {
      console.error('❌ Erreur suppression:', err);
      setError('Erreur lors de la suppression');
    } finally {
      setLoading(false);
    }
  };

  const maskAccountNumber = (accountNumber: string): string => {
    if (!accountNumber || accountNumber.length <= 4) return '••••';
    return '••••' + accountNumber.slice(-4);
  };

  const formatDate = (dateString: string): string => {
    try {
      return new Date(dateString).toLocaleDateString('fr-MA', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="container-fluid py-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2 className="mb-0">
          <i className="bi bi-bank me-2"></i>
          {adminView ? 'Gestion des Coordonnées Bancaires' : 'Mes Coordonnées Bancaires'}
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

      <div className="row">
        {/* Left Column: Add New Bank Details */}
        <div className="col-lg-5 mb-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-primary text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                Ajouter de Nouvelles Coordonnées
              </h5>
            </div>
            <div className="card-body">
              <form onSubmit={handleSubmit}>
                <div className="mb-3">
                  <label className="form-label fw-semibold">Banque *</label>
                  <select
                    className="form-select"
                    name="bankName"
                    value={formData.bankName}
                    onChange={handleInputChange}
                    required
                    disabled={loading}
                  >
                    {BANKS_MAROC.map(bank => (
                      <option key={bank} value={bank}>{bank}</option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Titulaire du Compte *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="accountHolder"
                    value={formData.accountHolder}
                    onChange={handleInputChange}
                    placeholder="Nom et prénom du titulaire"
                    required
                    disabled={loading}
                    maxLength={100}
                  />
                  <div className="form-text">2 à 100 caractères</div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Numéro de Compte *</label>
                  <input
                    type="text"
                    className="form-control"
                    name="accountNumber"
                    value={formData.accountNumber}
                    onChange={handleInputChange}
                    placeholder="RIB (24 chiffres) ou CCP (10 chiffres)"
                    required
                    disabled={loading}
                    minLength={10}
                    maxLength={50}
                  />
                  <div className="form-text">10 à 50 caractères</div>
                </div>

                <div className="row g-3 mb-3">
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">Type de Compte</label>
                    <select
                      className="form-select"
                      name="accountType"
                      value={formData.accountType}
                      onChange={handleInputChange}
                      disabled={loading}
                    >
                      {ACCOUNT_TYPES.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label fw-semibold">SWIFT/BIC</label>
                    <input
                      type="text"
                      className="form-control"
                      name="swiftCode"
                      value={formData.swiftCode}
                      onChange={handleInputChange}
                      placeholder="Ex: BCMAMAMC"
                      disabled={loading}
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-semibold">Nom de l'Agence</label>
                  <input
                    type="text"
                    className="form-control"
                    name="branchName"
                    value={formData.branchName}
                    onChange={handleInputChange}
                    placeholder="Nom de l'agence bancaire"
                    disabled={loading}
                    maxLength={100}
                  />
                </div>

                <div className="mb-4 form-check form-switch">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    role="switch"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleInputChange}
                    disabled={loading}
                  />
                  <label className="form-check-label" htmlFor="isActive">
                    Activer immédiatement ces coordonnées
                  </label>
                </div>

                <button
                  type="submit"
                  className="btn btn-primary w-100"
                  disabled={loading || !user}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2"></span>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-save me-2"></i>
                      Enregistrer les Coordonnées
                    </>
                  )}
                </button>
                
                {!user && (
                  <div className="alert alert-warning mt-3 mb-0">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    Vous devez être connecté pour ajouter des coordonnées bancaires
                  </div>
                )}
              </form>
            </div>
          </div>
        </div>

        {/* Right Column: List of Bank Details */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="bi bi-list-ul me-2"></i>
                {adminView ? 'Toutes les Coordonnées Bancaires' : 'Mes Coordonnées Enregistrées'}
              </h5>
              <span className="badge bg-primary">
                {bankDetails.length} enregistrement(s)
              </span>
            </div>
            <div className="card-body p-0">
              {dataLoading ? (
                <div className="text-center py-5">
                  <div className="spinner-border text-primary" role="status">
                    <span className="visually-hidden">Chargement...</span>
                  </div>
                  <p className="mt-3 text-muted">Chargement des coordonnées...</p>
                </div>
              ) : bankDetails.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-bank fs-1 text-muted mb-3"></i>
                  <p className="text-muted mb-3">
                    {adminView 
                      ? 'Aucune coordonnée bancaire enregistrée dans le système'
                      : 'Aucune coordonnée bancaire enregistrée'
                    }
                  </p>
                  <p className="small text-muted">
                    {!adminView && 'Ajoutez vos coordonnées bancaires pour pouvoir créer des annonces'}
                  </p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th>Banque</th>
                        <th>Titulaire</th>
                        <th>Numéro de Compte</th>
                        <th>Type</th>
                        <th>Statut</th>
                        <th className="text-end">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bankDetails.map(bank => (
                        <React.Fragment key={bank.id}>
                          <tr className={bank.isActive ? 'table-success' : ''}>
                            <td>
                              <strong>{bank.bankName}</strong>
                              {bank.branchName && (
                                <div className="small text-muted">{bank.branchName}</div>
                              )}
                            </td>
                            <td>{bank.accountHolder}</td>
                            <td>
                              <code className="user-select-all">
                                {maskAccountNumber(bank.accountNumber)}
                              </code>
                              {bank.swiftCode && (
                                <div className="small text-muted">SWIFT: {bank.swiftCode}</div>
                              )}
                            </td>
                            <td>
                              <span className="badge bg-info">
                                {ACCOUNT_TYPES.find(t => t.value === bank.accountType)?.label || bank.accountType}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${bank.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                {bank.isActive ? '✓ Actif' : 'Inactif'}
                              </span>
                              <div className="small text-muted">
                                Créé le {formatDate(bank.createdAt)}
                              </div>
                            </td>
                            <td className="text-end">
                              <div className="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  className="btn btn-outline-primary"
                                  onClick={() => handleEdit(bank)}
                                  disabled={loading || editingId !== null}
                                  title="Modifier"
                                >
                                  <i className="bi bi-pencil"></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-warning"
                                  onClick={() => handleToggleActive(bank.id, bank.isActive)}
                                  disabled={loading}
                                  title={bank.isActive ? 'Désactiver' : 'Activer'}
                                >
                                  <i className={`bi bi-${bank.isActive ? 'pause' : 'play'}`}></i>
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-outline-danger"
                                  onClick={() => handleDelete(bank.id)}
                                  disabled={loading}
                                  title="Supprimer"
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>
                            </td>
                          </tr>
                          {editingId === bank.id && (
                            <tr className="bg-light">
                              <td colSpan={6}>
                                <div className="p-3">
                                  <h6 className="mb-3">
                                    <i className="bi bi-pencil-square me-2"></i>
                                    Modification des coordonnées
                                  </h6>
                                  <div className="row g-3">
                                    <div className="col-md-6">
                                      <label className="form-label">Banque</label>
                                      <select
                                        className="form-select"
                                        name="bankName"
                                        value={editFormData.bankName}
                                        onChange={handleEditInputChange}
                                      >
                                        {BANKS_MAROC.map(bank => (
                                          <option key={bank} value={bank}>{bank}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="col-md-6">
                                      <label className="form-label">Titulaire</label>
                                      <input
                                        type="text"
                                        className="form-control"
                                        name="accountHolder"
                                        value={editFormData.accountHolder}
                                        onChange={handleEditInputChange}
                                      />
                                    </div>
                                    <div className="col-md-6">
                                      <label className="form-label">Numéro de Compte</label>
                                      <input
                                        type="text"
                                        className="form-control"
                                        name="accountNumber"
                                        value={editFormData.accountNumber}
                                        onChange={handleEditInputChange}
                                      />
                                    </div>
                                    <div className="col-md-6">
                                      <label className="form-label">Type de Compte</label>
                                      <select
                                        className="form-select"
                                        name="accountType"
                                        value={editFormData.accountType}
                                        onChange={handleEditInputChange}
                                      >
                                        {ACCOUNT_TYPES.map(type => (
                                          <option key={type.value} value={type.value}>
                                            {type.label}
                                          </option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="col-md-6">
                                      <div className="form-check form-switch">
                                        <input
                                          className="form-check-input"
                                          type="checkbox"
                                          role="switch"
                                          id={`editActive-${bank.id}`}
                                          name="isActive"
                                          checked={editFormData.isActive}
                                          onChange={handleEditInputChange}
                                        />
                                        <label className="form-check-label" htmlFor={`editActive-${bank.id}`}>
                                          Actif
                                        </label>
                                      </div>
                                    </div>
                                    <div className="col-md-12">
                                      <div className="d-flex gap-2 justify-content-end">
                                        <button
                                          type="button"
                                          className="btn btn-secondary"
                                          onClick={() => setEditingId(null)}
                                          disabled={loading}
                                        >
                                          Annuler
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-primary"
                                          onClick={handleUpdate}
                                          disabled={loading}
                                        >
                                          {loading ? (
                                            <span className="spinner-border spinner-border-sm me-2"></span>
                                          ) : (
                                            <i className="bi bi-check-circle me-2"></i>
                                          )}
                                          Mettre à jour
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
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
                    Informations Importantes
                  </h6>
                  <ul className="small mb-0">
                    <li>Les numéros de compte sont masqués pour votre sécurité</li>
                    <li>Seuls les 4 derniers chiffres sont visibles</li>
                    <li>Les coordonnées actives seront utilisées dans vos annonces</li>
                    <li>Vous pouvez désactiver temporairement vos coordonnées</li>
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

export default UserBankDetails;