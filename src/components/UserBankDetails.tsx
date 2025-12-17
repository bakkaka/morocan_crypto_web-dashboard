// src/components/UserBankDetails.tsx - VERSION CORRIGÉE COMPLÈTE
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';
import { getCurrentUser } from '../api/UserService';

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

// Fonction pour vérifier et obtenir l'ID utilisateur
const ensureValidUserId = async (): Promise<number | null> => {
  try {
    const user = getCurrentUser();
    
    if (!user) {
      console.log('❌ Aucun utilisateur trouvé');
      return null;
    }
    
    // Si ID déjà valide
    if (user.id && user.id !== 0) {
      console.log('✅ ID déjà valide:', user.id);
      return user.id;
    }
    
    console.log('⚠️ ID utilisateur = 0, tentative de récupération...');
    
    // Essayer de récupérer via /users/me
    try {
      const token = getAuthToken();
      if (token) {
        const response = await api.get('/users/me');
        if (response.data?.id && response.data.id !== 0) {
          console.log('✅ ID récupéré via /users/me:', response.data.id);
          return response.data.id;
        }
      }
    } catch (error) {
      console.log('❌ Impossible de récupérer ID via /users/me');
    }
    
    return null;
    
  } catch (error) {
    console.error('❌ Erreur vérification ID:', error);
    return null;
  }
};

// Fonction pour récupérer le vrai ID
const fetchUserRealId = async (): Promise<number | null> => {
  return await ensureValidUserId();
};

