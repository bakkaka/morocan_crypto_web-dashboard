import React, { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { getUsers, promoteToAdmin, updateUser, deleteUser } from '../api/UserService';
import type { User } from '../types/User';

const UserList: React.FC = () => {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deleteLoading, setDeleteLoading] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    isVerified: false
  });
  const { isAdmin, user: currentUser } = useAuth();

  const loadUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers();
      console.log('📦 Données utilisateurs reçues:', data);

      const mappedUsers: User[] = data.users.map(u => ({
        id: u.id,
        email: u.email,
        fullName: u.fullName || 'Non renseigné',
        phone: u.phone || 'Non renseigné',
        roles: u.roles || ['ROLE_USER'],
        isVerified: u.isVerified !== undefined ? u.isVerified : true,
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt || new Date().toISOString(),
        walletAddress: u.walletAddress,
        reputation: u.reputation || 5.0,
        isActive: u.isActive !== undefined ? u.isActive : true
      }));

      setUsers(mappedUsers);
    } catch (error) {
      console.error('❌ Erreur lors du fetch des utilisateurs:', error);
      setError('Impossible de charger la liste des utilisateurs');
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  // SUPPRIMER UTILISATEUR - VERSION AMÉLIORÉE
  const handleDeleteUser = async (userId: number, userEmail: string) => {
    console.log('🗑️ Tentative de suppression user ID:', userId);
    
    // Empêcher la suppression de son propre compte
    if (userId === currentUser?.id) {
      alert('❌ Vous ne pouvez pas supprimer votre propre compte !');
      return;
    }

    // Vérifier si l'utilisateur a des rôles admin
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
      setDeleteLoading(userId);
      console.log('🔗 Appel API deleteUser pour ID:', userId);
      
      const result = await deleteUser(userId);
      console.log('✅ Réponse suppression:', result);
      
      alert('✅ Utilisateur supprimé avec succès !');
      
      // Recharger la liste
      await loadUsers();
      
    } catch (error: any) {
      console.error('❌ Erreur détaillée suppression:', error);
      
      let errorMessage = 'Erreur lors de la suppression';
      
      if (error.response) {
        // Erreur HTTP
        const status = error.response.status;
        const data = error.response.data;
        
        console.log('📊 Statut HTTP:', status, 'Data:', data);
        
        switch (status) {
          case 403:
            errorMessage = '❌ Permission refusée : Vous n\'avez pas les droits pour supprimer cet utilisateur';
            break;
          case 404:
            errorMessage = '❌ Utilisateur non trouvé';
            break;
          case 409:
            errorMessage = '❌ Impossible de supprimer : cet utilisateur a des données associées (transactions, contrats, etc.)';
            break;
          case 500:
            errorMessage = '❌ Erreur serveur interne';
            break;
          default:
            errorMessage = data?.message || `Erreur ${status} lors de la suppression`;
        }
      } else if (error.request) {
        // Pas de réponse du serveur
        errorMessage = '❌ Impossible de contacter le serveur. Vérifiez votre connexion.';
      } else {
        // Autre erreur
        errorMessage = error.message || 'Erreur inconnue lors de la suppression';
      }
      
      alert(errorMessage);
    } finally {
      setDeleteLoading(null);
    }
  };

  // PROMOUVOIR EN ADMIN
  const handlePromoteToAdmin = async (userId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir promouvoir cet utilisateur en administrateur ?')) {
      try {
        await promoteToAdmin(userId);
        alert('✅ Utilisateur promu administrateur avec succès !');
        loadUsers();
      } catch (error: any) {
        alert(`❌ Erreur: ${error.message || 'Erreur lors de la promotion'}`);
      }
    }
  };

  // RÉTROGRADER ADMIN
  const handleDemoteFromAdmin = async (userId: number) => {
    if (window.confirm('Êtes-vous sûr de vouloir retirer les droits administrateur ?')) {
      try {
        const userToUpdate = users.find(u => u.id === userId);
        if (!userToUpdate) return;

        const updatedRoles = userToUpdate.roles.filter(role => role !== 'ROLE_ADMIN');
        if (updatedRoles.length === 0) updatedRoles.push('ROLE_USER');

        await updateUser(userId, {
          roles: updatedRoles
        } as any);

        alert('✅ Droits administrateur retirés avec succès !');
        loadUsers();
      } catch (error: any) {
        alert(`❌ Erreur: ${error.message || 'Erreur lors de la rétrogradation'}`);
      }
    }
  };

  // OUVRIR MODAL MODIFICATION
  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setEditForm({
      fullName: user.fullName,
      email: user.email,
      phone: user.phone || '',
      isVerified: user.isVerified
    });
  };

  // MODIFIER UTILISATEUR
  const handleUpdateUser = async () => {
    if (!editingUser) return;

    try {
      await updateUser(editingUser.id, {
        fullName: editForm.fullName,
        email: editForm.email,
        phone: editForm.phone,
        isVerified: editForm.isVerified
      } as any);
      
      alert('✅ Utilisateur modifié avec succès !');
      setEditingUser(null);
      loadUsers();
    } catch (error: any) {
      alert(`❌ Erreur: ${error.message || 'Erreur lors de la modification'}`);
    }
  };

  // VERIFIER/DÉSACTIVER UTILISATEUR
  const handleToggleVerification = async (userId: number, currentStatus: boolean) => {
    try {
      await updateUser(userId, {
        isVerified: !currentStatus
      } as any);

      alert(`✅ Utilisateur ${!currentStatus ? 'vérifié' : 'désactivé'} avec succès !`);
      loadUsers();
    } catch (error: any) {
      alert(`❌ Erreur: ${error.message || 'Erreur lors de la modification'}`);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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

  return (
    <div className="container-fluid">
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h2>
            <i className="bi bi-people me-2"></i>
            Gestion des Utilisateurs
          </h2>
          <p className="text-muted mb-0">Administration complète des comptes utilisateurs</p>
        </div>
        <button className="btn btn-primary" onClick={loadUsers}>
          <i className="bi bi-arrow-clockwise me-2"></i>
          Actualiser
        </button>
      </div>

      {users.length === 0 ? (
        <div className="alert alert-info text-center">
          <i className="bi bi-info-circle me-2"></i>
          Aucun utilisateur trouvé dans la base de données
        </div>
      ) : (
        <>
          {/* Tableau des utilisateurs */}
          <div className="card shadow-sm">
            <div className="card-header bg-light d-flex justify-content-between align-items-center">
              <h5 className="card-title mb-0">
                <i className="bi bi-list-ul me-2"></i>
                Liste des Utilisateurs ({users.length})
              </h5>
              <div className="badge bg-primary fs-6">
                {users.filter(u => u.roles?.includes('ROLE_ADMIN')).length} Admin(s)
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover table-striped mb-0">
                  <thead className="table-dark">
                    <tr>
                      <th>#</th>
                      <th>Utilisateur</th>
                      <th>Contact</th>
                      <th>Rôle</th>
                      <th>Statut</th>
                      <th>Inscription</th>
                      {isAdmin && <th className="text-center">Actions</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {users.map((user, index) => (
                      <tr key={user.id} className={user.id === currentUser?.id ? 'table-warning' : ''}>
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
                              <small className="text-muted">Rating: {user.reputation} ⭐</small>
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
                            >
                              <i className={`bi ${user.isVerified ? 'bi-check-circle' : 'bi-clock'} me-1`}></i>
                              {user.isVerified ? 'Vérifié' : 'En attente'}
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
                        {isAdmin && (
                          <td>
                            <div className="d-flex gap-1 justify-content-center">
                              {/* Bouton Promouvoir/Rétrograder */}
                              {!user.roles?.includes('ROLE_ADMIN') ? (
                                <button 
                                  className="btn btn-warning btn-sm"
                                  onClick={() => handlePromoteToAdmin(user.id)}
                                  title="Promouvoir en Admin"
                                >
                                  <i className="bi bi-shield-plus"></i>
                                </button>
                              ) : (
                                <button 
                                  className="btn btn-secondary btn-sm"
                                  onClick={() => handleDemoteFromAdmin(user.id)}
                                  title="Retirer droits Admin"
                                >
                                  <i className="bi bi-shield-minus"></i>
                                </button>
                              )}

                              {/* Bouton Modifier */}
                              <button 
                                className="btn btn-info btn-sm"
                                onClick={() => handleEditUser(user)}
                                title="Modifier l'utilisateur"
                              >
                                <i className="bi bi-pencil"></i>
                              </button>

                              {/* Bouton Supprimer - Version améliorée */}
                              <button 
                                className="btn btn-danger btn-sm"
                                onClick={() => handleDeleteUser(user.id, user.email)}
                                title="Supprimer l'utilisateur"
                                disabled={user.id === currentUser?.id || deleteLoading === user.id}
                              >
                                {deleteLoading === user.id ? (
                                  <>
                                    <span className="spinner-border spinner-border-sm me-1" role="status"></span>
                                    <i className="bi bi-trash"></i>
                                  </>
                                ) : (
                                  <i className="bi bi-trash"></i>
                                )}
                              </button>
                            </div>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card-footer bg-light">
              <small className="text-muted">
                {users.length} utilisateur(s) au total • 
                Dernière mise à jour: {new Date().toLocaleTimeString('fr-FR')}
              </small>
            </div>
          </div>

          {/* Modal de modification */}
          {editingUser && (
            <div className="modal show d-block" style={{backgroundColor: 'rgba(0,0,0,0.5)'}}>
              <div className="modal-dialog">
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
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Email</label>
                      <input
                        type="email"
                        className="form-control"
                        value={editForm.email}
                        onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                      />
                    </div>
                    <div className="mb-3">
                      <label className="form-label">Téléphone</label>
                      <input
                        type="text"
                        className="form-control"
                        value={editForm.phone}
                        onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                      />
                    </div>
                    <div className="form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        checked={editForm.isVerified}
                        onChange={(e) => setEditForm({...editForm, isVerified: e.target.checked})}
                      />
                      <label className="form-check-label">Compte vérifié</label>
                    </div>
                  </div>
                  <div className="modal-footer">
                    <button 
                      type="button" 
                      className="btn btn-secondary" 
                      onClick={() => setEditingUser(null)}
                    >
                      Annuler
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-primary" 
                      onClick={handleUpdateUser}
                    >
                      <i className="bi bi-check me-1"></i>
                      Enregistrer
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {/* Statistiques */}
      {isAdmin && users.length > 0 && (
        <div className="row mt-4">
          <div className="col-md-3">
            <div className="card bg-primary text-white">
              <div className="card-body text-center">
                <h4>{users.filter(u => u.roles?.includes('ROLE_ADMIN')).length}</h4>
                <p className="mb-0">Administrateurs</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-success text-white">
              <div className="card-body text-center">
                <h4>{users.filter(u => u.isVerified).length}</h4>
                <p className="mb-0">Comptes vérifiés</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-info text-white">
              <div className="card-body text-center">
                <h4>{users.filter(u => u.walletAddress).length}</h4>
                <p className="mb-0">Wallets connectés</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card bg-warning text-dark">
              <div className="card-body text-center">
                <h4>{users.filter(u => !u.isVerified).length}</h4>
                <p className="mb-0">En attente</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserList;