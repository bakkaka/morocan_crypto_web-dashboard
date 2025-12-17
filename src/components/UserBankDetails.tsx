// src/components/UserBankDetails/UserBankDetails.tsx - VERSION SIMPLIFIÉE SANS GRID
import React, { useState, useEffect, useCallback } from 'react';

// Imports de base
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

// Imports Material-UI de base (sans Grid)
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

// Icônes
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AccountBalanceIcon from '@mui/icons-material/AccountBalance';
import type AuthContext from '../contexts/AuthContext';

// ==============================
// TYPES
// ==============================

interface BankDetail {
  id?: number;
  bankName: string;
  accountNumber: string;
  accountHolder: string;
  iban?: string;
  swiftCode?: string;
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
  const { user, isAuthenticated, ensureValidUserId } = useAuth();
  
  const [bankDetails, setBankDetails] = useState<BankDetail[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string>('');
  const [successMessage, setSuccessMessage] = useState<string>('');
  
  const [openDialog, setOpenDialog] = useState<boolean>(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);
  
  const [formData, setFormData] = useState<BankDetailFormData>({
    bankName: '',
    accountNumber: '',
    accountHolder: '',
    iban: '',
    swiftCode: '',
    currency: 'MAD',
    isActive: true,
  });

  // ==============================
  // UTILITY FUNCTIONS
  // ==============================
  
  const getStableUserId = useCallback(async (): Promise<number> => {
    if (!user || !isAuthenticated) {
      throw new Error('Utilisateur non authentifié');
    }
    
    try {
      const validUserId = await ensureValidUserId();
      return validUserId;
    } catch (error) {
      console.error('Erreur récupération ID:', error);
      
      if (user.id && user.id > 0) {
        return user.id;
      }
      
      if (user.email) {
        let hash = 0;
        for (let i = 0; i < user.email.length; i++) {
          hash = ((hash << 5) - hash) + user.email.charCodeAt(i);
          hash |= 0;
        }
        return 100000 + (Math.abs(hash) % 100000);
      }
      
      throw new Error('Impossible de déterminer l\'ID utilisateur');
    }
  }, [user, isAuthenticated, ensureValidUserId]);
  
  const validateBankDetail = (data: BankDetailFormData): string[] => {
    const errors: string[] = [];
    
    if (!data.bankName.trim()) {
      errors.push('Nom de la banque requis');
    }
    
    if (!data.accountNumber.trim()) {
      errors.push('Numéro de compte requis');
    }
    
    if (!data.accountHolder.trim()) {
      errors.push('Titulaire du compte requis');
    }
    
    if (data.iban && !/^[A-Z]{2}\d{2}[A-Z0-9]{1,30}$/.test(data.iban)) {
      errors.push('IBAN invalide');
    }
    
    if (data.swiftCode && !/^[A-Z]{6}[A-Z0-9]{2}([A-Z0-9]{3})?$/.test(data.swiftCode)) {
      errors.push('Code SWIFT/BIC invalide');
    }
    
    if (!data.currency) {
      errors.push('Devise requise');
    }
    
    return errors;
  };

  // ==============================
  // API FUNCTIONS
  // ==============================
  
  const fetchBankDetails = useCallback(async () => {
    if (!isAuthenticated) {
      setError('Veuillez vous connecter');
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      setError('');
      
      const userId = await getStableUserId();
      
      console.log('Chargement coordonnées bancaires pour utilisateur:', userId);
      
      const response = await api.get('/user_bank_details', {
        params: { user: userId },
        timeout: 10000,
      });
      
      if (response.data && Array.isArray(response.data)) {
        setBankDetails(response.data);
        console.log(`${response.data.length} coordonnées bancaires chargées`);
      } else if (response.data?.['hydra:member']) {
        setBankDetails(response.data['hydra:member']);
        console.log(`${response.data['hydra:member'].length} coordonnées bancaires chargées`);
      } else {
        setBankDetails([]);
        console.log('Aucune coordonnée bancaire trouvée');
      }
      
    } catch (error: any) {
      console.error('Erreur chargement coordonnées bancaires:', error);
      
      if (error.response?.status === 404) {
        setError('Aucune coordonnée bancaire trouvée');
        setBankDetails([]);
      } else if (error.response?.status === 401) {
        setError('Session expirée. Veuillez vous reconnecter.');
      } else {
        setError('Erreur lors du chargement des coordonnées bancaires');
      }
      
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, getStableUserId]);
  
  const saveBankDetail = async () => {
  const errors = validateBankDetail(formData);
  
  if (errors.length > 0) {
    setError(errors.join('. '));
    return;
  }
  
  try {
    setLoading(true);
    setError('');
    
    const userId = await getStableUserId();
    console.log('🆔 User ID pour sauvegarde:', userId);
    
    // OPTION 1: Format avec IRI (le plus courant avec API Platform)
    const payload1 = {
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      accountHolder: formData.accountHolder,
      iban: formData.iban || null,
      swiftCode: formData.swiftCode || null,
      currency: formData.currency,
      isActive: formData.isActive,
      user: `/api/users/${userId}`  // IRI format
    };
    
    // OPTION 2: Format avec juste l'ID
    const payload2 = {
      ...formData,
      user: userId  // Juste l'ID numérique
    };
    
    // OPTION 3: Format sans 'user' field (peut-être géré par le backend automatiquement)
    const payload3 = {
      bankName: formData.bankName,
      accountNumber: formData.accountNumber,
      accountHolder: formData.accountHolder,
      iban: formData.iban,
      swiftCode: formData.swiftCode,
      currency: formData.currency,
      isActive: formData.isActive
      // Pas de champ user
    };
    
    // OPTION 4: Format avec 'userId' (différent de 'user')
    const payload4 = {
      ...formData,
      userId: userId
    };
    
    // Testez chaque payload
    const payloads = [payload1, payload2, payload3, payload4];
    const payloadNames = ['IRI Format', 'ID Numérique', 'Sans User', 'Avec userId'];
    
    for (let i = 0; i < payloads.length; i++) {
      try {
        console.log(`🔧 Test payload ${i + 1} (${payloadNames[i]}):`, payloads[i]);
        
        const response = editingId 
          ? await api.put(`/user_bank_details/${editingId}`, payloads[i])
          : await api.post('/user_bank_details', payloads[i]);
        
        console.log(`✅ SUCCÈS avec ${payloadNames[i]}!`, response.data);
        
        setSuccessMessage(editingId 
          ? 'Coordonnée mise à jour !' 
          : 'Coordonnée ajoutée !'
        );
        
        resetForm();
        setOpenDialog(false);
        await fetchBankDetails();
        return;
        
      } catch (testError: any) {
        console.log(`❌ ${payloadNames[i]} échoué (${testError.response?.status}):`, 
          testError.response?.data || testError.message);
        
        if (i === payloads.length - 1) {
          // Dernier essai échoué, propager l'erreur
          throw testError;
        }
      }
    }
    
  } catch (error: any) {
    console.error('💥 TOUTES les tentatives ont échoué');
    
    // Afficher l'erreur la plus détaillée
    if (error.response?.data) {
      console.log('🐛 ERREUR BACKEND DÉTAILLÉE:', error.response.data);
      
      // Essayez de parser l'erreur
      let errorMessage = 'Erreur de validation';
      
      if (typeof error.response.data === 'string') {
        errorMessage = error.response.data;
      } else if (error.response.data.violations) {
        const violations = error.response.data.violations
          .map((v: any) => `• ${v.propertyPath}: ${v.message}`)
          .join('\n');
        errorMessage = `Problèmes:\n${violations}`;
      } else if (error.response.data.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response.data.message) {
        errorMessage = error.response.data.message;
      }
      
      setError(errorMessage);
    } else {
      setError('Impossible de sauvegarder. Code erreur: ' + (error.response?.status || 'inconnu'));
    }
    
  } finally {
    setLoading(false);
  }
};
  
  const deleteBankDetail = async (id: number) => {
    try {
      setLoading(true);
      
      await api.delete(`/user_bank_details/${id}`);
      
      setSuccessMessage('Coordonnée bancaire supprimée avec succès');
      setDeleteConfirm(null);
      
      await fetchBankDetails();
      
    } catch (error: any) {
      console.error('Erreur suppression coordonnée bancaire:', error);
      setError('Erreur lors de la suppression');
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
      accountHolder: '',
      iban: '',
      swiftCode: '',
      currency: 'MAD',
      isActive: true,
    });
    setEditingId(null);
  };
  
  const handleOpenAdd = () => {
    resetForm();
    setOpenDialog(true);
  };
  
  const handleOpenEdit = (bankDetail: BankDetail) => {
    setFormData({
      bankName: bankDetail.bankName,
      accountNumber: bankDetail.accountNumber,
      accountHolder: bankDetail.accountHolder,
      iban: bankDetail.iban || '',
      swiftCode: bankDetail.swiftCode || '',
      currency: bankDetail.currency,
      isActive: bankDetail.isActive,
    });
    setEditingId(bankDetail.id || null);
    setOpenDialog(true);
  };
  
  const handleCloseDialog = () => {
    setOpenDialog(false);
    resetForm();
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
    if (isAuthenticated) {
      fetchBankDetails();
    }
  }, [isAuthenticated, fetchBankDetails]);

