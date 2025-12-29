// src/components/DashboardAdminAds.tsx - VERSION FINALE CORRIGÉE
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getAds, 
  approveAd, 
  publishAd, 
  rejectAd, 
  deleteAd,
  type Ad 
} from '../api/AdService';

interface AdStats {
  total: number;
  pending: number;
  published: number;
  approved: number;
  rejected: number;
  paused: number;
  completed: number;
  cancelled: number;
}

const DashboardAdminAds: React.FC = () => {
  console.log('🔍 [DashboardAdminAds] Composant monté');
  
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedAds, setSelectedAds] = useState<number[]>([]);
  const [refreshKey, setRefreshKey] = useState(0);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const { isAdmin, user: currentUser } = useAuth();

  console.log('👤 [DashboardAdminAds] User:', currentUser?.email);
  console.log('👑 [DashboardAdminAds] Est admin?:', isAdmin);
  console.log('🔄 [DashboardAdminAds] Refresh key:', refreshKey);

  // Charger les annonces
  const loadAds = useCallback(async () => {
    if (!isAdmin) {
      console.log('🚫 [DashboardAdminAds] Pas admin, annulation chargement');
      return;
    }

    try {
      console.log('🔄 [DashboardAdminAds] Début du chargement des annonces');
      setLoading(true);
      setError(null);
      
      const data = await getAds();
      
      console.log('📦 [DashboardAdminAds] Données reçues:', data);
      console.log('📊 [DashboardAdminAds] Nombre d\'annonces:', data.ads?.length || 0);
      
      setAds(data.ads || []);
      console.log('✅ [DashboardAdminAds] Annonces mises à jour dans le state');
      
    } catch (error: any) {
      console.error('❌ [DashboardAdminAds] Erreur lors du fetch:', error);
      console.error('❌ [DashboardAdminAds] Message d\'erreur:', error.message);
      
      const errorMessage = error.message.includes('404') 
        ? 'Route API non trouvée. Vérifiez que /api/ads existe.'
        : `Impossible de charger la liste des annonces: ${error.message}`;
      
      setError(errorMessage);
      setAds([]);
    } finally {
      console.log('🏁 [DashboardAdminAds] Chargement terminé');
      setLoading(false);
    }
  }, [isAdmin]);

  // Action : Approuver une annonce
  const handleApprove = useCallback(async (id: number) => {
    if (!window.confirm('Approuver cette annonce ?')) return;

    try {
      setActionLoading(id);
      console.log(`✅ [DashboardAdminAds] Approbation annonce ID: ${id}`);
      
      if (currentUser?.id) {
        await approveAd(id, currentUser.id);
        console.log('✅ [DashboardAdminAds] Approbation réussie');
        
        // Mettre à jour localement (les APIs retournent void, donc on met à jour manuellement)
        setAds(prevAds => 
          prevAds.map(ad => 
            ad.id === id ? {
              ...ad,
              status: 'approved',
              approvedBy: currentUser,
              adminNotes: 'Approuvé par l\'administrateur',
              updatedAt: new Date().toISOString()
            } : ad
          )
        );
        
        alert('✅ Annonce approuvée avec succès !');
      } else {
        throw new Error('Utilisateur non connecté');
      }
    } catch (error: any) {
      console.error('❌ [DashboardAdminAds] Erreur approbation détaillée:', error);
      alert(`❌ Erreur: ${error.message || 'Erreur lors de l\'approbation'}`);
    } finally {
      setActionLoading(null);
    }
  }, [currentUser]);

  // Action : Publier une annonce
  const handlePublish = useCallback(async (id: number) => {
    if (!window.confirm('Publier cette annonce ?')) return;

    try {
      setActionLoading(id);
      console.log(`📢 [DashboardAdminAds] Publication annonce ID: ${id}`);
      
      await publishAd(id);
      console.log('✅ [DashboardAdminAds] Publication réussie');
      
      // Mettre à jour localement
      setAds(prevAds => 
        prevAds.map(ad => 
          ad.id === id ? {
            ...ad,
            status: 'published',
            publishedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          } : ad
        )
      );
      
      alert('✅ Annonce publiée avec succès !');
    } catch (error: any) {
      console.error('❌ [DashboardAdminAds] Erreur publication:', error);
      alert(`❌ Erreur: ${error.message || 'Erreur lors de la publication'}`);
    } finally {
      setActionLoading(null);
    }
  }, []);

  // Action : Rejeter une annonce
  const handleReject = useCallback(async (id: number) => {
    const reason = prompt('Raison du rejet (optionnel):');
    
    if (!window.confirm('Rejeter cette annonce ?')) return;

    try {
      setActionLoading(id);
      console.log(`❌ [DashboardAdminAds] Rejet annonce ID: ${id}, raison: ${reason || 'Non spécifiée'}`);
      
      await rejectAd(id, reason || undefined);
      console.log('✅ [DashboardAdminAds] Rejet réussi');
      
      // Mettre à jour localement
      setAds(prevAds => 
        prevAds.map(ad => 
          ad.id === id ? {
            ...ad,
            status: 'rejected',
            adminNotes: reason || 'Rejeté par l\'administrateur',
            updatedAt: new Date().toISOString()
          } : ad
        )
      );
      
      alert('✅ Annonce rejetée !');
    } catch (error: any) {
      console.error('❌ [DashboardAdminAds] Erreur rejet:', error);
      alert(`❌ Erreur: ${error.message || 'Erreur lors du rejet'}`);
    } finally {
      setActionLoading(null);
    }
  }, []);

  // Action : Supprimer une annonce
  const handleDelete = useCallback(async (id: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir supprimer cette annonce ?\nCette action est irréversible.')) {
      return;
    }

    try {
      setActionLoading(id);
      console.log(`🗑️ [DashboardAdminAds] Suppression annonce ID: ${id}`);
      
      await deleteAd(id);
      
      // Retirer de la liste localement
      setAds(prevAds => prevAds.filter(ad => ad.id !== id));
      
      alert('✅ Annonce supprimée avec succès !');
    } catch (error: any) {
      console.error('❌ [DashboardAdminAds] Erreur suppression:', error);
      alert(`❌ Erreur: ${error.message || 'Erreur lors de la suppression'}`);
    } finally {
      setActionLoading(null);
    }
  }, []);

  // Actions groupées
  const handleBulkAction = useCallback(async (action: 'approve' | 'publish' | 'reject' | 'delete') => {
    if (selectedAds.length === 0) {
      alert('Veuillez sélectionner au moins une annonce');
      return;
    }

    const actionNames = {
      'delete': 'supprimer',
      'approve': 'approuver',
      'publish': 'publier',
      'reject': 'rejeter'
    };

    const actionSuccess = {
      'delete': 'supprimée(s)',
      'approve': 'approuvée(s)',
      'publish': 'publiée(s)',
      'reject': 'rejetée(s)'
    };
    
    const actionName = actionNames[action];
    const confirmMessage = `${actionName.charAt(0).toUpperCase() + actionName.slice(1)} ${selectedAds.length} annonce(s) ?`;
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setActionLoading(-1); // -1 pour indiquer action groupée
      
      // Exécuter les actions une par une pour une meilleure gestion d'erreur
      for (const id of selectedAds) {
        try {
          switch (action) {
            case 'approve':
              if (currentUser?.id) {
                await approveAd(id, currentUser.id);
                setAds(prevAds => 
                  prevAds.map(ad => 
                    ad.id === id ? {
                      ...ad,
                      status: 'approved',
                      approvedBy: currentUser,
                      adminNotes: 'Approuvé par l\'administrateur',
                      updatedAt: new Date().toISOString()
                    } : ad
                  )
                );
              }
              break;
            case 'publish':
              await publishAd(id);
              setAds(prevAds => 
                prevAds.map(ad => 
                  ad.id === id ? {
                    ...ad,
                    status: 'published',
                    publishedAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                  } : ad
                )
              );
              break;
            case 'reject':
              await rejectAd(id, 'Action groupée');
              setAds(prevAds => 
                prevAds.map(ad => 
                  ad.id === id ? {
                    ...ad,
                    status: 'rejected',
                    adminNotes: 'Rejeté par action groupée',
                    updatedAt: new Date().toISOString()
                  } : ad
                )
              );
              break;
            case 'delete':
              await deleteAd(id);
              setAds(prevAds => prevAds.filter(ad => ad.id !== id));
              break;
          }
        } catch (error) {
          console.error(`❌ [DashboardAdminAds] Erreur pour l'annonce ${id}:`, error);
        }
      }
      
      console.log(`✅ [DashboardAdminAds] Action groupée ${action} réussie`);
      
      alert(`✅ ${selectedAds.length} annonce(s) ${actionSuccess[action]} !`);
      setSelectedAds([]);
    } catch (error: any) {
      console.error(`❌ [DashboardAdminAds] Erreur action groupée ${action}:`, error);
      alert(`❌ Erreur: ${error.message || 'Erreur lors de l\'action groupée'}`);
    } finally {
      setActionLoading(null);
    }
  }, [selectedAds, currentUser]);

  // Sélectionner/désélectionner toutes les annonces
  const toggleSelectAll = useCallback((checked: boolean) => {
    console.log(`☑️ [DashboardAdminAds] Sélection ${checked ? 'toutes' : 'aucune'}`);
    if (checked) {
      setSelectedAds(ads.map(a => a.id));
    } else {
      setSelectedAds([]);
    }
  }, [ads]);

  // Toggle sélection individuelle
  const toggleSelectAd = useCallback((id: number, checked: boolean) => {
    console.log(`☑️ [DashboardAdminAds] Sélection annonce ${id}: ${checked}`);
    if (checked) {
      setSelectedAds(prev => [...prev, id]);
    } else {
      setSelectedAds(prev => prev.filter(adId => adId !== id));
    }
  }, []);

  // Calcul des statistiques
  const stats: AdStats = useMemo(() => ({
    total: ads.length,
    pending: ads.filter(a => a.status === 'pending').length,
    published: ads.filter(a => a.status === 'published').length,
    approved: ads.filter(a => a.status === 'approved').length,
    rejected: ads.filter(a => a.status === 'rejected').length,
    paused: ads.filter(a => a.status === 'paused').length,
    completed: ads.filter(a => a.status === 'completed').length,
    cancelled: ads.filter(a => a.status === 'cancelled').length
  }), [ads]);

  console.log('📊 [DashboardAdminAds] Stats calculées:', stats);

  // Fonctions utilitaires pour le statut
  const getStatusLabel = useCallback((status: string): string => {
    const statusMap: Record<string, string> = {
      'pending': '⏳ En attente',
      'approved': '✅ Approuvé',
      'published': '📢 Publié',
      'paused': '⏸️ En pause',
      'rejected': '❌ Rejeté',
      'completed': '🏁 Terminé',
      'cancelled': '🚫 Annulé'
    };
    return statusMap[status] || status;
  }, []);

  const getStatusClass = useCallback((status: string): string => {
    const statusClasses: Record<string, string> = {
      'pending': 'warning',
      'approved': 'info',
      'published': 'success',
      'paused': 'secondary',
      'rejected': 'danger',
      'completed': 'primary',
      'cancelled': 'dark'
    };
    return statusClasses[status] || 'secondary';
  }, []);

  // Formater la date
  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Date invalide';
    }
  }, []);

  // Formater le montant
  const formatAmount = useCallback((amount: number): string => {
    return amount.toLocaleString('fr-FR');
  }, []);

  // Formater le prix
  const formatPrice = useCallback((price: number): string => {
    return `${price.toLocaleString('fr-FR')} MAD`;
  }, []);

  // Chargement initial et rafraîchissement
  useEffect(() => {
    console.log('🎬 [DashboardAdminAds] useEffect exécuté, refreshKey:', refreshKey);
    if (isAdmin) {
      console.log('👑 [DashboardAdminAds] Utilisateur est admin, chargement des annonces');
      loadAds();
    } else {
      console.log('🚫 [DashboardAdminAds] Utilisateur n\'est pas admin');
      setLoading(false);
    }
  }, [loadAds, isAdmin, refreshKey]);

  // Vérification des permissions admin
  console.log('🔐 [DashboardAdminAds] Vérification admin:', isAdmin);
  
  if (!isAdmin) {
    console.log('🚫 [DashboardAdminAds] Accès refusé - pas admin');
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">
          <h4 className="alert-heading">
            <i className="bi bi-shield-exclamation me-2"></i>
            Accès refusé
          </h4>
          <p className="mb-0">Vous devez être administrateur pour accéder à cette page.</p>
          <div className="mt-3">
            <p><strong>Détails:</strong></p>
            <ul className="mb-0">
              <li>Email: {currentUser?.email || 'Non connecté'}</li>
              <li>ID: {currentUser?.id || 'N/A'}</li>
              <li>Rôles: {currentUser?.roles?.join(', ') || 'Aucun'}</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // État de chargement
  if (loading) {
    console.log('⏳ [DashboardAdminAds] Affichage état chargement');
    return (
      <div className="d-flex flex-column justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" style={{ width: '3rem', height: '3rem' }} role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <div className="mt-3">
          <span className="text-muted">Chargement des annonces...</span>
          <div className="small text-muted mt-2">
            Appel API: GET /api/ads
          </div>
        </div>
      </div>
    );
  }

  // Erreur de chargement
  if (error) {
    console.log('❌ [DashboardAdminAds] Affichage erreur:', error);
    return (
      <div className="container-fluid mt-3">
        <div className="alert alert-danger" role="alert">
          <h4 className="alert-heading">
            <i className="bi bi-exclamation-triangle me-2"></i>
            Erreur de chargement
          </h4>
          <p>{error}</p>
          
          <hr />
          
          <div className="d-flex gap-2 mt-3">
            <button className="btn btn-primary" onClick={loadAds}>
              <i className="bi bi-arrow-clockwise me-2"></i>
              Réessayer
            </button>
            <button className="btn btn-outline-secondary" onClick={() => setError(null)}>
              Fermer
            </button>
          </div>
        </div>
      </div>
    );
  }

  console.log('🎨 [DashboardAdminAds] Rendu principal avec', ads.length, 'annonces');

  return (
    <div className="container-fluid">
      {/* Debug info (visible uniquement en développement) */}
      {import.meta.env.DEV && (
        <div className="alert alert-info mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Debug Info:</strong>
              <span className="ms-2 badge bg-primary">{ads.length} annonces</span>
              <span className="ms-2 badge bg-warning">{stats.pending} en attente</span>
              <span className="ms-2 badge bg-info">{stats.approved} approuvées</span>
              <span className="ms-2 badge bg-success">{stats.published} publiées</span>
            </div>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-sm btn-outline-dark"
                onClick={() => {
                  console.log('🔍 [DashboardAdminAds] Données complètes:', ads);
                  console.log('👤 [DashboardAdminAds] User:', currentUser);
                }}
              >
                <i className="bi bi-bug me-1"></i>
                Log Data
              </button>
              <button 
                className="btn btn-sm btn-outline-success"
                onClick={loadAds}
              >
                <i className="bi bi-arrow-clockwise me-1"></i>
                Refresh
              </button>
            </div>
          </div>
        </div>
      )}

      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 mb-2">
            <i className="bi bi-megaphone me-2"></i>
            Modération des Annonces
          </h1>
          <p className="text-muted mb-0">Validez, publiez ou rejetez les annonces des utilisateurs</p>
        </div>
        <div className="text-end">
          {stats.pending > 0 && (
            <div className="badge bg-warning text-dark fs-6 p-2 mb-2">
              <i className="bi bi-clock-history me-1"></i>
              {stats.pending} en attente
            </div>
          )}
          <div className="small text-muted">
            Connecté en tant que: <strong>{currentUser?.email}</strong>
          </div>
        </div>
      </div>

      {/* Statistiques */}
      <div className="row mb-4 g-3">
        <div className="col-md-3 col-6">
          <div className="card border-primary h-100">
            <div className="card-body text-center p-3">
              <h3 className="text-primary mb-2">{stats.total}</h3>
              <p className="mb-0 small fw-semibold">Total</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card border-warning h-100">
            <div className="card-body text-center p-3">
              <h3 className="text-warning mb-2">{stats.pending}</h3>
              <p className="mb-0 small fw-semibold">En Attente</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card border-success h-100">
            <div className="card-body text-center p-3">
              <h3 className="text-success mb-2">{stats.published}</h3>
              <p className="mb-0 small fw-semibold">Publiées</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card border-info h-100">
            <div className="card-body text-center p-3">
              <h3 className="text-info mb-2">{stats.approved}</h3>
              <p className="mb-0 small fw-semibold">Approuvées</p>
            </div>
          </div>
        </div>
      </div>

      {/* Carte principale */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
          <h5 className="card-title mb-0">
            <i className="bi bi-list-ul me-2"></i>
            Liste des Annonces ({ads.length})
          </h5>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-primary btn-sm" 
              onClick={loadAds} 
              disabled={loading || actionLoading !== null}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              {loading ? 'Chargement...' : 'Actualiser'}
            </button>
            {selectedAds.length > 0 && (
              <div className="dropdown">
                <button 
                  className="btn btn-outline-secondary btn-sm dropdown-toggle" 
                  type="button" 
                  data-bs-toggle="dropdown" 
                  aria-expanded="false"
                  disabled={loading || actionLoading !== null}
                >
                  <i className="bi bi-gear me-1"></i>
                  Actions ({selectedAds.length})
                </button>
                <ul className="dropdown-menu dropdown-menu-end">
                  <li>
                    <button 
                      className="dropdown-item" 
                      onClick={() => handleBulkAction('approve')} 
                      disabled={loading || actionLoading !== null}
                    >
                      <i className="bi bi-check-circle me-2 text-info"></i>
                      Approuver sélection
                    </button>
                  </li>
                  <li>
                    <button 
                      className="dropdown-item" 
                      onClick={() => handleBulkAction('publish')} 
                      disabled={loading || actionLoading !== null}
                    >
                      <i className="bi bi-send-check me-2 text-success"></i>
                      Publier sélection
                    </button>
                  </li>
                  <li>
                    <button 
                      className="dropdown-item" 
                      onClick={() => handleBulkAction('reject')} 
                      disabled={loading || actionLoading !== null}
                    >
                      <i className="bi bi-x-circle me-2 text-warning"></i>
                      Rejeter sélection
                    </button>
                  </li>
                  <li><hr className="dropdown-divider" /></li>
                  <li>
                    <button 
                      className="dropdown-item text-danger" 
                      onClick={() => handleBulkAction('delete')} 
                      disabled={loading || actionLoading !== null}
                    >
                      <i className="bi bi-trash me-2"></i>
                      Supprimer sélection
                    </button>
                  </li>
                </ul>
              </div>
            )}
          </div>
        </div>
        
        <div className="card-body p-0">
          {ads.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-inbox fs-1 text-muted mb-3"></i>
              <h4 className="text-muted">Aucune annonce trouvée</h4>
              <p className="text-muted">Les annonces apparaîtront ici une fois créées par les utilisateurs.</p>
              <div className="mt-3">
                <button 
                  className="btn btn-primary me-2" 
                  onClick={loadAds} 
                  disabled={loading || actionLoading !== null}
                >
                  <i className="bi bi-arrow-clockwise me-2"></i>
                  {loading ? 'Chargement...' : 'Rafraîchir'}
                </button>
              </div>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '50px' }}>
                      <input 
                        type="checkbox" 
                        className="form-check-input"
                        checked={selectedAds.length === ads.length && ads.length > 0}
                        onChange={(e) => toggleSelectAll(e.target.checked)}
                        disabled={loading || actionLoading !== null}
                      />
                    </th>
                    <th>Annonce</th>
                    <th>Utilisateur</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th className="text-center" style={{ width: '180px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {ads.map((ad) => {
                    const isAdLoading = actionLoading === ad.id;
                    return (
                      <tr key={ad.id} className={ad.status === 'pending' ? 'table-warning' : ''}>
                        <td>
                          <input 
                            type="checkbox" 
                            className="form-check-input"
                            checked={selectedAds.includes(ad.id)}
                            onChange={(e) => toggleSelectAd(ad.id, e.target.checked)}
                            disabled={loading || actionLoading !== null}
                          />
                        </td>
                        <td>
                          <div className="d-flex flex-column">
                            <div className="fw-semibold">
                              {ad.type === 'buy' ? '🛒 Achat' : '💰 Vente'} - {formatAmount(ad.amount)} USDT
                            </div>
                            <div className="small text-muted">
                              <span className="me-2">Prix: {formatPrice(ad.price)}</span>
                              <span>•</span>
                              <span className="ms-2">Méthode: {ad.paymentMethod}</span>
                            </div>
                            {ad.title && (
                              <div className="small mt-1">
                                <strong>Titre:</strong> {ad.title}
                              </div>
                            )}
                            {ad.description && (
                              <div className="small text-muted mt-1 text-truncate" style={{ maxWidth: '250px' }} title={ad.description}>
                                {ad.description}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex flex-column">
                            <div className="fw-semibold">{ad.user.fullName}</div>
                            <div className="small text-muted">{ad.user.email}</div>
                            <div className="small mt-1">
                              <span className={`badge ${ad.user.roles.includes('ROLE_ADMIN') ? 'bg-danger' : 'bg-secondary'}`}>
                                {ad.user.roles.includes('ROLE_ADMIN') ? 'Admin' : 'Utilisateur'}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="d-flex flex-column">
                            <span className={`badge bg-${getStatusClass(ad.status)} mb-1`}>
                              {getStatusLabel(ad.status)}
                            </span>
                            {ad.adminNotes && (
                              <div className="small text-muted" title={ad.adminNotes}>
                                <i className="bi bi-chat-left-text me-1"></i>
                                {ad.adminNotes.length > 25 ? ad.adminNotes.substring(0, 25) + '...' : ad.adminNotes}
                              </div>
                            )}
                            {ad.approvedBy && (
                              <div className="small text-muted mt-1">
                                <i className="bi bi-person-check me-1"></i>
                                Approuvé par: {ad.approvedBy.fullName}
                              </div>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="small">
                            <div className="fw-semibold">Créée:</div>
                            <div className="text-muted">{formatDate(ad.createdAt)}</div>
                            {ad.updatedAt !== ad.createdAt && (
                              <>
                                <div className="fw-semibold mt-2">Modifiée:</div>
                                <div className="text-muted">{formatDate(ad.updatedAt)}</div>
                              </>
                            )}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex gap-1 justify-content-center">
                            {ad.status === 'pending' && (
                              <>
                                <button 
                                  className="btn btn-info btn-sm"
                                  onClick={() => handleApprove(ad.id)}
                                  title="Approuver"
                                  disabled={loading || isAdLoading || actionLoading !== null}
                                >
                                  {isAdLoading ? (
                                    <span className="spinner-border spinner-border-sm" role="status"></span>
                                  ) : (
                                    <i className="bi bi-check-lg"></i>
                                  )}
                                </button>
                                <button 
                                  className="btn btn-success btn-sm"
                                  onClick={() => handlePublish(ad.id)}
                                  title="Publier"
                                  disabled={loading || isAdLoading || actionLoading !== null}
                                >
                                  {isAdLoading ? (
                                    <span className="spinner-border spinner-border-sm" role="status"></span>
                                  ) : (
                                    <i className="bi bi-send-check"></i>
                                  )}
                                </button>
                                <button 
                                  className="btn btn-warning btn-sm"
                                  onClick={() => handleReject(ad.id)}
                                  title="Rejeter"
                                  disabled={loading || isAdLoading || actionLoading !== null}
                                >
                                  {isAdLoading ? (
                                    <span className="spinner-border spinner-border-sm" role="status"></span>
                                  ) : (
                                    <i className="bi bi-x-lg"></i>
                                  )}
                                </button>
                              </>
                            )}
                            {ad.status === 'approved' && (
                              <button 
                                className="btn btn-success btn-sm"
                                onClick={() => handlePublish(ad.id)}
                                title="Publier"
                                disabled={loading || isAdLoading || actionLoading !== null}
                              >
                                {isAdLoading ? (
                                  <span className="spinner-border spinner-border-sm" role="status"></span>
                                ) : (
                                  <i className="bi bi-send-check"></i>
                                )}
                              </button>
                            )}
                            {(ad.status === 'published' || ad.status === 'paused') && (
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleReject(ad.id)}
                                title="Rejeter"
                                disabled={loading || isAdLoading || actionLoading !== null}
                              >
                                {isAdLoading ? (
                                  <span className="spinner-border spinner-border-sm" role="status"></span>
                                ) : (
                                  <i className="bi bi-pause"></i>
                                )}
                              </button>
                            )}
                            <button 
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleDelete(ad.id)}
                              title="Supprimer"
                              disabled={loading || isAdLoading || actionLoading !== null}
                            >
                              {isAdLoading ? (
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                              ) : (
                                <i className="bi bi-trash"></i>
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        <div className="card-footer bg-light py-2">
          <div className="d-flex justify-content-between align-items-center">
            <small className="text-muted">
              <i className="bi bi-info-circle me-1"></i>
              {ads.length} annonce(s) • Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
            </small>
            {selectedAds.length > 0 && (
              <small className="text-primary fw-semibold">
                <i className="bi bi-check2-square me-1"></i>
                {selectedAds.length} annonce(s) sélectionnée(s)
              </small>
            )}
          </div>
        </div>
      </div>

      {/* Guide de modération */}
      <div className="card border-info mt-4">
        <div className="card-header bg-info text-white">
          <h5 className="card-title mb-0">
            <i className="bi bi-info-circle me-2"></i>
            Guide de modération
          </h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h6 className="fw-semibold mb-3">Workflow des annonces:</h6>
              <ul className="mb-0">
                <li className="mb-2">
                  <span className="badge bg-warning me-2">En attente</span>
                  → En attente de validation admin
                </li>
                <li className="mb-2">
                  <span className="badge bg-info me-2">Approuvé</span>
                  → Validé, visible par l'admin seulement
                </li>
                <li className="mb-2">
                  <span className="badge bg-success me-2">Publié</span>
                  → Visible sur le marketplace
                </li>
                <li className="mb-2">
                  <span className="badge bg-danger me-2">Rejeté</span>
                  → Refusé (ne sera pas publié)
                </li>
                <li>
                  <span className="badge bg-secondary me-2">En pause</span>
                  → Temporairement désactivé
                </li>
              </ul>
            </div>
            <div className="col-md-6">
              <h6 className="fw-semibold mb-3">Actions disponibles:</h6>
              <ul className="mb-0">
                <li className="mb-2">
                  <strong>Approuver</strong> : Valide l'annonce (statut: approved)
                </li>
                <li className="mb-2">
                  <strong>Publier</strong> : Rend l'annonce publique (statut: published)
                </li>
                <li className="mb-2">
                  <strong>Rejeter</strong> : Refuse l'annonce avec une raison (statut: rejected)
                </li>
                <li className="mb-2">
                  <strong>Supprimer</strong> : Supprime définitivement l'annonce
                </li>
                <li>
                  <strong>Mettre en pause</strong> : Désactive temporairement
                </li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* Pied de page */}
      <div className="mt-4 text-center text-muted small">
        <p className="mb-0">
          <i className="bi bi-shield-check me-1"></i>
          Panel d'administration • Sécurisé • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default DashboardAdminAds;