const isValidUserId = (id: any): boolean => {
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
// AUTH UTILITIES
// ==============================

const getAuthToken = (): string | null => {
  const tokenKeys = ['auth_token', 'jwt_token', 'token'];
  
  for (const key of tokenKeys) {
    const token = localStorage.getItem(key);
    if (token) {
      return token;
    }
  }
  
  return null;
};

const getStoredUser = (): any | null => {
  const userKeys = ['current_user', 'user'];
  
  for (const key of userKeys) {
    const userStr = localStorage.getItem(key);
    if (userStr) {
      try {
        const user = JSON.parse(userStr);
        if (user && user.email && user.id !== undefined) {
          return user;
        }
      } catch (e) {
        console.error(`❌ Erreur parsing ${key}:`, e);
      }
    }
  }
  
  return null;
};

const checkLocalStorage = (): void => {
  console.log('🔍 Contenu localStorage (auth related):');
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key?.includes('token') || key?.includes('auth') || key?.includes('user')) {
      const value = localStorage.getItem(key);
      console.log(`  ${key}: ${value?.substring(0, 50)}...`);
    }
  }
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
  const { user, isAuthenticated, checkAuthStatus } = useAuth();
  
  const [loading, setLoading] = useState<boolean>(false);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [bankDetails, setBankDetails] = useState<UserBankDetail[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [userId, setUserId] = useState<number | null>(null);
  
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
  // INITIALIZATION
  // ==============================
  
  useEffect(() => {
    // Définir l'ID utilisateur
    if (user && user.id !== 0) {
      setUserId(user.id);
    } else {
      const storedUser = getStoredUser();
      if (storedUser && storedUser.id !== 0) {
        setUserId(storedUser.id);
      }
    }
    
    console.log('🔍 UserBankDetails - État auth:', {
      authUser: user ? { id: user.id, email: user.email } : null,
      isAuthenticated,
      userId,
      isValidId: userId ? isValidUserId(userId) : false
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
      
      // Vérification du token
      const token = getAuthToken();
      
      if (!token) {
        console.error('❌ Aucun token trouvé');
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/login'), 2000);
        return;
      }
      
      console.log('✅ Token présent');
      
      // Rafraîchir l'utilisateur si nécessaire
      if (forceRefresh && user) {
        console.log('🔄 Rafraîchissement utilisateur demandé...');
        try {
          await checkAuthStatus();
          console.log('✅ État auth vérifié');
        } catch (refreshError) {
          console.warn('⚠️ Erreur vérification auth:', refreshError);
        }
      }
      
      const endpoint = adminView ? '/user_bank_details' : '/user_bank_details';
      console.log(`🌐 Appel API: ${endpoint}`);
      
      const response = await api.get(endpoint);
      const data = extractHydraMember(response.data);
      
      console.log('✅ Données bancaires chargées:', data.length, 'enregistrement(s)');
      setBankDetails(data);
      
    } catch (err: any) {
      console.error('❌ Erreur chargement coordonnées:', err);
      
      if (err.response?.status === 401) {
        console.error('🔐 Erreur 401 - Token invalide ou expiré');
        setError('Session expirée. Redirection vers la page de connexion...');
        setTimeout(() => navigate('/login'), 1500);
      } else if (err.response?.status === 403) {
        setError('Accès interdit. Vous n\'avez pas les permissions nécessaires.');
      } else {
        setError(`Impossible de charger les coordonnées bancaires: ${err.message || 'Erreur inconnue'}`);
      }
    } finally {
      setDataLoading(false);
    }
  }, [adminView, extractHydraMember, navigate, checkAuthStatus, user]);

  // ==============================
  // AUTHENTICATION CHECK
  // ==============================

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      console.log('🔐 UserBankDetails - Vérification authentification...');
      
      const token = getAuthToken();
      
      if (!token) {
        console.log('🔒 Pas de token, redirection...');
        navigate('/login');
        return;
      }
      
      // Si ID=0, essayer de le corriger
      if (user && user.id === 0) {
        console.warn('⚠️ ID utilisateur = 0, tentative de correction...');
        const fixed = await ensureValidUserId();
        if (fixed) {
          console.log('✅ ID corrigé, rechargement...');
          window.location.reload();
          return;
        }
      }
      
      if (isAuthenticated) {
        console.log('✅ Authentifié, chargement des données...');
        await loadBankDetails();
      } else {
        console.log('❌ Non authentifié');
        navigate('/login');
      }
    };
    
    const timer = setTimeout(() => {
      checkAuthAndLoad();
    }, 100);
    
    return () => clearTimeout(timer);
  }, [isAuthenticated, user, navigate, loadBankDetails]);

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
      
      if (error) setError(null);
      if (success) setSuccess(null);
    };

  const handleInputChange = createInputHandler(setFormData);
  const handleEditInputChange = createInputHandler(setEditFormData);

  // ==============================
  // CRUD OPERATIONS
  // ==============================

  const getEffectiveUser = useCallback(async (): Promise<{ id: number; email: string } | null> => {
    console.log('👤 Recherche utilisateur effectif...');
    
    // 1. Vérifier l'ID dans l'état local
    if (userId && isValidUserId(userId)) {
      const email = user?.email || getStoredUser()?.email || 'unknown@email.com';
      console.log('✅ Utilisateur trouvé via userId:', { id: userId, email });
      return { id: userId, email };
    }
    
    // 2. Vérifier l'utilisateur AuthContext
    if (user && isValidUserId(user.id)) {
      console.log('✅ Utilisateur trouvé dans AuthContext:', user.email, 'ID:', user.id);
      return { id: user.id, email: user.email || '' };
    }
    
    // 3. Vérifier le localStorage
    const storedUser = getStoredUser();
    if (storedUser && isValidUserId(storedUser.id)) {
      console.log('✅ Utilisateur trouvé dans localStorage:', storedUser.email, 'ID:', storedUser.id);
      return { id: storedUser.id, email: storedUser.email || '' };
    }
    
    // 4. Si ID = 0, essayer de récupérer le vrai ID
    if ((user && user.id === 0) || (storedUser && storedUser.id === 0)) {
      console.warn('⚠️ ID utilisateur = 0, tentative de récupération...');
      const realId = await fetchUserRealId();
      if (realId) {
        const email = user?.email || storedUser?.email || 'unknown@email.com';
        console.log('✅ ID corrigé:', realId);
        return { id: realId, email };
      }
    }
    
    console.warn('⚠️ Aucun utilisateur effectif trouvé');
    return null;
  }, [user, userId]);

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
      const effectiveUser = await getEffectiveUser();
      
      if (!effectiveUser) {
        console.error('❌ Aucun utilisateur effectif');
        throw new Error('Session invalide. Veuillez vous reconnecter.');
      }

      // VÉRIFICATION CRITIQUE : ID ne doit pas être 0
      if (effectiveUser.id === 0) {
        console.error('❌ ID utilisateur = 0, tentative de correction...');
        const realId = await fetchUserRealId();
        if (!realId) {
          throw new Error('ID utilisateur invalide. Veuillez vous déconnecter et vous reconnecter.');
        }
        effectiveUser.id = realId;
        console.log('✅ ID corrigé:', effectiveUser.id);
      }

      // Vérifier le token
      const token = getAuthToken();
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

      // Envoi
      const response = await api.post('/user_bank_details', postData);
      console.log('✅ Coordonnées créées:', response.data);

      setSuccess('✅ Coordonnées bancaires ajoutées avec succès !');
      setFormData(initialFormData);
      await loadBankDetails(true);

    } catch (err: any) {
      console.error('❌ Erreur création coordonnées:', err);
      
      // Gestion spécifique de l'erreur ID=0
      if (err.response?.status === 404 && err.response?.data?.detail?.includes('/api/users/0')) {
        setError('Erreur : ID utilisateur invalide. Veuillez vous déconnecter et vous reconnecter.');
      } else if (err.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        setTimeout(() => navigate('/login'), 2000);
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
    const token = getAuthToken();
    const can = isAuthenticated && userId && isValidUserId(userId) && token && !loading;
    
    return can;
  }, [isAuthenticated, userId, loading]);

  // ==============================
  // DEBUG BUTTON
  // ==============================

  const debugAuth = () => {
    console.group('🔧 DEBUG AUTH UserBankDetails');
    
    console.log('=== AUTH CONTEXT ===');
    console.log('User:', user);
    console.log('isAuthenticated:', isAuthenticated);
    
    console.log('=== LOCALSTORAGE ===');
    checkLocalStorage();
    
    console.log('=== TOKENS ===');
    const token = getAuthToken();
    console.log('Token trouvé:', token ? `${token.substring(0, 30)}...` : 'NON');
    
    console.log('=== USER ID ===');
    console.log('User ID:', userId);
    console.log('isValidUserId:', isValidUserId(userId));
    
    console.groupEnd();
  };

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
        <div className="d-flex gap-2">
          <button
            type="button"
            className="btn btn-outline-warning btn-sm"
            onClick={async () => {
              console.log('🔧 Correction manuelle ID...');
              const currentUser = getCurrentUser();
              if (currentUser && currentUser.id === 0) {
                const realId = await ensureValidUserId();
                if (realId) {
                  currentUser.id = realId;
                  localStorage.setItem('current_user', JSON.stringify(currentUser));
                  alert('✅ ID corrigé ! Rafraîchissement...');
                  window.location.reload();
                } else {
                  alert('❌ Impossible de corriger ID');
                }
              } else {
                alert('✅ ID déjà valide');
              }
            }}
            title="Corriger ID"
          >
            <i className="bi bi-wrench"></i>
          </button>
          <button
            type="button"
            className="btn btn-outline-secondary btn-sm"
            onClick={debugAuth}
            title="Debug Auth"
          >
            <i className="bi bi-bug"></i>
          </button>
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

      {/* ID Warning */}
      {userId === 0 && (
        <div className="alert alert-warning mb-4">
          <i className="bi bi-exclamation-triangle me-2"></i>
          <strong>Attention :</strong> Votre ID utilisateur est invalide (0). 
          <button 
            className="btn btn-sm btn-warning ms-2"
            onClick={async () => {
              const currentUser = getCurrentUser();
              if (currentUser && currentUser.id === 0) {
                const realId = await ensureValidUserId();
                if (realId) {
                  currentUser.id = realId;
                  localStorage.setItem('current_user', JSON.stringify(currentUser));
                  window.location.reload();
                }
              }
            }}
          >
            Corriger l'ID
          </button>
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
                  <strong>Attention :</strong> 
                  {!isAuthenticated ? 'Vous devez être connecté' : 
                   !userId ? 'ID utilisateur manquant' : 
                   userId === 0 ? 'ID utilisateur invalide (0)' :
                   !getAuthToken() ? 'Token manquant' : 
                   'Veuillez patienter...'}
                  
                  {userId === 0 && (
                    <div className="mt-2">
                      <button 
                        className="btn btn-sm btn-warning"
                        onClick={async () => {
                          const currentUser = getCurrentUser();
                          if (currentUser && currentUser.id === 0) {
                            const realId = await ensureValidUserId();
                            if (realId) {
                              currentUser.id = realId;
                              localStorage.setItem('current_user', JSON.stringify(currentUser));
                              window.location.reload();
                            }
                          }
                        }}
                      >
                        <i className="bi bi-wrench me-1"></i>
                        Corriger l'ID
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