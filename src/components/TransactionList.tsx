// src/components/TransactionList.tsx - VERSION RÉELLE
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import TransactionService, { type Transaction } from '../api/TransactionService';

const TransactionList: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    completed: 0,
    cancelled: 0,
    disputed: 0
  });
  
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // Charger les transactions de l'utilisateur
  const loadTransactions = useCallback(async () => {
    if (!isAuthenticated || !user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      console.log(`🔄 Chargement transactions utilisateur #${user.id}...`);
      
      const userTransactions = await TransactionService.getUserTransactions(user.id);
      setTransactions(userTransactions);
      
      // Calculer les stats
      const statsData = {
        total: userTransactions.length,
        pending: userTransactions.filter(t => t.status === 'pending' || t.status === 'paid').length,
        completed: userTransactions.filter(t => t.status === 'completed' || t.status === 'released').length,
        cancelled: userTransactions.filter(t => t.status === 'cancelled').length,
        disputed: userTransactions.filter(t => t.status === 'disputed').length
      };
      
      setStats(statsData);
      console.log(`✅ ${userTransactions.length} transactions chargées`);
      
    } catch (error) {
      console.error('❌ Erreur chargement transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [user, isAuthenticated]);

  useEffect(() => {
    loadTransactions();
  }, [loadTransactions]);

  // Filtrer les transactions
  const filteredTransactions = useMemo(() => {
    if (filter === 'all') return transactions;
    
    const statusMap: Record<string, string[]> = {
      'pending': ['pending', 'paid'],
      'completed': ['completed', 'released'],
      'cancelled': ['cancelled'],
      'disputed': ['disputed']
    };
    
    const statuses = statusMap[filter] || [filter];
    return transactions.filter(t => statuses.includes(t.status));
  }, [transactions, filter]);

  // Formatage
  const formatDate = (dateString: string): string => {
    try {
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

  const getTransactionType = (transaction: Transaction): 'buy' | 'sell' => {
    if (typeof transaction.buyer === 'object' && typeof user === 'object') {
      return transaction.buyer.id === user.id ? 'buy' : 'sell';
    }
    return 'buy';
  };

  const getCounterparty = (transaction: Transaction): string => {
    const type = getTransactionType(transaction);
    
    if (type === 'buy') {
      return typeof transaction.seller === 'object' 
        ? transaction.seller.fullName 
        : 'Vendeur';
    } else {
      return typeof transaction.buyer === 'object' 
        ? transaction.buyer.fullName 
        : 'Acheteur';
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="container-fluid py-5">
        <div className="alert alert-warning text-center">
          <h4 className="alert-heading">
            <i className="bi bi-shield-lock me-2"></i>
            Accès non autorisé
          </h4>
          <p>Veuillez vous connecter pour voir vos transactions</p>
          <Link to="/login" className="btn btn-primary">
            Se connecter
          </Link>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="container-fluid py-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" style={{width: '3rem', height: '3rem'}}></div>
          <h4 className="mt-3">Chargement de vos transactions...</h4>
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
            <i className="bi bi-arrow-left-right me-2"></i>
            Mes Transactions
          </h1>
          <p className="text-muted">Historique de vos achats et ventes</p>
        </div>
        
        <div className="d-flex gap-2">
          <button className="btn btn-outline-secondary" onClick={loadTransactions}>
            <i className="bi bi-arrow-clockwise me-2"></i>
            Actualiser
          </button>
          <Link to="/dashboard/ads" className="btn btn-primary">
            <i className="bi bi-plus-circle me-2"></i>
            Nouvelle Annonce
          </Link>
        </div>
      </div>

      {/* Statistiques */}
      <div className="row mb-4 g-3">
        <div className="col-md-3 col-6">
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
        
        <div className="col-md-3 col-6">
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
        
        <div className="col-md-3 col-6">
          <div className="card border-success">
            <div className="card-body text-center p-3">
              <div className="text-success mb-2">
                <i className="bi bi-check-circle fs-1"></i>
              </div>
              <h3 className="mb-1">{stats.completed}</h3>
              <small className="text-muted">Terminées</small>
            </div>
          </div>
        </div>
        
        <div className="col-md-3 col-6">
          <div className="card border-danger">
            <div className="card-body text-center p-3">
              <div className="text-danger mb-2">
                <i className="bi bi-x-circle fs-1"></i>
              </div>
              <h3 className="mb-1">{stats.cancelled + stats.disputed}</h3>
              <small className="text-muted">Problèmes</small>
            </div>
          </div>
        </div>
      </div>

      {/* Filtres */}
      <div className="card shadow-sm mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-8">
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
                  <i className="bi bi-clock me-1"></i>
                  En attente
                </button>
                <button 
                  className={`btn ${filter === 'completed' ? 'btn-success' : 'btn-outline-success'}`}
                  onClick={() => setFilter('completed')}
                >
                  <i className="bi bi-check-circle me-1"></i>
                  Terminées
                </button>
                <button 
                  className={`btn ${filter === 'cancelled' ? 'btn-danger' : 'btn-outline-danger'}`}
                  onClick={() => setFilter('cancelled')}
                >
                  <i className="bi bi-x-circle me-1"></i>
                  Annulées
                </button>
              </div>
            </div>
            
            <div className="col-md-4 text-end">
              <div className="bg-light p-3 rounded">
                <small className="text-muted d-block">Transactions affichées</small>
                <strong className="text-primary fs-5">{filteredTransactions.length}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des transactions */}
      {filteredTransactions.length === 0 ? (
        <div className="card shadow-sm">
          <div className="card-body text-center py-5">
            <i className="bi bi-receipt display-1 text-muted mb-3"></i>
            <h3 className="text-muted mb-2">
              {filter === 'all' ? 'Aucune transaction' : `Aucune transaction ${filter}`}
            </h3>
            <p className="text-muted mb-4">
              {filter === 'all' 
                ? 'Vous n\'avez pas encore effectué de transactions'
                : `Vous n\'avez pas de transactions avec le statut "${filter}"`
              }
            </p>
            <Link to="/market" className="btn btn-primary">
              <i className="bi bi-shop me-2"></i>
              Voir le Marketplace
            </Link>
          </div>
        </div>
      ) : (
        <div className="card shadow-sm">
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-hover align-middle mb-0">
                <thead className="table-light">
                  <tr>
                    <th>ID</th>
                    <th>Type</th>
                    <th>Montant</th>
                    <th>Contrepartie</th>
                    <th>Statut</th>
                    <th>Date</th>
                    <th className="text-end">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTransactions.map(transaction => {
                    const type = getTransactionType(transaction);
                    const config = getStatusConfig(transaction.status);
                    const counterparty = getCounterparty(transaction);
                    
                    return (
                      <tr key={transaction.id}>
                        <td>
                          <div className="fw-bold">#{transaction.id}</div>
                          <small className="text-muted">
                            Ref: {transaction.paymentReference || '--'}
                          </small>
                        </td>
                        
                        <td>
                          <div className="d-flex align-items-center">
                            <i className={`bi ${
                              type === 'buy' ? 'bi-arrow-down-circle text-success' : 'bi-arrow-up-circle text-danger'
                            } me-2`}></i>
                            <span className="fw-bold text-capitalize">
                              {type === 'buy' ? 'Achat' : 'Vente'}
                            </span>
                          </div>
                        </td>
                        
                        <td>
                          <div className="fw-bold">{formatAmount(transaction.usdtAmount)} USDT</div>
                          <small className="text-muted">
                            {formatAmount(transaction.fiatAmount)} MAD
                          </small>
                        </td>
                        
                        <td>
                          <div className="fw-bold">{counterparty}</div>
                          <small className="text-muted">
                            {typeof transaction.ad === 'object' 
                              ? `Annonce #${transaction.ad.id}`
                              : '--'
                            }
                          </small>
                        </td>
                        
                        <td>
                          <span className={`badge ${config.class}`}>
                            <i className={`bi ${config.icon} me-1`}></i>
                            {config.text}
                          </span>
                          
                          {transaction.expiresAt && new Date(transaction.expiresAt) > new Date() && (
                            <div className="small text-muted mt-1">
                              <i className="bi bi-clock me-1"></i>
                              Expire: {formatDate(transaction.expiresAt)}
                            </div>
                          )}
                        </td>
                        
                        <td>
                          <div className="small">
                            <div className="fw-semibold">Créée:</div>
                            <div className="text-muted">{formatDate(transaction.createdAt)}</div>
                            
                            {transaction.paidAt && (
                              <>
                                <div className="fw-semibold mt-1">Payée:</div>
                                <div className="text-muted">{formatDate(transaction.paidAt)}</div>
                              </>
                            )}
                          </div>
                        </td>
                        
                        <td className="text-end">
                          <div className="d-flex gap-1 justify-content-end">
                            <button 
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => navigate(`/dashboard/transactions/${transaction.id}`)}
                            >
                              <i className="bi bi-eye"></i>
                            </button>
                            
                            {(transaction.status === 'pending' || transaction.status === 'paid') && (
                              <button 
                                className="btn btn-outline-success btn-sm"
                                onClick={() => navigate(`/dashboard/messages`)}
                              >
                                <i className="bi bi-chat"></i>
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
          </div>
        </div>
      )}
    </div>
  );
};

export default TransactionList;