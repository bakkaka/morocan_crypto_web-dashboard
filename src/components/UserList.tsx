// src/components/UserList.tsx - VERSION OPTIMISÉE
import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getUsers, 
  promoteToAdmin, 
  updateUser, 
  deleteUser,
  demoteFromAdmin 
} from '../api/UserService';
import type { User } from '../types/User';

interface UserStats {
  total: number;
  admins: number;
  verified: number;
  active: number;
}

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [actionLoading, setActionLoading] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    isVerified: false,
    isActive: true
  });
  const { isAdmin, user: currentUser } = useAuth();

  console.log('👤 [UserList] Current user:', currentUser?.email);
  console.log('👑 [UserList] Est admin?:', isAdmin);

  // Charger les utilisateurs
  const loadUsers = useCallback(async () => {
    if (!isAdmin) {
      console.log('🚫 [UserList] Pas admin, annulation chargement');
      return;
    }

    try {
      console.log('🔄 [UserList] Chargement des utilisateurs...');
      setLoading(true);
      setError(null);
      
      const data = await getUsers();
      console.log('📦 [UserList] Données reçues:', data);

      // Normaliser les utilisateurs
      const normalizedUsers: User[] = data.users.map(u => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName || 'Non renseigné',
        phone: u.phone || 'Non renseigné',
        roles: u.roles || ['ROLE_USER'],
        isVerified: u.isVerified !== undefined ? u.isVerified : true,
        reputation: u.reputation || 5.0,
        walletAddress: u.walletAddress || '',
        isActive: u.isActive !== undefined ? u.isActive : true,
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt || new Date().toISOString(),
      }));

      setUsers(normalizedUsers);
      console.log('✅ [UserList] Utilisateurs chargés:', normalizedUsers.length);
      
    } catch (error: any) {
      console.error('❌ [UserList] Erreur chargement utilisateurs:', error);
      setError(`Impossible de charger les utilisateurs: ${error.message || 'Erreur inconnue'}`);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin]);

  // Supprimer un utilisateur
  const handleDeleteUser = useCallback(async (userId: number, userEmail: string) => {
    console.log(`🗑️ [UserList] Tentative suppression user #${userId}`);
    
    // Empêcher la suppression de son propre compte
    if (userId === currentUser?.id) {
      alert('❌ Vous ne pouvez pas supprimer votre propre compte !');
      return;
    }

    // Vérifier si c'est le dernier admin
    const userToDelete = users.find(u => u.id === userId);
    if (userToDelete?.roles?.includes('ROLE_ADMIN')) {
      const adminCount = users.filter(u => u.roles?.includes('ROLE_ADMIN')).length;
      if (adminCount <= 1) {
        alert('❌ Impossible de supprimer le dernier administrateur !');
        return;
      }
    }

    if (!window.confirm(`⚠️ Êtes-vous sûr de vouloir supprimer l'utilisateur "${userEmail}" ?\n\nCette action est irréversible !`)) {
      return;
    }

    try {
      setActionLoading(userId);
      await deleteUser(userId);
      
      alert('✅ Utilisateur supprimé avec succès !');
      await loadUsers(); // Recharger la liste
      
    } catch (error: any) {
      console.error(`❌ [UserList] Erreur suppression user #${userId}:`, error);
      alert(`❌ Erreur: ${error.message || 'Erreur lors de la suppression'}`);
    } finally {
      setActionLoading(null);
    }
  }, [currentUser?.id, users, loadUsers]);