  // ==============================
  // RENDER FUNCTIONS
  // ==============================
  
  const renderBankDetailCard = (bankDetail: BankDetail) => (
    <Card key={bankDetail.id} sx={{ mb: 2, boxShadow: 2 }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ flexGrow: 1 }}>
            <Typography variant="h6" gutterBottom>
              {bankDetail.bankName}
            </Typography>
            
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>Compte:</strong> {bankDetail.accountNumber}
            </Typography>
            
            <Typography variant="body2" color="textSecondary" gutterBottom>
              <strong>Titulaire:</strong> {bankDetail.accountHolder}
            </Typography>
            
            {bankDetail.iban && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                <strong>IBAN:</strong> {bankDetail.iban}
              </Typography>
            )}
            
            {bankDetail.swiftCode && (
              <Typography variant="body2" color="textSecondary" gutterBottom>
                <strong>SWIFT/BIC:</strong> {bankDetail.swiftCode}
              </Typography>
            )}
            
            <Typography variant="body2" color="textSecondary">
              <strong>Devise:</strong> {bankDetail.currency}
            </Typography>
            
            <Typography
              variant="body2"
              sx={{
                color: bankDetail.isActive ? 'success.main' : 'error.main',
                mt: 1,
                fontWeight: 'bold',
              }}
            >
              {bankDetail.isActive ? '✅ Actif' : '❌ Inactif'}
            </Typography>
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
        Ajoutez vos coordonnées bancaires pour faciliter les transactions.
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
        Réessayer
      </Button>
    </Alert>
  );
  
  const renderBankDetailsList = () => (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h5" component="h2">
          <AccountBalanceIcon sx={{ mr: 1, verticalAlign: 'middle' }} />
          Coordonnées bancaires
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleOpenAdd}
        >
          Ajouter
        </Button>
      </Box>
      
      {bankDetails.length === 0 ? (
        renderEmptyState()
      ) : (
        <Box>
          {bankDetails.map(renderBankDetailCard)}
          <Typography variant="body2" color="textSecondary" sx={{ mt: 2 }}>
            {bankDetails.length} coordonnée(s) bancaire(s) enregistrée(s)
          </Typography>
        </Box>
      )}
    </Box>
  );

  // ==============================
  // DIALOG FORM (SANS GRID)
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
          {editingId ? 'Modifier la coordonnée bancaire' : 'Ajouter une coordonnée bancaire'}
        </Typography>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ mt: 1 }}>
          {/* Champ 1 */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Nom de la banque *"
              name="bankName"
              value={formData.bankName}
              onChange={handleFormChange}
              required
              variant="outlined"
              size="small"
            />
          </Box>
          
          {/* Champ 2 */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Numéro de compte *"
              name="accountNumber"
              value={formData.accountNumber}
              onChange={handleFormChange}
              required
              variant="outlined"
              size="small"
            />
          </Box>
          
          {/* Champ 3 */}
          <Box sx={{ mb: 2 }}>
            <TextField
              fullWidth
              label="Titulaire du compte *"
              name="accountHolder"
              value={formData.accountHolder}
              onChange={handleFormChange}
              required
              variant="outlined"
              size="small"
            />
          </Box>
          
          {/* Ligne IBAN et SWIFT */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: 2 
          }}>
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="IBAN"
                name="iban"
                value={formData.iban}
                onChange={handleFormChange}
                placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                variant="outlined"
                size="small"
              />
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <TextField
                fullWidth
                label="Code SWIFT/BIC"
                name="swiftCode"
                value={formData.swiftCode}
                onChange={handleFormChange}
                placeholder="BNPAFRPPXXX"
                variant="outlined"
                size="small"
              />
            </Box>
          </Box>
          
          {/* Ligne Devise et Statut */}
          <Box sx={{ 
            display: 'flex', 
            flexDirection: { xs: 'column', sm: 'row' },
            gap: 2,
            mb: 2 
          }}>
            <Box sx={{ flex: 1 }}>
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
              >
                <MenuItem value="MAD">MAD (Dirham marocain)</MenuItem>
                <MenuItem value="EUR">EUR (Euro)</MenuItem>
                <MenuItem value="USD">USD (Dollar US)</MenuItem>
                <MenuItem value="GBP">GBP (Livre sterling)</MenuItem>
              </TextField>
            </Box>
            
            <Box sx={{ flex: 1 }}>
              <TextField
                select
                fullWidth
                label="Statut"
                name="isActive"
                value={formData.isActive ? 'active' : 'inactive'}
                onChange={(e) => {
                  setFormData(prev => ({
                    ...prev,
                    isActive: e.target.value === 'active',
                  }));
                }}
                variant="outlined"
                size="small"
              >
                <MenuItem value="active">Actif</MenuItem>
                <MenuItem value="inactive">Inactif</MenuItem>
              </TextField>
            </Box>
          </Box>
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
          {loading ? <CircularProgress size={24} /> : 'Enregistrer'}
        </Button>
      </DialogActions>
    </Dialog>
  );

  // ==============================
  // RENDER
  // ==============================
  
  if (!isAuthenticated) {
    return (
      <Box sx={{ maxWidth: 'md', mx: 'auto', p: 2 }}>
        <Alert severity="warning" sx={{ mt: 4 }}>
          Veuillez vous connecter pour gérer vos coordonnées bancaires.
        </Alert>
      </Box>
    );
  }
  
  return (
    <Box sx={{ maxWidth: 'md', mx: 'auto', p: 2 }}>
      {/* Notifications */}
      <Snackbar
        open={!!successMessage}
        autoHideDuration={6000}
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
            {loading ? <CircularProgress size={24} /> : 'Supprimer'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default UserBankDetails;