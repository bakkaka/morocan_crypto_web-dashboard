// src/components/UserBankDetails/UserBankDetails.tsx - VERSION CORRIGÉE
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

// Imports API
import { getAuthToken } from '../api/UserService';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

// Imports Material-UI
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import IconButton from '@mui/material/IconButton';
import Snackbar from '@mui/material/Snackbar';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';

// Icônes
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';

// ==============================
// TYPES
// ==============================

export interface UserBankDetail {
  id?: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  iban?: string;
  swiftCode?: string;
  branchName?: string;
  currency: string;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

interface BankDetailFormData {
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  iban: string;
  swiftCode: string;
  branchName: string;
  currency: string;
  isActive: boolean;
}

// ==============================
// COMPONENT
// ==============================

const UserBankDetails: React.FC = () => {
  // ==============================
  // STATE
  // ==============================
  const navigate = useNavigate();
  const { user } = useAuth();
  const token = getAuthToken();
  
  const [bankDetails, setBankDetails] = useState<UserBankDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [copySuccess, setCopySuccess] = useState<string>('');
  
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<BankDetailFormData>({
    bankName: '',
    accountNumber: '',
    accountHolder: user?.fullName || '',
    iban: '',
    swiftCode: '',
    branchName: '',
    currency: 'MAD',
    isActive: true,
  });

  // ==============================
  // UTILITY FUNCTIONS
  // ==============================
  
  const maskAccountNumber = (accountNumber: string): string => {
    if (!accountNumber) return '••••';
    if (accountNumber.length <= 4) return accountNumber;
    return '••••' + accountNumber.slice(-4);
  };

  const copyToClipboard = (text: string, type: string) => {
    navigator.clipboard.writeText(text).then(
      () => {
        setCopySuccess(`${type} copié !`);
        setTimeout(() => setCopySuccess(''), 2000);
      },
      (err) => {
        console.error('Erreur copie:', err);
      }
    );
  };

  const validateBankDetail = (data: BankDetailFormData): string[] => {
    const errors: string[] = [];
    
    if (!data.bankName.trim()) {
      errors.push('Nom de la banque est requis');
    }
    
    if (!data.accountNumber.trim()) {
      errors.push('Numéro de compte est requis');
    } else if (!/^[0-9]+$/.test(data.accountNumber.replace(/\s/g, ''))) {
      errors.push('Numéro de compte invalide (chiffres seulement)');
    }
    
    if (!data.accountHolder.trim()) {
      errors.push('Titulaire du compte est requis');
    }
    
    if (data.iban && !/^[A-Z]{2}[0-9]{2}[A-Z0-9]{1,30}$/.test(data.iban.replace(/\s/g, ''))) {
      errors.push('IBAN invalide');
    }
    
    if (data.swiftCode && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(data.swiftCode)) {
      errors.push('Code SWIFT/BIC invalide');
    }
    
    if (!data.currency) {
      errors.push('Devise est requise');
    }
    
    return errors;
  };

  // ==============================
  // API FUNCTIONS - CORRECTIONS APPLIQUÉES
  // ==============================
  
  const fetchBankDetails = useCallback(async () => {
    if (!token) {
      setError('Veuillez vous connecter');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log('📥 Chargement des coordonnées bancaires...');
      
      // Essayer différents endpoints
      let endpoints = [
        '/user_bank_details',
        '/user_bank_details/my-bank-accounts',
        '/api/user_bank_details'
      ];
      
      let response: any = null;
      let lastError: any = null;
      
      for (const endpoint of endpoints) {
        try {
          response = await api.get(endpoint, {
            headers: {
              'Authorization': `Bearer ${token}`
            }
          });
          console.log(`✅ Succès avec endpoint: ${endpoint}`);
          break;
        } catch (err: any) {
          lastError = err;
          console.log(`❌ Échec avec ${endpoint}: ${err.response?.status}`);
          continue;
        }
      }
      
      if (!response) {
        throw lastError || new Error('Aucun endpoint ne fonctionne');
      }
      
      // EXTRACTION DES DONNÉES - CORRIGÉE POUR isActive
      let bankDetailsData: UserBankDetail[] = [];
      
      if (response.data) {
        // Fonction pour normaliser les données
        const normalizeBankDetail = (item: any): UserBankDetail => ({
          id: item.id,
          bankName: item.bankName || item.bank_name || '',
          accountNumber: item.accountNumber || item.account_number || '',
          accountHolder: item.accountHolder || item.account_holder || '',
          iban: item.iban,
          swiftCode: item.swiftCode || item.swift_code,
          branchName: item.branchName || item.branch_name,
          currency: item.currency || 'MAD',
          // CORRECTION IMPORTANTE : s'assurer que isActive est un boolean
          isActive: item.isActive !== undefined ? Boolean(item.isActive) : 
                   (item.is_active !== undefined ? Boolean(item.is_active) : true),
          createdAt: item.createdAt || item.created_at,
          updatedAt: item.updatedAt || item.updated_at,
        });
        
        if (Array.isArray(response.data)) {
          bankDetailsData = response.data.map(normalizeBankDetail);
        } else if (response.data['hydra:member']) {
          bankDetailsData = response.data['hydra:member'].map(normalizeBankDetail);
        } else if (response.data.member) {
          bankDetailsData = response.data.member.map(normalizeBankDetail);
        } else if (typeof response.data === 'object' && response.data.id) {
          bankDetailsData = [normalizeBankDetail(response.data)];
        }
      }
      
      console.log(`✅ ${bankDetailsData.length} coordonnée(s) bancaire(s) chargée(s)`);
      console.log('📋 Données brutes:', bankDetailsData);
      console.log('🔍 Détail isActive:', bankDetailsData.map(bd => ({id: bd.id, isActive: bd.isActive})));
      
      setBankDetails(bankDetailsData);
      
    } catch (error: any) {
      console.error('❌ Erreur chargement coordonnées bancaires:', error);
      
      if (error.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
        navigate('/login');
      } else if (error.response?.status === 404) {
        setError('Aucune coordonnée bancaire trouvée');
        setBankDetails([]);
      } else {
        setError('Erreur lors du chargement des coordonnées bancaires. Code: ' + 
                (error.response?.status || 'inconnu'));
      }
      
    } finally {
      setLoading(false);
    }
  }, [token, navigate]);
  
  const saveBankDetail = async () => {
    const errors = validateBankDetail(formData);
    
    if (errors.length > 0) {
      setError(errors.join('. '));
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      console.log('💾 Sauvegarde coordonnée bancaire...');
      
      // Préparation des données
      const payload: any = {
        bankName: formData.bankName.trim(),
        accountNumber: formData.accountNumber.trim(),
        accountHolder: formData.accountHolder.trim(),
        currency: formData.currency,
        isActive: formData.isActive,
      };

      // AJOUTER L'UTILISATEUR - CORRECTION
      if (user?.id) {
        payload.user = `/api/users/${user.id}`;
        payload.userId = user.id;
        payload.createdBy = user.id;
      } else {
        throw new Error('Utilisateur non connecté');
      }
      
      // Champs optionnels
      if (formData.iban.trim()) {
        payload.iban = formData.iban.trim().toUpperCase();
      }
      
      if (formData.swiftCode.trim()) {
        payload.swiftCode = formData.swiftCode.trim().toUpperCase();
      }
      
      if (formData.branchName.trim()) {
        payload.branchName = formData.branchName.trim();
      }
      
      console.log('📤 Payload envoyé avec user ID:', payload);
      console.log('👤 ID utilisateur:', user?.id);
      
      let response;
      
      if (editingId) {
        // Mise à jour
        response = await api.put(`/user_bank_details/${editingId}`, payload, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('✅ Coordonnée mise à jour:', response.data);
      } else {
        // Création
        response = await api.post('/user_bank_details', payload, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        console.log('✅ Coordonnée créée:', response.data);
      }
      
      setSuccessMessage(editingId 
        ? 'Coordonnée bancaire mise à jour avec succès !' 
        : 'Coordonnée bancaire ajoutée avec succès !'
      );
      
      resetForm();
      setOpenDialog(false);
      
      // Recharger la liste
      setTimeout(() => {
        fetchBankDetails();
      }, 500);
      
    } catch (error: any) {
      console.error('💥 Erreur sauvegarde:', error);
      
      let errorMsg = 'Erreur lors de la sauvegarde';
      
      if (error.response?.data) {
        if (error.response.data.violations) {
          const violations = error.response.data.violations
            .map((v: any) => `${v.propertyPath}: ${v.message}`)
            .join(', ');
          errorMsg = `Erreurs de validation: ${violations}`;
        } else if (error.response.data.detail) {
          errorMsg = error.response.data.detail;
        } else if (error.response.data.message) {
          errorMsg = error.response.data.message;
        }
      }
      
      setError(errorMsg);
      
    } finally {
      setLoading(false);
    }
  };
  
  const deleteBankDetail = async (id: number) => {
    try {
      setLoading(true);
      
      await api.delete(`/user_bank_details/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      setSuccessMessage('Coordonnée bancaire supprimée avec succès');
      setDeleteConfirm(null);
      
      await fetchBankDetails();
      
    } catch (error: any) {
      console.error('❌ Erreur suppression:', error);
      setError('Erreur lors de la suppression. Code: ' + (error.response?.status || 'inconnu'));
    } finally {
      setLoading(false);
    }
  };

  // ==============================
  // FORM HANDLERS
  // ==============================
  
  const resetForm = () => {
    setFormData({
      bankName: '',
      accountNumber: '',
      accountHolder: user?.fullName || '',
      iban: '',
      swiftCode: '',
      branchName: '',
      currency: 'MAD',
      isActive: true,
    });
    setEditingId(null);
  };
  
  const handleOpenAdd = () => {
    resetForm();
    setOpenDialog(true);
  };
  
  const handleOpenEdit = (bankDetail: UserBankDetail) => {
    setFormData({
      bankName: bankDetail.bankName,
      accountNumber: bankDetail.accountNumber,
      accountHolder: bankDetail.accountHolder,
      iban: bankDetail.iban || '',
      swiftCode: bankDetail.swiftCode || '',
      branchName: bankDetail.branchName || '',
      currency: bankDetail.currency,
      isActive: bankDetail.isActive,
    });
    setEditingId(bankDetail.id || null);
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    setTimeout(() => {
      resetForm();
      setError('');
    }, 300);
  };
  
  const handleFormChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
  };

  // ==============================
  // EFFECTS
  // ==============================
  
  useEffect(() => {
    if (token) {
      fetchBankDetails();
    }
  }, [token, fetchBankDetails]);

  // ==============================
  // RENDER FUNCTIONS
  // ==============================
  
  const renderBankDetailCard = (bankDetail: UserBankDetail) => (
    <Card key={bankDetail.id} sx={{ mb: 2, boxShadow: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom color="primary">
              <AccountBalanceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
              {bankDetail.bankName}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
              <Typography variant="body2" sx={{ mr: 1 }}>
                <strong>Compte:</strong> {maskAccountNumber(bankDetail.accountNumber)}
              </Typography>
              <IconButton 
                size="small" 
                onClick={() => copyToClipboard(bankDetail.accountNumber, 'Numéro de compte')}
                title="Copier le numéro"
              >
                <ContentCopyIcon fontSize="small" />
              </IconButton>
            </Box>
            
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Titulaire:</strong> {bankDetail.accountHolder}
            </Typography>
            
            {bankDetail.iban && (
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                <Typography variant="body2" sx={{ mr: 1 }}>
                  <strong>IBAN:</strong> {bankDetail.iban}
                </Typography>
                <IconButton 
                  size="small" 
                  onClick={() => copyToClipboard(bankDetail.iban || '', 'IBAN')}
                  title="Copier l'IBAN"
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
              </Box>
            )}
            
            {bankDetail.swiftCode && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>SWIFT/BIC:</strong> {bankDetail.swiftCode}
              </Typography>
            )}
            
            {bankDetail.branchName && (
              <Typography variant="body2" sx={{ mb: 1 }}>
                <strong>Agence:</strong> {bankDetail.branchName}
              </Typography>
            )}
            
            <Typography variant="body2" sx={{ mb: 1 }}>
              <strong>Devise:</strong> {bankDetail.currency}
            </Typography>
            
            <Box sx={{ display: 'flex', alignItems: 'center', mt: 2 }}>
              <Typography
                variant="body2"
                sx={{
                  color: bankDetail.isActive ? 'success.main' : 'error.main',
                  fontWeight: 'bold',
                  display: 'flex',
                  alignItems: 'center',
                }}
              >
                {bankDetail.isActive ? '✅ Actif' : '❌ Inactif'}
              </Typography>
              
              {bankDetail.createdAt && (
                <Typography variant="caption" sx={{ ml: 2, color: 'text.secondary' }}>
                  Créé le: {new Date(bankDetail.createdAt).toLocaleDateString('fr-FR')}
                </Typography>
              )}
            </Box>
          </Box>
          
          <Box>
            <IconButton
              onClick={() => handleOpenEdit(bankDetail)}
              color="primary"
              size="small"
              sx={{ mr: 1 }}
            >
              <EditIcon />
            </IconButton>
            <IconButton
              onClick={() => setDeleteConfirm(bankDetail.id || null)}
              color="error"
              size="small"
            >
              <DeleteIcon />
            </IconButton>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
  
  const renderEmptyState = () => (
    <Alert severity="info" sx={{ mt: 2 }}>
      <Typography variant="body1">
        Aucune coordonnée bancaire enregistrée.
      </Typography>
      <Typography variant="body2" sx={{ mt: 1 }}>
        Ajoutez vos coordonnées bancaires pour faciliter les transactions P2P.
      </Typography>
      <Button
        variant="contained"
        startIcon={<AddIcon />}
        onClick={handleOpenAdd}
        sx={{ mt: 2 }}
      >
        Ajouter une coordonnée bancaire
      </Button>
    </Alert>
  );
  
  const renderLoadingState = () => (
    <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '200px' }}>
      <CircularProgress />
      <Typography sx={{ ml: 2 }}>Chargement des coordonnées bancaires...</Typography>
    </Box>
  );
  
  const renderErrorState = () => (
    <Alert severity="error" sx={{ mt: 2 }}>
      <Typography>{error}</Typography>
      <Button
        variant="outlined"
        onClick={fetchBankDetails}
        sx={{ mt: 1 }}
      >
        Réessayer le chargement
      </Button>
    </Alert>
  );
  
  const renderBankDetailsList = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Box>
          <Typography variant="h5" component="h2">
            <AccountBalanceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
            Mes Coordonnées Bancaires
          </Typography>
          <Typography variant="body2" color="textSecondary">
            Gérez vos informations bancaires pour les transactions P2P
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
        >
          Ajouter
        </Button>
      </Box>
      
      {copySuccess && (
        <Alert severity="success" sx={{ mb: 2 }}>
          {copySuccess}
        </Alert>
      )}
      
      {bankDetails.length === 0 ? (
        renderEmptyState()
      ) : (
        <Box>
          {bankDetails.map(renderBankDetailCard)}
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2, textAlign: 'center' }}>
            {bankDetails.length} coordonnée(s) bancaire(s) enregistrée(s)
          </Typography>
        </Box>
      )}
    </Box>
  );

  // ==============================
  // DIALOG FORM
  // ==============================
  
  const renderDialogForm = () => (
    <Dialog 
      open={openDialog} 
      onClose={handleCloseDialog} 
      maxWidth="sm" 
      fullWidth
      PaperProps={{
        sx: { borderRadius: 2 }
      }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6">
          {editingId ? 'Modifier la coordonnée bancaire' : 'Nouvelle coordonnée bancaire'}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {/* Nom de la banque */}
          <TextField
            fullWidth
            label="Nom de la banque *"
            name="bankName"
            value={formData.bankName}
            onChange={handleFormChange}
            required
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
            placeholder="Ex: Banque Populaire"
          />
          
          {/* Numéro de compte */}
          <TextField
            fullWidth
            label="Numéro de compte *"
            name="accountNumber"
            value={formData.accountNumber}
            onChange={handleFormChange}
            required
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
            placeholder="Ex: 123456789"
          />
          
          {/* Titulaire du compte */}
          <TextField
            fullWidth
            label="Titulaire du compte *"
            name="accountHolder"
            value={formData.accountHolder}
            onChange={handleFormChange}
            required
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
            placeholder="Ex: VOTRE NOM"
          />
          
          {/* Nom de l'agence */}
          <TextField
            fullWidth
            label="Nom de l'agence"
            name="branchName"
            value={formData.branchName}
            onChange={handleFormChange}
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
            placeholder="Ex: Agence Centre Ville"
          />
          
          {/* IBAN */}
          <TextField
            fullWidth
            label="IBAN"
            name="iban"
            value={formData.iban}
            onChange={handleFormChange}
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
            placeholder="MA64 0000 0000 0000 0000 0000 000"
            helperText="Optionnel - Format international"
          />
          
          {/* SWIFT/BIC */}
          <TextField
            fullWidth
            label="Code SWIFT/BIC"
            name="swiftCode"
            value={formData.swiftCode}
            onChange={handleFormChange}
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
            placeholder="Ex: BCPOMAMCXXX"
            helperText="Optionnel - Pour virements internationaux"
          />
          
          {/* Devise */}
          <TextField
            select
            fullWidth
            label="Devise *"
            name="currency"
            value={formData.currency}
            onChange={handleFormChange}
            required
            variant="outlined"
            size="small"
            sx={{ mb: 2 }}
          >
            <MenuItem value="MAD">MAD (Dirham marocain)</MenuItem>
            <MenuItem value="EUR">EUR (Euro)</MenuItem>
            <MenuItem value="USD">USD (Dollar US)</MenuItem>
          </TextField>
          
          {/* Statut */}
          <FormControlLabel
            control={
              <Switch
                checked={formData.isActive}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  isActive: e.target.checked
                }))}
                color="primary"
              />
            }
            label={
              <Typography variant="body2">
                {formData.isActive ? '✅ Actif (visible dans les annonces)' : '❌ Inactif (masqué)'}
              </Typography>
            }
            sx={{ mb: 2 }}
          />
        </Box>
        
        {error && (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        )}
      </DialogContent>
      
      <DialogActions sx={{ px: 3, pb: 2 }}>
        <Button onClick={handleCloseDialog} variant="outlined">
          Annuler
        </Button>
        <Button
          onClick={saveBankDetail}
          variant="contained"
          disabled={loading}
          sx={{ ml: 1 }}
        >
          {loading ? <CircularProgress size={24} /> : (editingId ? 'Mettre à jour' : 'Ajouter')}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ==============================
  // RENDER PRINCIPAL
  // ==============================
  
  if (!token) {
    return (
      <Box sx={{ maxWidth: 'md', mx: 'auto', p: 2 }}>
        <Alert severity="warning" sx={{ mt: 4 }}>
          Veuillez vous connecter pour gérer vos coordonnées bancaires.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ maxWidth: 'md', mx: 'auto', p: { xs: 1, sm: 2 } }}>
      {/* Notifications */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={5000}
        onClose={() => setSuccessMessage('')}
        message={successMessage}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      />
      
      {/* Contenu principal */}
      {loading && bankDetails.length === 0 ? (
        renderLoadingState()
      ) : error && bankDetails.length === 0 ? (
        renderErrorState()
      ) : (
        renderBankDetailsList()
      )}
      
      {/* Dialogue d'ajout/modification */}
      {renderDialogForm()}
      
      {/* Dialogue de confirmation de suppression */}
      <Dialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        PaperProps={{
          sx: { borderRadius: 2 }
        }}
      >
        <DialogTitle>
          <Typography variant="h6">
            Confirmer la suppression
          </Typography>
        </DialogTitle>
        <DialogContent>
          <Typography>
            Êtes-vous sûr de vouloir supprimer cette coordonnée bancaire ?
            Cette action est irréversible.
          </Typography>
          <Alert severity="warning" sx={{ mt: 2 }}>
            ⚠️ Si cette coordonnée est utilisée dans des annonces actives, 
            celles-ci pourront être affectées.
          </Alert>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined">
            Annuler
          </Button>
          <Button
            onClick={() => deleteConfirm && deleteBankDetail(deleteConfirm)}
            variant="contained"
            color="error"
            disabled={loading}
            sx={{ ml: 1 }}
          >
            {loading ? <CircularProgress size={24} /> : 'Supprimer définitivement'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserBankDetails;