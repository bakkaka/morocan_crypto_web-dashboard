// src/components/DashboardAdminTransactions.tsx - ADMIN (selon votre pattern)
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import TransactionService, { 
  type Transaction,
  type TransactionStats,
  type TransactionFilters
} from '../api/TransactionService';

const DashboardAdminTransactions: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<TransactionStats | null>(null);
  const [filter, setFilter] = useState<'all' | 'pending' | 'paid' | 'completed' | 'cancelled' | 'released' | 'disputed'>('all');
  const [search, setSearch] = useState('');
  const [selectedTransactions, setSelectedTransactions] = useState<number[]>([]);
  const [bulkAction, setBulkAction] = useState('');
  const [showStats, setShowStats] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  
  const { isAdmin, user } = useAuth();

  // Charger toutes les transactions
  const loadTransactions = useCallback(async (page: number = 1) => {
    if (!isAdmin) return;

    try {
      setLoading(true);
      console.log(`📊 Chargement page ${page} des transactions...`);
      
      const filters: TransactionFilters = {
        page,
        itemsPerPage: 50,
        'order[createdAt]': 'desc'
      };
      
      if (filter !== 'all') {
        filters.status = filter === 'completed' ? 'released' : filter;
      }
      
      // Utiliser getTransactions qui existe dans votre service
      const response = await TransactionService.getTransactions(filters);
      const { transactions: allTransactions, total } = response;
      
      setTransactions(allTransactions);
      setTotalItems(total);
      setTotalPages(Math.ceil(total / 50));
      setCurrentPage(page);
      
      // Charger les statistiques
      const statsData = await TransactionService.getTransactionStats();
      setStats(statsData);
      
      console.log(`✅ ${allTransactions.length} transactions chargées (total: ${total})`);
      
    } catch (error) {
      console.error('❌ Erreur chargement transactions admin:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [isAdmin, filter]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Filtrer les transactions côté client pour la recherche
  const filteredTransactions = useMemo(() => {
    let result = transactions;
    
    if (search.trim()) {
      const term = search.toLowerCase();
      result = result.filter(t => 
        t.id.toString().includes(term) ||
        (typeof t.buyer === 'object' && t.buyer.fullName?.toLowerCase().includes(term)) ||
        (typeof t.seller === 'object' && t.seller.fullName?.toLowerCase().includes(term)) ||
        t.paymentReference?.toLowerCase().includes(term) ||
        (typeof t.ad === 'object' && 'id' in t.ad && `annonce #${t.ad.id}`.toLowerCase().includes(term))
      );
    }
    
    return result;
  }, [transactions, search]);

  // Formatage
  const formatDate = (dateString: string): string => {
    try {
      if (!dateString) return '--/--';
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '--/--';
    }
  };

  const formatAmount = (amount: number): string => {
    return amount.toLocaleString('fr-FR', {
      minimumFractionDigits: amount < 1 ? 4 : 2,
      maximumFractionDigits: amount < 1 ? 4 : 2
    });
  };

  const formatCurrency = (amount: number): string => {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'MAD'
    }).format(amount);
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { class: string; text: string; icon: string }> = {
      'pending': { class: 'bg-warning text-dark', text: 'En attente', icon: 'bi-clock' },
      'paid': { class: 'bg-info text-white', text: 'Payée', icon: 'bi-currency-dollar' },
      'released': { class: 'bg-primary text-white', text: 'Libérée', icon: 'bi-check-circle' },
      'completed': { class: 'bg-success text-white', text: 'Terminée', icon: 'bi-check-circle-fill' },
      'cancelled': { class: 'bg-danger text-white', text: 'Annulée', icon: 'bi-x-circle' },
      'disputed': { class: 'bg-dark text-white', text: 'Litige', icon: 'bi-exclamation-triangle' }
    };
    
    return configs[status] || configs.pending;
  };

  // Actions admin
  const handleMarkAsPaid = async (id: number) => {
    if (!window.confirm('Marquer cette transaction comme payée ?')) return;
    
    try {
      const paymentReference = window.prompt('Référence de paiement (optionnel):');
      await TransactionService.markAsPaid(id, paymentReference || undefined);
      await loadTransactions(currentPage);
      alert('✅ Transaction marquée comme payée');
    } catch (error) {
      alert('❌ Erreur lors du marquage');
    }
  };

  const handleReleaseFunds = async (id: number) => {
    if (!window.confirm('Libérer les fonds pour cette transaction ?')) return;
    
    try {
      await TransactionService.releaseFunds(id);
      await loadTransactions(currentPage);
      alert('✅ Fonds libérés');
    } catch (error) {
      alert('❌ Erreur lors de la libération');
    }
  };

  const handleCancelTransaction = async (id: number) => {
    if (!window.confirm('Annuler cette transaction ?')) return;
    
    try {
      await TransactionService.cancelTransaction(id);
      await loadTransactions(currentPage);
      alert('✅ Transaction annulée');
    } catch (error) {
      alert('❌ Erreur lors de l\'annulation');
    }
  };

  const handleViewDetails = async (id: number) => {
    try {
      const transaction = await TransactionService.getTransactionById(id);
      alert(`
        Détails Transaction #${id}:
        
        Acheteur: ${typeof transaction.buyer === 'object' ? transaction.buyer.fullName : 'N/A'}
        Vendeur: ${typeof transaction.seller === 'object' ? transaction.seller.fullName : 'N/A'}
        Montant USDT: ${formatAmount(transaction.usdtAmount)}
        Montant Fiat: ${formatCurrency(transaction.fiatAmount)}
        Statut: ${getStatusConfig(transaction.status).text}
        Créée: ${formatDate(transaction.createdAt)}
        ${transaction.paidAt ? `Payée: ${formatDate(transaction.paidAt)}` : ''}
        ${transaction.paymentReference ? `Référence: ${transaction.paymentReference}` : ''}
      `);
    } catch (error) {
      alert('❌ Erreur lors du chargement des détails');
    }
  };

  const handleBulkAction = async () => {
    if (!bulkAction || selectedTransactions.length === 0) {
      alert('Veuillez sélectionner une action et des transactions');
      return;
    }
    
    const actionText = bulkAction === 'mark_paid' ? 'Marquer comme payée' :
                      bulkAction === 'release' ? 'Libérer les fonds' :
                      bulkAction === 'cancel' ? 'Annuler' : bulkAction;
    
    const confirmed = window.confirm(
      `Appliquer l'action "${actionText}" à ${selectedTransactions.length} transaction(s) ?`
    );
    
    if (!confirmed) return;
    
    try {
      for (const id of selectedTransactions) {
        switch (bulkAction) {
          case 'mark_paid':
            await TransactionService.markAsPaid(id, `Bulk-${Date.now()}`);
            break;
          case 'release':
            await TransactionService.releaseFunds(id);
            break;
          case 'cancel':
            await TransactionService.cancelTransaction(id);
            break;
        }
      }
      
      await loadTransactions(currentPage);
      setSelectedTransactions([]);
      setBulkAction('');
      alert(`✅ Action appliquée à ${selectedTransactions.length} transaction(s)`);
    } catch (error) {
      alert('❌ Erreur lors de l\'action groupée');
    }
  };

  const toggleSelectAll = () => {
    if (selectedTransactions.length === filteredTransactions.length) {
      setSelectedTransactions([]);
    } else {
      setSelectedTransactions(filteredTransactions.map(t => t.id));
    }
  };

  const toggleSelectTransaction = (id: number) => {
    setSelectedTransactions(prev =>
      prev.includes(id)
        ? prev.filter(tId => tId !== id)
        : [...prev, id]
    );
  };

  const handlePageChange = (page: number) => {
    if (page >= 1 && page <= totalPages) {
      loadTransactions(page);
    }
  };

  const getUserName = (user: any): string => {
    if (typeof user === 'object') {
      return `${user.fullName || 'Utilisateur'} (#${user.id})`;
    }
    return `Utilisateur #${user}`;
  };

  const getAdInfo = (ad: any): string => {
    if (typeof ad === 'object' && 'id' in ad) {
      return `Annonce #${ad.id}`;
    }
    return 'Annonce';
  };

  if (!isAdmin) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-danger">
          <h4 className="alert-heading">
            <i className="bi bi-shield-exclamation me-2"></i>
            Accès refusé
          </h4>
          <p>Vous devez être administrateur pour accéder à cette page.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}}></div>
          <h4 className="mt-3">Chargement des transactions...</h4>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-1">
            <i className="bi bi-gear-fill me-2"></i>
            Administration des Transactions
          </h1>
          <p className="text-muted">Gestion de toutes les transactions de la plateforme</p>
        </div>
        
        <div className="d-flex gap-2">
          <button 
            className="btn btn-outline-secondary"
            onClick={() => loadTransactions(currentPage)}
          >
            <i className="bi bi-arrow-clockwise me-2"></i>
            Actualiser
          </button>
          
          <button 
            className={`btn ${showStats ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setShowStats(!showStats)}
          >
            <i className="bi bi-graph-up me-2"></i>
            {showStats ? 'Masquer stats' : 'Voir stats'}
          </button>
        </div>
      </div>

      {/* Statistiques */}
      {showStats && stats && (
        <div className="row mb-4 g-3">
          <div className="col-md-2 col-6">
            <div className="card border-primary">
              <div className="card-body text-center p-3">
                <div className="text-primary mb-2">
                  <i className="bi bi-receipt fs-1"></i>
                </div>
                <h3 className="mb-1">{stats.total}</h3>
                <small className="text-muted">Total</small>
              </div>
            </div>
          </div>
          
          <div className="col-md-2 col-6">
            <div className="card border-warning">
              <div className="card-body text-center p-3">
                <div className="text-warning mb-2">
                  <i className="bi bi-clock-history fs-1"></i>
                </div>
                <h3 className="mb-1">{stats.pending}</h3>
                <small className="text-muted">En attente</small>
              </div>
            </div>
          </div>
          
          <div className="col-md-2 col-6">
            <div className="card border-info">
              <div className="card-body text-center p-3">
                <div className="text-info mb-2">
                  <i className="bi bi-currency-dollar fs-1"></i>
                </div>
                <h3 className="mb-1">{stats.paid}</h3>
                <small className="text-muted">Payées</small>
              </div>
            </div>
          </div>
          
          <div className="col-md-2 col-6">
            <div className="card border-success">
              <div className="card-body text-center p-3">
                <div className="text-success mb-2">
                  <i className="bi bi-check-circle fs-1"></i>
                </div>
                <h3 className="mb-1">{stats.completed + stats.released}</h3>
                <small className="text-muted">Terminées</small>
              </div>
            </div>
          </div>
          
          <div className="col-md-2 col-6">
            <div className="card border-danger">
              <div className="card-body text-center p-3">
                <div className="text-danger mb-2">
                  <i className="bi bi-x-circle fs-1"></i>
                </div>
                <h3 className="mb-1">{stats.cancelled + stats.disputed}</h3>
                <small className="text-muted">Annulées/Litiges</small>
              </div>
            </div>
          </div>
          
          <div className="col-md-2 col-6">
            <div className="card border-dark">
              <div className="card-body text-center p-3">
                <div className="text-dark mb-2">
                  <i className="bi bi-cash-coin fs-1"></i>
                </div>
                <h5 className="mb-1">{formatAmount(stats.totalUsdt)} USDT</h5>
                <small className="text-muted">Volume total</small>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filtres et recherche */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-6">
              <div className="input-group">
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Rechercher par ID, nom, référence..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button 
                    className="btn btn-outline-secondary"
                    onClick={() => setSearch('')}
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>
            
            <div className="col-md-6">
              <div className="d-flex flex-wrap gap-2">
                <button 
                  className={`btn ${filter === 'all' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setFilter('all')}
                >
                  Toutes
                </button>
                <button 
                  className={`btn ${filter === 'pending' ? 'btn-warning' : 'btn-outline-warning'}`}
                  onClick={() => setFilter('pending')}
                >
                  En attente
                </button>
                <button 
                  className={`btn ${filter === 'paid' ? 'btn-info' : 'btn-outline-info'}`}
                  onClick={() => setFilter('paid')}
                >
                  Payées
                </button>
                <button 
                  className={`btn ${filter === 'completed' ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => setFilter('completed')}
                >
                  Terminées
                </button>
                <button 
                  className={`btn ${filter === 'cancelled' ? 'btn-danger' : 'btn-outline-danger'}`}
                  onClick={() => setFilter('cancelled')}
                >
                  Annulées
                </button>
              </div>
            </div>
          </div>
          
          {/* Actions groupées */}
          <div className="row mt-3">
            <div className="col-md-12">
              <div className="d-flex align-items-center gap-3 p-3 bg-light rounded">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    id="selectAll"
                    checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                    onChange={toggleSelectAll}
                    disabled={filteredTransactions.length === 0}
                  />
                  <label className="form-check-label" htmlFor="selectAll">
                    {selectedTransactions.length > 0 
                      ? `${selectedTransactions.length} sélectionné(s)` 
                      : 'Tout sélectionner'}
                  </label>
                </div>
                
                <select 
                  className="form-select form-select-sm" 
                  style={{width: '200px'}}
                  value={bulkAction}
                  onChange={(e) => setBulkAction(e.target.value)}
                >
                  <option value="">Action groupée...</option>
                  <option value="mark_paid">Marquer comme payée</option>
                  <option value="release">Libérer les fonds</option>
                  <option value="cancel">Annuler</option>
                </select>
                
                <button 
                  className="btn btn-sm btn-primary"
                  onClick={handleBulkAction}
                  disabled={!bulkAction || selectedTransactions.length === 0}
                >
                  <i className="bi bi-play-fill me-1"></i>
                  Appliquer
                </button>
                
                <div className="ms-auto">
                  <span className="badge bg-light text-dark">
                    {filteredTransactions.length} transaction(s) affichée(s)
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tableau des transactions */}
      <div className="card shadow-sm">
        <div className="card-body p-0">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-receipt display-1 text-muted mb-3"></i>
              <h3 className="text-muted mb-2">
                {search ? 'Aucun résultat trouvé' : 'Aucune transaction'}
              </h3>
              <p className="text-muted">
                {search ? 'Essayez avec d\'autres termes de recherche' : 'Aucune transaction disponible pour le moment'}
              </p>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover align-middle mb-0">
                  <thead className="table-light">
                    <tr>
                      <th style={{width: '50px'}}>
                        <input
                          type="checkbox"
                          className="form-check-input"
                          checked={selectedTransactions.length === filteredTransactions.length && filteredTransactions.length > 0}
                          onChange={toggleSelectAll}
                        />
                      </th>
                      <th>ID</th>
                      <th>Acheteur</th>
                      <th>Vendeur</th>
                      <th>Montants</th>
                      <th>Statut</th>
                      <th>Dates</th>
                      <th className="text-end">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredTransactions.map(transaction => {
                      const config = getStatusConfig(transaction.status);
                      const isSelected = selectedTransactions.includes(transaction.id);
                      
                      return (
                        <tr key={transaction.id} className={isSelected ? 'table-active' : ''}>
                          <td>
                            <input
                              type="checkbox"
                              className="form-check-input"
                              checked={isSelected}
                              onChange={() => toggleSelectTransaction(transaction.id)}
                            />
                          </td>
                          <td>
                            <div className="fw-bold">#{transaction.id}</div>
                            <small className="text-muted">
                              {getAdInfo(transaction.ad)}
                            </small>
                          </td>
                          
                          <td>
                            <div className="fw-bold">
                              {getUserName(transaction.buyer)}
                            </div>
                            <small className="text-muted">
                              {typeof transaction.buyer === 'object' && transaction.buyer.email}
                            </small>
                          </td>
                          
                          <td>
                            <div className="fw-bold">
                              {getUserName(transaction.seller)}
                            </div>
                            <small className="text-muted">
                              {typeof transaction.seller === 'object' && transaction.seller.email}
                            </small>
                          </td>
                          
                          <td>
                            <div className="fw-bold text-success">
                              {formatAmount(transaction.usdtAmount)} USDT
                            </div>
                            <small className="text-muted">
                              {formatCurrency(transaction.fiatAmount)}
                            </small>
                            {transaction.paymentReference && (
                              <div className="small mt-1">
                                <i className="bi bi-receipt me-1"></i>
                                {transaction.paymentReference}
                              </div>
                            )}
                          </td>
                          
                          <td>
                            <span className={`badge ${config.class}`}>
                              <i className={`bi ${config.icon} me-1`}></i>
                              {config.text}
                            </span>
                          </td>
                          
                          <td>
                            <div className="small">
                              <div className="text-muted">{formatDate(transaction.createdAt)}</div>
                              {transaction.paidAt && (
                                <div className="text-info mt-1">
                                  <i className="bi bi-check-circle me-1"></i>
                                  {formatDate(transaction.paidAt)}
                                </div>
                              )}
                              {transaction.expiresAt && new Date(transaction.expiresAt) > new Date() && (
                                <div className="text-warning mt-1">
                                  <i className="bi bi-clock me-1"></i>
                                  Expire: {formatDate(transaction.expiresAt)}
                                </div>
                              )}
                            </div>
                          </td>
                          
                          <td className="text-end">
                            <div className="d-flex gap-1 justify-content-end">
                              <button 
                                className="btn btn-outline-primary btn-sm"
                                onClick={() => handleViewDetails(transaction.id)}
                                title="Voir détails"
                              >
                                <i className="bi bi-eye"></i>
                              </button>
                              
                              {transaction.status === 'pending' && (
                                <button 
                                  className="btn btn-outline-info btn-sm"
                                  onClick={() => handleMarkAsPaid(transaction.id)}
                                  title="Marquer comme payée"
                                >
                                  <i className="bi bi-currency-dollar"></i>
                                </button>
                              )}
                              
                              {transaction.status === 'paid' && (
                                <button 
                                  className="btn btn-outline-success btn-sm"
                                  onClick={() => handleReleaseFunds(transaction.id)}
                                  title="Libérer les fonds"
                                >
                                  <i className="bi bi-unlock"></i>
                                </button>
                              )}
                              
                              {(transaction.status === 'pending' || transaction.status === 'paid') && (
                                <button 
                                  className="btn btn-outline-danger btn-sm"
                                  onClick={() => handleCancelTransaction(transaction.id)}
                                  title="Annuler"
                                >
                                  <i className="bi bi-x-circle"></i>
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {totalPages > 1 && (
                <div className="card-footer">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <span className="text-muted">
                        Affichage de {(currentPage - 1) * 50 + 1} à {Math.min(currentPage * 50, totalItems)} sur {totalItems}
                      </span>
                    </div>
                    
                    <nav>
                      <ul className="pagination mb-0">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                          <button 
                            className="page-link"
                            onClick={() => handlePageChange(currentPage - 1)}
                          >
                            <i className="bi bi-chevron-left"></i>
                          </button>
                        </li>
                        
                        {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                          let pageNum;
                          if (totalPages <= 5) {
                            pageNum = i + 1;
                          } else if (currentPage <= 3) {
                            pageNum = i + 1;
                          } else if (currentPage >= totalPages - 2) {
                            pageNum = totalPages - 4 + i;
                          } else {
                            pageNum = currentPage - 2 + i;
                          }
                          
                          return (
                            <li key={pageNum} className={`page-item ${currentPage === pageNum ? 'active' : ''}`}>
                              <button 
                                className="page-link"
                                onClick={() => handlePageChange(pageNum)}
                              >
                                {pageNum}
                              </button>
                            </li>
                          );
                        })}
                        
                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                          <button 
                            className="page-link"
                            onClick={() => handlePageChange(currentPage + 1)}
                          >
                            <i className="bi bi-chevron-right"></i>
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Informations */}
      <div className="alert alert-info mt-4">
        <h5 className="alert-heading">
          <i className="bi bi-info-circle me-2"></i>
          Informations
        </h5>
        <p className="mb-0">
          <strong>En attente</strong>: Transaction créée, en attente de paiement<br />
          <strong>Payée</strong>: Paiement confirmé, en attente de libération<br />
          <strong>Libérée</strong>: Fonds libérés, transaction terminée<br />
          <strong>Annulée</strong>: Transaction annulée par l'utilisateur ou le système<br />
          <strong>Litige</strong>: Litige ouvert, nécessite une intervention
        </p>
      </div>
    </div>
  );
};

export default DashboardAdminTransactions;