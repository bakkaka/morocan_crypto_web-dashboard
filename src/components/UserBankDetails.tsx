// src/components/UserBankDetails.tsx - VERSION COMPLÈTE OPTIMISÉE
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

// ==============================
// TYPES
// ==============================

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

interface BankFormData {
  bankName: string;
  accountHolder: string;
  accountNumber: string;
  branchName: string;
  swiftCode: string;
  accountType: string;
  isActive: boolean;
}

// ==============================
// UTILITY FUNCTIONS
// ==============================

const isValidUserId = (id: any): boolean => {
  // Vérifie si l'ID est valide (accepte 0 comme ID valide)
  return id !== undefined && id !== null && !isNaN(Number(id));
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

const validateBankForm = (formData: BankFormData): string | null => {
  if (!formData.bankName.trim()) return 'Le nom de la banque est requis';
  if (!formData.accountHolder.trim()) return 'Le titulaire du compte est requis';
  if (!formData.accountNumber.trim()) return 'Le numéro de compte est requis';
  
  if (formData.accountNumber.length < 10 || formData.accountNumber.length > 50) {
    return 'Le numéro de compte doit contenir entre 10 et 50 caractères';
  }
  
  return null;
};

// ==============================
// CONSTANTS
// ==============================

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

// ==============================
// COMPONENT
// ==============================

const UserBankDetails: React.FC<UserBankDetailsProps> = ({ adminView = false }) => {
  // ==============================
  // HOOKS & STATE
  // ==============================
  const navigate = useNavigate();
  const { user, isAuthenticated, refreshUser } = useAuth();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<UserBankDetail[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  
  const initialFormData: BankFormData = {
    bankName: 'CIH',
    accountHolder: '',
    accountNumber: '',
    branchName: '',
    swiftCode: '',
    accountType: 'current',
    isActive: true
  };
  
  const [formData, setFormData] = useState<BankFormData>(initialFormData);
  const [editFormData, setEditFormData] = useState<BankFormData>(initialFormData);

  // ==============================
  // DEBUG & LOGS
  // ==============================
  
  useEffect(() => {
    console.log('🔍 UserBankDetails - État auth:', {
      user: user ? { id: user.id, email: user.email } : null,
      isAuthenticated,
      localStorageUser: localStorage.getItem('user'),
      localStorageToken: localStorage.getItem('jwt_token') ? 'PRÉSENT' : 'ABSENT'
    });
  }, [user, isAuthenticated]);

  // ==============================
  // DATA HANDLING
  // ==============================

  const extractHydraMember = useCallback((data: any): any[] => {
    if (data?.member && Array.isArray(data.member)) return data.member;
    if (data?.['hydra:member'] && Array.isArray(data['hydra:member'])) return data['hydra:member'];
    if (Array.isArray(data)) return data;
    return [];
  }, []);

  const loadBankDetails = useCallback(async (forceRefresh: boolean = false) => {
    try {
      setDataLoading(true);
      setError(null);
      
      console.log('📥 Chargement des coordonnées bancaires...');
      
      // Vérification ESSENTIELLE: le bon token
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        console.error('❌ Aucun token trouvé dans localStorage');
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
      
      console.log('✅ Token présent:', token.substring(0, 20) + '...');
      
      // Rafraîchir l'utilisateur si nécessaire
      if (forceRefresh && user) {
        console.log('🔄 Rafraîchissement utilisateur demandé...');
        try {
          await refreshUser();
          console.log('✅ Utilisateur rafraîchi');
        } catch (refreshError) {
          console.warn('⚠️ Erreur rafraîchissement utilisateur:', refreshError);
        }
      }
      
      const endpoint = adminView ? '/user_bank_details' : '/user_bank_details';
      console.log(`🌐 Appel API: ${endpoint}`);
      
      const response = await api.get(endpoint);
      const data = extractHydraMember(response.data);
      
      console.log('✅ Données bancaires chargées:', data.length, 'enregistrements');
      setBankDetails(data);
      
    } catch (err: any) {
      console.error('❌ Erreur chargement coordonnées:', err);
      
      if (err.response?.status === 401) {
        console.error('🔐 Erreur 401 - Token invalide ou expiré');
        setError('Session expirée. Redirection vers la page de connexion...');
        
        // Nettoyer le localStorage
        localStorage.removeItem('jwt_token');
        localStorage.removeItem('user');
        
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 403) {
        setError('Accès interdit. Vous n\'avez pas les permissions nécessaires.');
      } else if (err.code === 'ERR_NETWORK') {
        setError('Erreur réseau. Vérifiez votre connexion internet.');
      } else {
        setError(`Impossible de charger les coordonnées bancaires: ${err.message || 'Erreur inconnue'}`);
      }
    } finally {
      setDataLoading(false);
    }
  }, [adminView, extractHydraMember, navigate, refreshUser, user]);

  // ==============================
  // AUTHENTICATION CHECK - OPTIMISÉ
  // ==============================

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      console.log('🔐 UserBankDetails - Vérification authentification...');
      
      // Vérification multi-niveaux
      const token = localStorage.getItem('jwt_token');
      const userStr = localStorage.getItem('user');
      
      console.log('📊 État de vérification:', {
        tokenPresent: !!token,
        userStrPresent: !!userStr,
        isAuthenticated,
        user: user?.email,
        userId: user?.id,
        isValidId: isValidUserId(user?.id)
      });
      
      // Si AuthContext dit authentifié ET on a un user valide → OK
      if (isAuthenticated && user && isValidUserId(user.id)) {
        console.log('✅ Authentifié via AuthContext, user:', user.email, 'ID:', user.id);
        await loadBankDetails();
        return;
      }
      
      // Si AuthContext dit non authentifié MAIS on a un token dans localStorage
      if (!isAuthenticated && token && userStr) {
        console.log('⚠️ Incohérence: token présent mais AuthContext pas synchronisé');
        console.log('🔄 Tentative de rafraîchissement de l\'authentification...');
        
        try {
          // Essayer de rafraîchir l'utilisateur
          await refreshUser();
          
          // Vérifier à nouveau après rafraîchissement
          if (isAuthenticated && user && isValidUserId(user.id)) {
            console.log('✅ Synchronisation réussie après refreshUser');
            await loadBankDetails();
            return;
          }
        } catch (refreshError) {
          console.error('❌ Échec rafraîchissement:', refreshError);
        }
      }
      
      // Si vraiment non authentifié
      if (!token || !userStr) {
        console.log('🔒 Non authentifié - Pas de token ou user dans localStorage');
        console.log('📍 Redirection vers /login');
        navigate('/login');
        return;
      }
      
      // Dernier recours: essayer de charger quand même
      console.log('⚠️ État indéterminé, tentative de chargement...');
      await loadBankDetails();
    };
    
    checkAuthAndLoad();
  }, [isAuthenticated, user, navigate, loadBankDetails, refreshUser]);

  // ==============================
  // FORM HANDLERS
  // ==============================

  const createInputHandler = (setter: React.Dispatch<React.SetStateAction<BankFormData>>) => 
    (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
      const { name, value, type } = e.target;
      
      setter(prev => ({
        ...prev,
        [name]: type === 'checkbox' ? (e.target as HTMLInputElement).checked : value
      }));
      
      // Clear messages on user input
      if (error) setError(null);
      if (success) setSuccess(null);
    };

  const handleInputChange = createInputHandler(setFormData);
  const handleEditInputChange = createInputHandler(setEditFormData);

  // ==============================
  // CRUD OPERATIONS
  // ==============================

  const getEffectiveUser = useCallback((): { id: number; email: string } | null => {
    console.log('👤 Recherche utilisateur effectif...');
    
    // Logs détaillés pour debug
    console.log('📊 État user AuthContext:', {
      userExists: !!user,
      userId: user?.id,
      userEmail: user?.email,
      isValidId: isValidUserId(user?.id)
    });
    
    // Priorité 1: Utilisateur du contexte Auth (ACCEPTE id: 0)
    if (user && isValidUserId(user.id)) {
      console.log('✅ Utilisateur trouvé dans AuthContext:', user.email, 'ID:', user.id);
      return { id: user.id, email: user.email || '' };
    }
    
    // Priorité 2: Utilisateur du localStorage (ACCEPTE id: 0)
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        console.log('📊 État user localStorage:', {
          parsed: !!parsedUser,
          id: parsedUser?.id,
          isValidId: isValidUserId(parsedUser?.id)
        });
        
        if (parsedUser && isValidUserId(parsedUser.id)) {
          console.log('✅ Utilisateur trouvé dans localStorage:', parsedUser.email, 'ID:', parsedUser.id);
          return { id: parsedUser.id, email: parsedUser.email || '' };
        }
      } catch (e) {
        console.error('❌ Erreur parsing stored user:', e);
      }
    }
    
    console.warn('⚠️ Aucun utilisateur effectif trouvé');
    console.log('📊 Détails:', { 
      user, 
      storedUser,
      authUserId: user?.id,
      authUserValid: isValidUserId(user?.id)
    });
    return null;
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    try {
      console.log('📝 Début création coordonnées bancaires...');
      
      // Validation
      const validationError = validateBankForm(formData);
      if (validationError) throw new Error(validationError);

      // Vérification utilisateur
      const effectiveUser = getEffectiveUser();
      console.log('👤 Utilisateur effectif trouvé:', effectiveUser);
      
      if (!effectiveUser) {
        console.error('❌ Aucun utilisateur effectif');
        console.log('🔍 Détails AuthContext:', { user, isAuthenticated });
        console.log('🔍 Détails localStorage:', {
          token: localStorage.getItem('jwt_token') ? 'PRÉSENT' : 'ABSENT',
          user: localStorage.getItem('user')
        });
        throw new Error('Session invalide. Veuillez vous reconnecter.');
      }

      // Vérifier le token
      const token = localStorage.getItem('jwt_token');
      if (!token) {
        throw new Error('Token manquant. Veuillez vous reconnecter.');
      }

      // Préparation des données
      const postData = {
        bankName: formData.bankName,
        accountHolder: formData.accountHolder,
        accountNumber: formData.accountNumber,
        branchName: formData.branchName.trim() || null,
        swiftCode: formData.swiftCode.trim() || null,
        accountType: formData.accountType,
        isActive: formData.isActive,
        user: `/api/users/${effectiveUser.id}`
      };

      console.log('📤 Envoi création coordonnées:', {
        ...postData,
        userId: effectiveUser.id,
        userEmail: effectiveUser.email
      });

      // Envoi avec gestion d'erreur améliorée
      const response = await api.post('/user_bank_details', postData);
      console.log('✅ Coordonnées créées:', response.data);

      setSuccess('✅ Coordonnées bancaires ajoutées avec succès !');
      
      // Reset form
      setFormData(initialFormData);

      // Recharger la liste
      await loadBankDetails(true);

    } catch (err: any) {
      console.error('❌ Erreur création coordonnées:', err);
      
      // Gestion d'erreur détaillée
      if (err.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.status === 403) {
        setError('Permission refusée. Vous ne pouvez pas ajouter ces coordonnées.');
      } else if (err.response?.data?.violations) {
        const violations = err.response.data.violations;
        const errorMsg = violations.map((v: any) => `${v.propertyPath}: ${v.message}`).join(', ');
        setError(`Erreur validation: ${errorMsg}`);
      } else if (err.response?.data?.detail) {
        setError(err.response.data.detail);
      } else if (err.response?.data?.title) {
        setError(err.response.data.title);
      } else if (err.message) {
        setError(err.message);
      } else {
        setError('Erreur lors de la création des coordonnées bancaires');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (bank: UserBankDetail) => {
    console.log('✏️ Début édition coordonnées:', bank.id);
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

    console.log('🔄 Début mise à jour coordonnées:', editingId);

    try {
      setLoading(true);
      setError(null);
      
      const validationError = validateBankForm(editFormData);
      if (validationError) throw new Error(validationError);

      const updateData = {
        bankName: editFormData.bankName,
        accountHolder: editFormData.accountHolder,
        accountNumber: editFormData.accountNumber,
        branchName: editFormData.branchName.trim() || null,
        swiftCode: editFormData.swiftCode.trim() || null,
        accountType: editFormData.accountType,
        isActive: editFormData.isActive
      };

      console.log('📤 Envoi mise à jour:', { id: editingId, ...updateData });

      const response = await api.put(`/user_bank_details/${editingId}`, updateData);
      console.log('✅ Coordonnées mises à jour:', response.data);

      setSuccess('✅ Coordonnées bancaires mises à jour avec succès !');
      setEditingId(null);
      await loadBankDetails();
      
    } catch (err: any) {
      console.error('❌ Erreur mise à jour:', err);
      
      if (err.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/login'), 2000);
      } else if (err.response?.data?.violations) {
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
    console.log(`🔘 Changement statut coordonnées ${id}: ${currentStatus ? 'actif→inactif' : 'inactif→actif'}`);

    try {
      setLoading(true);
      setError(null);
      
      await api.patch(`/user_bank_details/${id}`, {
        isActive: !currentStatus
      });
      
      setSuccess(`✅ Coordonnées ${!currentStatus ? 'activées' : 'désactivées'} avec succès`);
      await loadBankDetails();
      
    } catch (err: any) {
      console.error('❌ Erreur modification:', err);
      
      if (err.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError('Erreur lors de la modification');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer ces coordonnées bancaires ?')) {
      return;
    }

    console.log('🗑️ Suppression coordonnées:', id);

    try {
      setLoading(true);
      setError(null);
      
      await api.delete(`/user_bank_details/${id}`);
      
      setSuccess('✅ Coordonnées bancaires supprimées avec succès');
      await loadBankDetails();
      
    } catch (err: any) {
      console.error('❌ Erreur suppression:', err);
      
      if (err.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/login'), 2000);
      } else {
        setError('Erreur lors de la suppression');
      }
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // UI HELPERS
  // ==============================

  const getAccountTypeLabel = (type: string | undefined): string => {
    return ACCOUNT_TYPES.find(t => t.value === type)?.label || type || 'Non spécifié';
  };

  const canSubmit = useMemo(() => {
    const can = isAuthenticated && user && isValidUserId(user.id) && !loading;
    console.log('🔍 canSubmit calculé:', { 
      can, 
      isAuthenticated, 
      user: !!user, 
      validId: user ? isValidUserId(user.id) : false,
      loading 
    });
    return can;
  }, [isAuthenticated, user, loading]);

  // ==============================
  // RENDER
  // ==============================

  return (
    <div className="container-fluid py-4">
      {/* Header */}
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
          <button type="button" className="btn-close" onClick={() => setSuccess(null)}></button>
        </div>
      )}

      <div className="row">
        {/* Add New Bank Details Form */}
        <div className="col-lg-5 mb-4">
          <div className="card shadow-sm border-0 h-100">
            <div className="card-header bg-primary text-white">
              <h5 className="card-title mb-0">
                <i className="bi bi-plus-circle me-2"></i>
                Ajouter de Nouvelles Coordonnées
              </h5>
            </div>
            <div className="card-body">
              {!canSubmit ? (
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  <strong>Attention :</strong> {!isAuthenticated ? 'Vous devez être connecté' : !user ? 'Session invalide' : !isValidUserId(user.id) ? 'ID utilisateur invalide' : 'Veuillez patienter...'}
                  {!isAuthenticated && (
                    <div className="mt-2">
                      <button 
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => navigate('/login')}
                      >
                        Se connecter
                      </button>
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleSubmit}>
                  {/* Bank Name */}
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

                  {/* Account Holder */}
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

                  {/* Account Number */}
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

                  {/* Account Type & SWIFT */}
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

                  {/* Branch Name */}
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

                  {/* Active Switch */}
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

                  {/* Submit Button */}
                  <button
                    type="submit"
                    className="btn btn-primary w-100"
                    disabled={loading || !canSubmit}
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
                </form>
              )}
            </div>
          </div>
        </div>

        {/* Bank Details List */}
        <div className="col-lg-7">
          <div className="card shadow-sm border-0">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="bi bi-list-ul me-2"></i>
                {adminView ? 'Toutes les Coordonnées Bancaires' : 'Mes Coordonnées Enregistrées'}
              </h5>
              <div>
                <button
                  type="button"
                  className="btn btn-sm btn-outline-secondary me-2"
                  onClick={() => loadBankDetails(true)}
                  disabled={dataLoading}
                  title="Rafraîchir"
                >
                  <i className={`bi bi-arrow-clockwise ${dataLoading ? 'spin' : ''}`}></i>
                </button>
                <span className="badge bg-primary">
                  {bankDetails.length} enregistrement(s)
                </span>
              </div>
            </div>
            <div className="card-body p-0">
              {/* Loading State */}
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
                                {getAccountTypeLabel(bank.accountType)}
                              </span>
                            </td>
                            <td>
                              <span className={`badge ${bank.isActive ? 'bg-success' : 'bg-secondary'}`}>
                                {bank.isActive ? '✓ Actif' : 'Inactif'}
                              </span>
                              <div className="small text-muted">
                                Créé le {formatDate(bank.createdAt)}
                              </div>
                              {adminView && bank.user && (
                                <div className="small">
                                  <i className="bi bi-person me-1"></i>
                                  {bank.user.fullName || bank.user.email}
                                </div>
                              )}
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
                          
                          {/* Edit Form Row */}
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
                                      <label className="form-label">Banque *</label>
                                      <select
                                        className="form-select"
                                        name="bankName"
                                        value={editFormData.bankName}
                                        onChange={handleEditInputChange}
                                        required
                                      >
                                        {BANKS_MAROC.map(bank => (
                                          <option key={bank} value={bank}>{bank}</option>
                                        ))}
                                      </select>
                                    </div>
                                    <div className="col-md-6">
                                      <label className="form-label">Titulaire *</label>
                                      <input
                                        type="text"
                                        className="form-control"
                                        name="accountHolder"
                                        value={editFormData.accountHolder}
                                        onChange={handleEditInputChange}
                                        required
                                      />
                                    </div>
                                    <div className="col-md-6">
                                      <label className="form-label">Numéro de Compte *</label>
                                      <input
                                        type="text"
                                        className="form-control"
                                        name="accountNumber"
                                        value={editFormData.accountNumber}
                                        onChange={handleEditInputChange}
                                        required
                                        minLength={10}
                                        maxLength={50}
                                      />
                                      <div className="form-text">10 à 50 caractères</div>
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
                                      <label className="form-label">SWIFT/BIC</label>
                                      <input
                                        type="text"
                                        className="form-control"
                                        name="swiftCode"
                                        value={editFormData.swiftCode}
                                        onChange={handleEditInputChange}
                                        placeholder="Ex: BCMAMAMC"
                                      />
                                    </div>
                                    <div className="col-md-6">
                                      <label className="form-label">Nom de l'Agence</label>
                                      <input
                                        type="text"
                                        className="form-control"
                                        name="branchName"
                                        value={editFormData.branchName}
                                        onChange={handleEditInputChange}
                                        placeholder="Nom de l'agence bancaire"
                                        maxLength={100}
                                      />
                                    </div>
                                    <div className="col-md-12">
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
                                          Activer ces coordonnées
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
                                          <i className="bi bi-x-circle me-1"></i>
                                          Annuler
                                        </button>
                                        <button
                                          type="button"
                                          className="btn btn-primary"
                                          onClick={handleUpdate}
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
                    {adminView && (
                      <li className="text-warning">
                        <i className="bi bi-exclamation-triangle me-1"></i>
                        Mode administrateur : vous voyez toutes les coordonnées
                      </li>
                    )}
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

// ==============================
// EXPORT
// ==============================

export default UserBankDetails;