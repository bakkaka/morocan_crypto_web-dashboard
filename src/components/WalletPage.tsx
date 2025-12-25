// src/components/WalletPage.tsx
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

interface WalletBalance {
  currency: string;
  balance: number;
  available: number;
  locked: number;
}

interface WalletMovement {
  id: number;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  createdAt: string;
  status: string;
}

const WalletPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [balances, setBalances] = useState<WalletBalance[]>([]);
  const [movements, setMovements] = useState<WalletMovement[]>([]);
  const [totalBalance, setTotalBalance] = useState(0);

  useEffect(() => {
    loadWalletData();
  }, []);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      
      // Charger les soldes
      const balancesResponse = await api.get('/wallet/balances');
      const balancesData = extractHydraMember(balancesResponse.data);
      
      // Charger les mouvements récents
      const movementsResponse = await api.get('/wallet_movements?order[createdAt]=desc&itemsPerPage=20');
      const movementsData = extractHydraMember(movementsResponse.data);
      
      setBalances(balancesData);
      setMovements(movementsData);
      
      // Calculer le total
      const total = balancesData.reduce((sum: number, bal: WalletBalance) => sum + bal.balance, 0);
      setTotalBalance(total);
      
    } catch (error) {
      console.error('Erreur chargement portefeuille:', error);
    } finally {
      setLoading(false);
    }
  };

  const extractHydraMember = (data: any): any[] => {
    if (data?.['hydra:member']) return data['hydra:member'];
    if (Array.isArray(data)) return data;
    return [];
  };

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
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3">Chargement du portefeuille...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-12">
          <div className="card bg-primary text-white">
            <div className="card-body py-4">
              <div className="row align-items-center">
                <div className="col-md-8">
                  <h1 className="h3 mb-2">
                    <i className="bi bi-wallet2 me-2"></i>
                    Mon Portefeuille
                  </h1>
                  <p className="mb-0 opacity-90">Gérez vos soldes et transactions</p>
                </div>
                <div className="col-md-4 text-end">
                  <div className="bg-white text-primary rounded-3 p-3 d-inline-block">
                    <div className="fs-6 opacity-75">Solde Total</div>
                    <div className="h2 mb-0 fw-bold">{totalBalance.toFixed(2)} MAD</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-lg-8 mb-4">
          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Mes Soldes</h5>
            </div>
            <div className="card-body">
              {balances.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <i className="bi bi-wallet display-6"></i>
                  <p className="mt-3">Aucun solde disponible</p>
                </div>
              ) : (
                <div className="table-responsive">
                  <table className="table table-hover">
                    <thead>
                      <tr>
                        <th>Devise</th>
                        <th>Solde Total</th>
                        <th>Disponible</th>
                        <th>Verrouillé</th>
                      </tr>
                    </thead>
                    <tbody>
                      {balances.map((balance) => (
                        <tr key={balance.currency}>
                          <td>{balance.currency}</td>
                          <td>{balance.balance.toFixed(6)}</td>
                          <td>{balance.available.toFixed(6)}</td>
                          <td>{balance.locked.toFixed(6)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Mouvements Récents</h5>
            </div>
            <div className="card-body">
              {movements.length === 0 ? (
                <div className="text-center py-4 text-muted">
                  <p>Aucun mouvement récent</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {movements.slice(0, 5).map((movement) => (
                    <div key={movement.id} className="list-group-item border-0 px-0">
                      <div className="d-flex justify-content-between">
                        <div>
                          <small className="text-muted">{formatDate(movement.createdAt)}</small>
                          <p className="mb-1">{movement.description}</p>
                        </div>
                        <div className={`fw-bold ${movement.type === 'credit' ? 'text-success' : 'text-danger'}`}>
                          {movement.type === 'credit' ? '+' : '-'}{movement.amount}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="card">
            <div className="card-header">
              <h5 className="mb-0">Actions Rapides</h5>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <button className="btn btn-primary">
                  <i className="bi bi-plus-circle me-2"></i>
                  Déposer
                </button>
                <button className="btn btn-outline-primary">
                  <i className="bi bi-arrow-up-right me-2"></i>
                  Retirer
                </button>
                <button className="btn btn-outline-secondary">
                  <i className="bi bi-arrow-left-right me-2"></i>
                  Échanger
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WalletPage;