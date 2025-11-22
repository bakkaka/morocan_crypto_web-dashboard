// src/components/TransactionList.tsx
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';

interface Transaction {
  id: number;
  amount: number;
  price: number;
  status: 'pending' | 'completed' | 'cancelled' | 'disputed';
  type: 'buy' | 'sell';
  createdAt: string;
  ad: {
    id: number;
    title: string;
  };
  buyer: {
    id: number;
    fullName: string;
  };
  seller: {
    id: number;
    fullName: string;
  };
}

const TransactionList: React.FC = () => {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');

  // Données mockées
  const mockTransactions: Transaction[] = [
    {
      id: 1,
      amount: 500,
      price: 10.5,
      status: 'completed',
      type: 'buy',
      createdAt: '2024-01-15T10:30:00Z',
      ad: { id: 1, title: 'Achat USDT par virement' },
      buyer: { id: 1, fullName: 'Vous' },
      seller: { id: 2, fullName: 'Ahmed Benali' }
    },
    {
      id: 2,
      amount: 1000,
      price: 10.3,
      status: 'pending',
      type: 'sell',
      createdAt: '2024-01-14T15:20:00Z',
      ad: { id: 2, title: 'Vente USDT cash' },
      buyer: { id: 3, fullName: 'Fatima Zahra' },
      seller: { id: 1, fullName: 'Vous' }
    },
    {
      id: 3,
      amount: 200,
      price: 10.6,
      status: 'cancelled',
      type: 'buy',
      createdAt: '2024-01-13T09:15:00Z',
      ad: { id: 3, title: 'Achat USDT PayPal' },
      buyer: { id: 1, fullName: 'Vous' },
      seller: { id: 4, fullName: 'Karim Alami' }
    }
  ];

  useEffect(() => {
    // Simulation chargement API
    setTimeout(() => {
      setTransactions(mockTransactions);
      setLoading(false);
    }, 1000);
  }, []);

  const filteredTransactions = transactions.filter(transaction => {
    if (filter === 'all') return true;
    return transaction.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { class: 'bg-warning', text: 'En attente' },
      completed: { class: 'bg-success', text: 'Terminée' },
      cancelled: { class: 'bg-danger', text: 'Annulée' },
      disputed: { class: 'bg-danger', text: 'Litige' }
    };
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending;
    return <span className={`badge ${config.class}`}>{config.text}</span>;
  };

  const getTypeIcon = (type: string) => {
    return type === 'buy' 
      ? <i className="bi bi-arrow-down-circle text-success me-1"></i>
      : <i className="bi bi-arrow-up-circle text-danger me-1"></i>;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center py-5">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <span className="ms-2">Chargement des transactions...</span>
      </div>
    );
  }

  return (
    <div>
      {/* En-tête */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h2 mb-1">Mes Transactions</h1>
          <p className="text-muted">Historique de vos achats et ventes</p>
        </div>
      </div>

      {/* Filtres */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3 align-items-center">
            <div className="col-md-6">
              <label className="form-label">Filtrer par statut :</label>
              <select 
                className="form-select"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
              >
                <option value="all">Toutes les transactions</option>
                <option value="pending">En attente</option>
                <option value="completed">Terminées</option>
                <option value="cancelled">Annulées</option>
              </select>
            </div>
            <div className="col-md-6">
              <div className="d-flex justify-content-end">
                <div className="bg-light p-3 rounded">
                  <small className="text-muted d-block">Total des transactions :</small>
                  <strong className="text-primary fs-5">{transactions.length}</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Liste des transactions */}
      <div className="card">
        <div className="card-body p-0">
          {filteredTransactions.length === 0 ? (
            <div className="text-center py-5">
              <i className="bi bi-receipt display-1 text-muted"></i>
              <h3 className="mt-3">Aucune transaction</h3>
              <p className="text-muted">Vous n'avez pas encore de transactions</p>
              <Link to="/dashboard/ads" className="btn btn-primary">
                Voir les annonces
              </Link>
            </div>
          ) : (
            <div className="list-group list-group-flush">
              {filteredTransactions.map(transaction => (
                <div key={transaction.id} className="list-group-item">
                  <div className="row align-items-center">
                    <div className="col-md-2">
                      <div className="d-flex align-items-center">
                        {getTypeIcon(transaction.type)}
                        <span className="fw-bold text-capitalize">
                          {transaction.type === 'buy' ? 'Achat' : 'Vente'}
                        </span>
                      </div>
                    </div>
                    
                    <div className="col-md-2">
                      <div className="fw-bold text-primary">{transaction.amount} USDT</div>
                      <small className="text-muted">{transaction.price} MAD/USDT</small>
                    </div>
                    
                    <div className="col-md-2">
                      <div className="fw-bold">{transaction.amount * transaction.price} MAD</div>
                      <small className="text-muted">Total</small>
                    </div>
                    
                    <div className="col-md-2">
                      {transaction.type === 'buy' ? (
                        <div>
                          <div className="small fw-bold">Vendeur</div>
                          <div>{transaction.seller.fullName}</div>
                        </div>
                      ) : (
                        <div>
                          <div className="small fw-bold">Acheteur</div>
                          <div>{transaction.buyer.fullName}</div>
                        </div>
                      )}
                    </div>
                    
                    <div className="col-md-2">
                      {getStatusBadge(transaction.status)}
                    </div>
                    
                    <div className="col-md-2 text-end">
                      <small className="text-muted d-block">
                        {new Date(transaction.createdAt).toLocaleDateString('fr-FR')}
                      </small>
                      <button className="btn btn-outline-primary btn-sm mt-1">
                        Détails
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Statistiques */}
      <div className="row mt-4">
        <div className="col-md-3">
          <div className="card bg-primary text-white">
            <div className="card-body text-center">
              <h4 className="mb-1">
                {transactions.filter(t => t.status === 'completed').length}
              </h4>
              <small>Transactions terminées</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-warning text-dark">
            <div className="card-body text-center">
              <h4 className="mb-1">
                {transactions.filter(t => t.status === 'pending').length}
              </h4>
              <small>En attente</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-success text-white">
            <div className="card-body text-center">
              <h4 className="mb-1">
                {transactions.filter(t => t.type === 'buy').length}
              </h4>
              <small>Achats</small>
            </div>
          </div>
        </div>
        <div className="col-md-3">
          <div className="card bg-info text-white">
            <div className="card-body text-center">
              <h4 className="mb-1">
                {transactions.filter(t => t.type === 'sell').length}
              </h4>
              <small>Ventes</small>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TransactionList;