// Dans handlePromoteToAdmin
const handlePromoteToAdmin = async (userId: number) => {
  try {
    setActionLoading(userId);
    await promoteToAdmin(userId); // Retourne void
    
    // Mettre à jour localement comme DashboardAdminAds
    setUsers(prevUsers => 
      prevUsers.map(user => 
        user.id === userId ? {
          ...user,
          roles: [...(user.roles || ['ROLE_USER']), 'ROLE_ADMIN']
        } : user
      )
    );
    
    alert('✅ Utilisateur promu administrateur !');
  } catch (error) {
    // Vérifier le type d'erreur pour TypeScript
    if (error instanceof Error) {
      alert(`❌ Erreur: ${error.message}`);
    } else if (typeof error === 'string') {
      alert(`❌ Erreur: ${error}`);
    } else {
      alert('❌ Erreur inconnue lors de la promotion');
    }
  } finally {
    setActionLoading(null);
  }
};

  // Rétrograder admin
  const handleDemoteFromAdmin = useCallback(async (userId: number) => {
    if (!window.confirm('Êtes-vous sûr de vouloir retirer les droits administrateur ?')) {
      return;
    }

    try {
      setActionLoading(userId);
      await demoteFromAdmin(userId);
      
      alert('✅ Droits administrateur retirés avec succès !');
      await loadUsers(); // Recharger la liste
      
    } catch (error: any) {
      console.error(`❌ [UserList] Erreur rétrogradation user #${userId}:`, error);
      alert(`❌ Erreur: ${error.message || 'Erreur lors de la rétrogradation'}`);
    } finally {
      setActionLoading(null);
    }
  }, [loadUsers]);

  // Ouvrir modal modification
  const handleEditUser = useCallback((user: User) => {
    console.log(`✏️ [UserList] Ouverture modal modification user #${user.id}`);
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
       isVerified: user.isVerified !== undefined ? user.isVerified : false,
    isActive: user.isActive !== undefined ? user.isActive : true
       
    });
  }, []);

  // Modifier utilisateur
  const handleUpdateUser = useCallback(async () => {
    if (!editingUser) return;

    try {
      setActionLoading(editingUser.id);
      
      await updateUser(editingUser.id, {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone,
        isVerified: editForm.isVerified,
        isActive: editForm.isActive
      } as any);
      
      alert('✅ Utilisateur modifié avec succès !');
      setEditingUser(null);
      await loadUsers(); // Recharger la liste
      
    } catch (error: any) {
      console.error(`❌ [UserList] Erreur modification user #${editingUser.id}:`, error);
      alert(`❌ Erreur: ${error.message || 'Erreur lors de la modification'}`);
    } finally {
      setActionLoading(null);
    }
  }, [editingUser, editForm, loadUsers]);

  // Vérifier/désactiver utilisateur
  const handleToggleVerification = useCallback(async (userId: number, currentStatus: boolean) => {
    try {
      setActionLoading(userId);
      
      await updateUser(userId, {
        isVerified: !currentStatus
      } as any);

      alert(`✅ Utilisateur ${!currentStatus ? 'vérifié' : 'désactivé'} avec succès !`);
      await loadUsers(); // Recharger la liste
      
    } catch (error: any) {
      console.error(`❌ [UserList] Erreur toggle verification user #${userId}:`, error);
      alert(`❌ Erreur: ${error.message || 'Erreur lors de la modification'}`);
    } finally {
      setActionLoading(null);
    }
  }, [loadUsers]);

  // Calcul des statistiques
  const stats: UserStats = useMemo(() => ({
    total: users.length,
    admins: users.filter(u => u.roles?.includes('ROLE_ADMIN')).length,
    verified: users.filter(u => u.isVerified).length,
    active: users.filter(u => u.isActive).length
  }), [users]);

  console.log('📊 [UserList] Stats calculées:', stats);

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

  // Chargement initial
  useEffect(() => {
    console.log('🎬 [UserList] useEffect exécuté');
    if (isAdmin) {
      loadUsers();
    } else {
      setLoading(false);
    }
  }, [loadUsers, isAdmin]);

  // Vérification des permissions admin
  if (!isAdmin) {
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
              <li>Rôles: {currentUser?.roles?.join(', ') || 'Aucun'}</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  // État de chargement
  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <span className="ms-3">Chargement des utilisateurs...</span>
      </div>
    );
  }

  // Erreur de chargement
  if (error) {
    return (
      <div className="alert alert-danger" role="alert">
        <h4 className="alert-heading">Erreur</h4>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={loadUsers}>
          Réessayer
        </button>
      </div>
    );
  }

  console.log('🎨 [UserList] Rendu principal avec', users.length, 'utilisateurs');

  return (
    <div className="container-fluid">
      {/* Debug info (visible uniquement en développement) */}
      {import.meta.env.DEV && (
        <div className="alert alert-info mb-3">
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <strong>Debug Info:</strong>
              <span className="ms-2 badge bg-primary">{users.length} utilisateurs</span>
              <span className="ms-2 badge bg-danger">{stats.admins} admin(s)</span>
              <span className="ms-2 badge bg-success">{stats.verified} vérifié(s)</span>
              <span className="ms-2 badge bg-warning">{stats.total - stats.active} inactif(s)</span>
            </div>
            <div>
              <button 
                className="btn btn-sm btn-outline-success"
                onClick={loadUsers}
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
          <h2>
            <i className="bi bi-people me-2"></i>
            Gestion des Utilisateurs
          </h2>
          <p className="text-muted mb-0">Administration complète des comptes utilisateurs</p>
        </div>
        <div className="text-end">
          {stats.admins > 0 && (
            <div className="badge bg-danger fs-6 p-2 mb-2">
              <i className="bi bi-shield-check me-1"></i>
              {stats.admins} Administrateur(s)
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
          <div className="card border-danger h-100">
            <div className="card-body text-center p-3">
              <h3 className="text-danger mb-2">{stats.admins}</h3>
              <p className="mb-0 small fw-semibold">Administrateurs</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card border-success h-100">
            <div className="card-body text-center p-3">
              <h3 className="text-success mb-2">{stats.verified}</h3>
              <p className="mb-0 small fw-semibold">Vérifiés</p>
            </div>
          </div>
        </div>
        <div className="col-md-3 col-6">
          <div className="card border-warning h-100">
            <div className="card-body text-center p-3">
              <h3 className="text-warning mb-2">{stats.active}</h3>
              <p className="mb-0 small fw-semibold">Actifs</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des utilisateurs */}
      <div className="card shadow-sm border-0">
        <div className="card-header bg-light d-flex justify-content-between align-items-center py-3">
          <h5 className="card-title mb-0">
            <i className="bi bi-list-ul me-2"></i>
            Liste des Utilisateurs ({users.length})
          </h5>
          <div className="d-flex gap-2">
            <button 
              className="btn btn-outline-primary btn-sm" 
              onClick={loadUsers} 
              disabled={loading || actionLoading !== null}
            >
              <i className="bi bi-arrow-clockwise me-1"></i>
              {loading ? 'Chargement...' : 'Actualiser'}
            </button>
          </div>
        </div>
        
        <div className="card-body p-0">
          {users.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-people fs-1 text-muted mb-3"></i>
              <h4 className="text-muted">Aucun utilisateur trouvé</h4>
              <p className="text-muted">Les utilisateurs apparaîtront ici une fois inscrits.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th style={{ width: '50px' }}>#</th>
                    <th>Utilisateur</th>
                    <th>Contact</th>
                    <th>Rôle</th>
                    <th>Statut</th>
                    <th>Inscription</th>
                    <th className="text-center" style={{ width: '180px' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((user, index) => {
                    const isUserLoading = actionLoading === user.id;
                    const isCurrentUser = user.id === currentUser?.id;
                    const isAdminUser = user.roles?.includes('ROLE_ADMIN');
                    
                    return (
                      <tr key={user.id} className={isCurrentUser ? 'table-warning' : ''}>
                        <td className="fw-bold">{index + 1}</td>
                        <td>
                          <div className="d-flex align-items-center">
                            <div 
                              className="bg-primary text-white rounded-circle d-flex align-items-center justify-content-center me-2" 
                              style={{width: '40px', height: '40px', fontSize: '16px'}}
                            >
                              {user.fullName?.charAt(0)?.toUpperCase() || 'U'}
                            </div>
                            <div>
                              <div className="fw-bold">{user.fullName}</div>
                              <small className="text-muted">
                                Rating: {user.reputation} ⭐
                                {isCurrentUser && (
                                  <span className="badge bg-info ms-2">Vous</span>
                                )}
                              </small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="fw-bold">{user.email}</div>
                          <small className="text-muted">{user.phone}</small>
                          {user.walletAddress && (
                            <div>
                              <small className="text-muted">
                                <i className="bi bi-wallet2 me-1"></i>
                                {user.walletAddress.substring(0, 10)}...
                              </small>
                            </div>
                          )}
                        </td>
                        <td>
                          <div className="d-flex flex-wrap gap-1">
                            {user.roles?.map((role, roleIndex) => (
                              <span 
                                key={roleIndex}
                                className={`badge ${
                                  role === 'ROLE_ADMIN' ? 'bg-danger' : 
                                  role === 'ROLE_USER' ? 'bg-primary' : 'bg-secondary'
                                }`}
                              >
                                {role.replace('ROLE_', '')}
                              </span>
                            ))}
                          </div>
                        </td>
                        <td>
                          <div className="d-flex flex-column gap-1">
                            <button 
                              className={`btn btn-sm ${user.isVerified ? 'btn-success' : 'btn-warning'}`}
                              onClick={() => handleToggleVerification(user.id, user.isVerified)}
                              title={user.isVerified ? 'Désactiver la vérification' : 'Vérifier le compte'}
                              disabled={loading || isUserLoading || actionLoading !== null}
                            >
                              {isUserLoading ? (
                                <span className="spinner-border spinner-border-sm" role="status"></span>
                              ) : (
                                <>
                                  <i className={`bi ${user.isVerified ? 'bi-check-circle' : 'bi-clock'} me-1`}></i>
                                  {user.isVerified ? 'Vérifié' : 'En attente'}
                                </>
                              )}
                            </button>
                            <span className={`badge ${user.isActive ? 'bg-success' : 'bg-secondary'}`}>
                              {user.isActive ? 'Actif' : 'Inactif'}
                            </span>
                          </div>
                        </td>
                        <td>
                          <small className="text-muted">
                            {formatDate(user.createdAt)}
                          </small>
                        </td>
                        <td>
                          <div className="d-flex gap-1 justify-content-center">
                            {/* Bouton Promouvoir/Rétrograder */}
                            {!isAdminUser ? (
                              <button 
                                className="btn btn-warning btn-sm"
                                onClick={() => handlePromoteToAdmin(user.id)}
                                title="Promouvoir en Admin"
                                disabled={loading || isUserLoading || actionLoading !== null || isCurrentUser}
                              >
                                {isUserLoading ? (
                                  <span className="spinner-border spinner-border-sm" role="status"></span>
                                ) : (
                                  <i className="bi bi-shield-plus"></i>
                                )}
                              </button>
                            ) : (
                              <button 
                                className="btn btn-secondary btn-sm"
                                onClick={() => handleDemoteFromAdmin(user.id)}
                                title="Retirer droits Admin"
                                disabled={loading || isUserLoading || actionLoading !== null || isCurrentUser}
                              >
                                {isUserLoading ? (
                                  <span className="spinner-border spinner-border-sm" role="status"></span>
                                ) : (
                                  <i className="bi bi-shield-minus"></i>
                                )}
                              </button>
                            )}

                            {/* Bouton Modifier */}
                            <button 
                              className="btn btn-info btn-sm"
                              onClick={() => handleEditUser(user)}
                              title="Modifier l'utilisateur"
                              disabled={loading || isUserLoading || actionLoading !== null}
                            >
                              <i className="bi bi-pencil"></i>
                            </button>

                            {/* Bouton Supprimer */}
                            <button 
                              className="btn btn-outline-danger btn-sm"
                              onClick={() => handleDeleteUser(user.id, user.email)}
                              title="Supprimer l'utilisateur"
                              disabled={loading || isUserLoading || actionLoading !== null || isCurrentUser}
                            >
                              {isUserLoading ? (
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
              {users.length} utilisateur(s) • Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
            </small>
            <small className="text-primary fw-semibold">
              <i className="bi bi-shield-check me-1"></i>
              {stats.admins} administrateur(s)
            </small>
          </div>
        </div>
      </div>

      {/* Modal de modification */}
      {editingUser && (
        <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}} tabIndex={-1}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  <i className="bi bi-pencil me-2"></i>
                  Modifier l'utilisateur
                </h5>
                <button 
                  type="button" 
                  className="btn-close" 
                  onClick={() => setEditingUser(null)}
                  disabled={actionLoading === editingUser.id}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <label className="form-label">Nom complet</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.fullName}
                    onChange={(e) => setEditForm({...editForm, fullName: e.target.value})}
                    disabled={actionLoading === editingUser.id}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Email</label>
                  <input
                    type="email"
                    className="form-control"
                    value={editForm.email}
                    onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                    disabled={actionLoading === editingUser.id}
                  />
                </div>
                <div className="mb-3">
                  <label className="form-label">Téléphone</label>
                  <input
                    type="text"
                    className="form-control"
                    value={editForm.phone}
                    onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                    disabled={actionLoading === editingUser.id}
                  />
                </div>
                <div className="row">
                  <div className="col-6">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={editForm.isVerified}
                        onChange={(e) => setEditForm({...editForm, isVerified: e.target.checked})}
                        disabled={actionLoading === editingUser.id}
                      />
                      <label className="form-check-label">Compte vérifié</label>
                    </div>
                  </div>
                  <div className="col-6">
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={editForm.isActive}
                        onChange={(e) => setEditForm({...editForm, isActive: e.target.checked})}
                        disabled={actionLoading === editingUser.id}
                      />
                      <label className="form-check-label">Compte actif</label>
                    </div>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setEditingUser(null)}
                  disabled={actionLoading === editingUser.id}
                >
                  Annuler
                </button>
                <button 
                  type="button" 
                  className="btn btn-primary" 
                  onClick={handleUpdateUser}
                  disabled={actionLoading === editingUser.id}
                >
                  {actionLoading === editingUser.id ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                      Enregistrement...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check me-1"></i>
                      Enregistrer
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Guide d'administration */}
      <div className="card border-info mt-4">
        <div className="card-header bg-info text-white">
          <h5 className="card-title mb-0">
            <i className="bi bi-info-circle me-2"></i>
            Guide d'administration des utilisateurs
          </h5>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-6">
              <h6 className="fw-semibold mb-3">Rôles et permissions:</h6>
              <ul className="mb-0">
                <li className="mb-2">
                  <span className="badge bg-danger me-2">ADMIN</span>
                  → Accès complet à toutes les fonctionnalités
                </li>
                <li className="mb-2">
                  <span className="badge bg-primary me-2">USER</span>
                  → Utilisateur standard, peut créer des annonces
                </li>
                <li>
                  <span className="badge bg-secondary me-2">MODERATOR</span>
                  → Gestion des annonces (si configuré)
                </li>
              </ul>
            </div>
            <div className="col-md-6">
              <h6 className="fw-semibold mb-3">Actions disponibles:</h6>
              <ul className="mb-0">
                <li className="mb-2">
                  <strong>Promouvoir en Admin</strong> : Ajoute le rôle ROLE_ADMIN
                </li>
                <li className="mb-2">
                  <strong>Retirer Admin</strong> : Enlève le rôle ROLE_ADMIN
                </li>
                <li className="mb-2">
                  <strong>Vérifier/Désactiver</strong> : Change le statut de vérification
                </li>
                <li className="mb-2">
                  <strong>Modifier</strong> : Met à jour les informations
                </li>
                <li>
                  <strong>Supprimer</strong> : Supprime définitivement le compte
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
          Panel d'administration utilisateurs • Sécurisé • {new Date().getFullYear()}
        </p>
      </div>
    </div>
  );
};

export default UserList;