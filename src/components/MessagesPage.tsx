// src/components/MessagesPage.tsx - VERSION CORRIGÉE ET OPTIMISÉE
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import TransactionService from '../api/TransactionService';

// ============================================
// INTERFACES
// ============================================

interface User {
  id: number;
  fullName: string;
  email: string;
  avatar?: string;
}

interface Transaction {
  id: number;
  usdtAmount: number;
  fiatAmount: number;
  status: 'pending' | 'completed' | 'cancelled' | 'disputed' | 'paid' | 'released';
  buyer: User;
  seller: User;
  ad: {
    id: number;
    type: 'buy' | 'sell';
    currency: {
      code: string;
    };
  };
  createdAt: string;
  paymentReference?: string;
}

interface Message {
  id: number;
  sender: User;
  message: string;
  createdAt: string;
  transaction: {
    id: number;
  };
  readAt?: string;
}

// ============================================
// COMPOSANT PRINCIPAL
// ============================================

const MessagesPage: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingMessages, setLoadingMessages] = useState<boolean>(false);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState<string>('');
  const [sending, setSending] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [autoRefresh, setAutoRefresh] = useState<boolean>(true);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // ============================================
  // INITIALISATION
  // ============================================

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/login', { state: { from: '/dashboard/messages' } });
      return;
    }

    const state = location.state as any;
    if (state?.transactionId) {
      setSelectedTransaction(state.transactionId);
    }

    loadTransactions();

    const refreshInterval = setInterval(() => {
      if (autoRefresh && user) {
        refreshData();
      }
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [user, isAuthenticated, navigate, location, autoRefresh]);

  useEffect(() => {
    if (selectedTransaction) {
      loadMessages(selectedTransaction);
    } else {
      setMessages([]);
    }
  }, [selectedTransaction]);

  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  // ============================================
  // FONCTIONS PRINCIPALES
  // ============================================

  const loadTransactions = async () => {
    if (!user) return;

    try {
      setLoading(true);
      setError(null);
      
      console.log('📥 Chargement des transactions pour utilisateur:', user.id);
      
      const transactionsData = await TransactionService.getUserTransactions(user.id);
      
      console.log(`📊 ${transactionsData.length} transactions chargées`);
      
      const formattedTransactions: Transaction[] = transactionsData.map((tx: any) => {
        const extractUser = (userData: any, defaultName: string): User => {
          if (!userData) {
            return { id: 0, fullName: defaultName, email: '' };
          }
          
          if (typeof userData === 'object') {
            return {
              id: userData.id || 0,
              fullName: userData.fullName || userData.full_name || userData.name || defaultName,
              email: userData.email || '',
              avatar: userData.avatar
            };
          }
          
          if (typeof userData === 'string') {
            const idMatch = userData.match(/\/(\d+)$/);
            return {
              id: idMatch ? parseInt(idMatch[1]) : 0,
              fullName: defaultName,
              email: ''
            };
          }
          
          return { id: 0, fullName: defaultName, email: '' };
        };

        return {
          id: tx.id,
          usdtAmount: tx.usdtAmount || 0,
          fiatAmount: tx.fiatAmount || 0,
          status: tx.status || 'pending',
          buyer: extractUser(tx.buyer, 'Acheteur'),
          seller: extractUser(tx.seller, 'Vendeur'),
          ad: {
            id: tx.ad?.id || 0,
            type: tx.ad?.type || 'buy',
            currency: {
              code: tx.ad?.currency?.code || 'USDT'
            }
          },
          createdAt: tx.createdAt || tx.created_at || new Date().toISOString(),
          paymentReference: tx.paymentReference
        };
      });

      setTransactions(formattedTransactions);

      if (!selectedTransaction && formattedTransactions.length > 0) {
        setSelectedTransaction(formattedTransactions[0].id);
      }

    } catch (error: any) {
      console.error('❌ Erreur chargement transactions:', error);
      setError('Impossible de charger vos conversations');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (transactionId: number) => {
    if (!transactionId) return;

    try {
      setLoadingMessages(true);
      
      console.log(`📨 Chargement messages transaction ${transactionId}`);
      
      const messagesData = await TransactionService.getTransactionMessages(transactionId);
      
      console.log(`💬 ${messagesData.length} messages chargés`);
      
      const formattedMessages: Message[] = messagesData.map((msg: any) => {
        const extractUser = (userData: any): User => {
          if (!userData) {
            return { id: 0, fullName: 'Expéditeur', email: '' };
          }
          
          if (typeof userData === 'object') {
            return {
              id: userData.id || 0,
              fullName: userData.fullName || userData.full_name || userData.name || 'Expéditeur',
              email: userData.email || '',
              avatar: userData.avatar
            };
          }
          
          return { id: 0, fullName: 'Expéditeur', email: '' };
        };

        return {
          id: msg.id,
          sender: extractUser(msg.sender),
          message: msg.message || '(Message vide)',
          createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
          transaction: { id: transactionId },
          readAt: msg.readAt
        };
      });

      formattedMessages.sort((a, b) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      setMessages(formattedMessages);

    } catch (error: any) {
      console.error(`❌ Erreur chargement messages:`, error);
      setMessages([]);
    } finally {
      setLoadingMessages(false);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTransaction || !user || sending) return;

    try {
      setSending(true);
      
      const tempMessage: Message = {
        id: Date.now(),
        sender: {
          id: user.id,
          fullName: user.fullName || 'Vous',
          email: user.email || '',
          //avatar: user.avatar
        },
        message: newMessage.trim(),
        createdAt: new Date().toISOString(),
        transaction: { id: selectedTransaction }
      };

      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');

      await TransactionService.sendMessage(selectedTransaction, user.id, newMessage.trim());
      
      setTimeout(() => {
        loadMessages(selectedTransaction);
      }, 500);

    } catch (error: any) {
      console.error('❌ Erreur envoi message:', error);
      
      setMessages(prev => prev.filter(msg => msg.id !== Date.now()));
      
      alert('Erreur lors de l\'envoi du message. Veuillez réessayer.');
    } finally {
      setSending(false);
    }
  };

  // ============================================
  // FONCTIONS UTILITAIRES
  // ============================================

  const formatTime = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '--:--';
    }
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      
      if (date.toDateString() === today.toDateString()) {
        return 'Aujourd\'hui';
      } else if (date.toDateString() === yesterday.toDateString()) {
        return 'Hier';
      } else {
        return date.toLocaleDateString('fr-FR', {
          day: 'numeric',
          month: 'short'
        });
      }
    } catch {
      return '--/--';
    }
  };

  const getOtherUser = (transaction: Transaction): User => {
    if (!user) return { id: 0, fullName: 'Inconnu', email: '' };
    
    if (transaction.buyer.id === user.id) {
      return transaction.seller;
    }
    return transaction.buyer;
  };

  const getTransactionStatusBadge = (status: string) => {
    switch (status) {
      case 'completed': return { class: 'bg-success', text: 'Terminé' };
      case 'pending': return { class: 'bg-warning text-dark', text: 'En attente' };
      case 'paid': return { class: 'bg-info', text: 'Payé' };
      case 'released': return { class: 'bg-primary', text: 'Libéré' };
      case 'cancelled': return { class: 'bg-danger', text: 'Annulé' };
      case 'disputed': return { class: 'bg-secondary', text: 'En litige' };
      default: return { class: 'bg-info', text: status };
    }
  };

  const handleRefresh = async () => {
    if (user) {
      await loadTransactions();
      if (selectedTransaction) {
        await loadMessages(selectedTransaction);
      }
    }
  };

  const refreshData = async () => {
    if (user && selectedTransaction) {
      await loadMessages(selectedTransaction);
    }
  };

  const handleGoToMarketplace = () => {
    navigate('/market');
  };

  const handleNewTransaction = () => {
    navigate('/market');
  };

  // ============================================
  // RENDU
  // ============================================

  if (!isAuthenticated) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
          <p className="mt-3">Redirection vers la connexion...</p>
        </div>
      </div>
    );
  }

  const selectedTx = transactions.find(tx => tx.id === selectedTransaction);
  const otherUser = selectedTx ? getOtherUser(selectedTx) : null;

  return (
    <div className="container-fluid py-4">
      <div className="row g-4">
        {/* Colonne gauche - Liste des conversations */}
        <div className="col-lg-4">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white border-bottom">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-chat-left-text me-2"></i>
                  Conversations
                </h5>
                <div className="d-flex gap-1">
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    onClick={handleRefresh}
                    title="Actualiser"
                    disabled={loading}
                  >
                    <i className="bi bi-arrow-clockwise"></i>
                  </button>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={handleNewTransaction}
                  >
                    <i className="bi bi-plus"></i>
                  </button>
                </div>
              </div>
            </div>
            
            <div className="card-body p-0" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              {loading ? (
                <div className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-primary"></div>
                  <p className="mt-2 small text-muted">Chargement des conversations...</p>
                </div>
              ) : error ? (
                <div className="text-center py-5">
                  <div className="text-danger mb-2">
                    <i className="bi bi-exclamation-triangle fs-4"></i>
                  </div>
                  <p className="text-muted small">{error}</p>
                  <button 
                    className="btn btn-sm btn-outline-primary"
                    onClick={handleRefresh}
                  >
                    Réessayer
                  </button>
                </div>
              ) : transactions.length === 0 ? (
                <div className="text-center py-5">
                  <div className="text-muted mb-3">
                    <i className="bi bi-chat-dots display-6"></i>
                  </div>
                  <h6 className="text-dark mb-2">Aucune conversation</h6>
                  <p className="text-muted small mb-3">Commencez une transaction pour démarrer une conversation</p>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={handleGoToMarketplace}
                  >
                    <i className="bi bi-shop me-1"></i>
                    Explorer le marketplace
                  </button>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {transactions.map(tx => {
                    const otherUser = getOtherUser(tx);
                    const isActive = selectedTransaction === tx.id;
                    const statusBadge = getTransactionStatusBadge(tx.status);
                    
                    return (
                      <button
                        key={tx.id}
                        className={`list-group-item list-group-item-action border-0 py-3 ${isActive ? 'bg-light' : ''}`}
                        onClick={() => setSelectedTransaction(tx.id)}
                      >
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0">
                            <div className="position-relative">
                              <div className="rounded-circle bg-light p-2">
                                <i className="bi bi-person"></i>
                              </div>
                              <span className={`position-absolute top-0 start-100 translate-middle badge rounded-pill ${statusBadge.class}`} style={{fontSize: '0.6em'}}>
                                {statusBadge.text.charAt(0)}
                              </span>
                            </div>
                          </div>
                          <div className="flex-grow-1 ms-3 overflow-hidden">
                            <div className="d-flex justify-content-between align-items-start">
                              <div className="text-truncate">
                                <h6 className="mb-1 text-truncate">{otherUser.fullName}</h6>
                                <p className="small text-muted mb-1 text-truncate">
                                  {tx.ad.type === 'buy' ? 'Achat' : 'Vente'} de {tx.usdtAmount} {tx.ad.currency.code}
                                </p>
                                <p className="small text-muted mb-0">
                                  {tx.fiatAmount.toLocaleString('fr-MA')} MAD
                                </p>
                              </div>
                              <div className="text-end flex-shrink-0">
                                <small className="text-muted d-block">
                                  {formatDate(tx.createdAt)}
                                </small>
                              </div>
                            </div>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
            
            <div className="card-footer bg-white border-top py-2">
              <div className="form-check form-switch">
                <input
                  className="form-check-input"
                  type="checkbox"
                  id="autoRefreshSwitch"
                  checked={autoRefresh}
                  onChange={(e) => setAutoRefresh(e.target.checked)}
                />
                <label className="form-check-label small text-muted" htmlFor="autoRefreshSwitch">
                  Auto-refresh (30s)
                </label>
              </div>
            </div>
          </div>
        </div>

        {/* Colonne droite - Messages */}
        <div className="col-lg-8">
          <div className="card shadow-sm h-100 d-flex flex-column">
            <div className="card-header bg-white border-bottom">
              {selectedTx && otherUser ? (
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-1">
                      <i className="bi bi-chat-dots me-2"></i>
                      {otherUser.fullName}
                    </h5>
                    <div className="small text-muted">
                      Transaction #{selectedTx.id} • 
                      {selectedTx.ad.type === 'buy' ? 'Achat' : 'Vente'} de {selectedTx.usdtAmount} {selectedTx.ad.currency.code} • 
                      {selectedTx.fiatAmount.toLocaleString('fr-MA')} MAD
                    </div>
                  </div>
                  <div className="d-flex gap-2 align-items-center">
                    <span className={`badge ${getTransactionStatusBadge(selectedTx.status).class}`}>
                      {getTransactionStatusBadge(selectedTx.status).text}
                    </span>
                    <button 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={handleRefresh}
                      title="Actualiser"
                      disabled={loadingMessages}
                    >
                      <i className="bi bi-arrow-clockwise"></i>
                    </button>
                  </div>
                </div>
              ) : (
                <h5 className="mb-0">
                  <i className="bi bi-chat-left me-2"></i>
                  Sélectionnez une conversation
                </h5>
              )}
            </div>
            
            {/* Zone des messages */}
            <div 
              ref={messagesContainerRef}
              className="card-body p-4 flex-grow-1" 
              style={{ 
                overflowY: 'auto',
                backgroundColor: '#f8f9fa',
                minHeight: '400px'
              }}
            >
              {!selectedTx ? (
                <div className="text-center py-5 h-100 d-flex flex-column justify-content-center">
                  <div className="text-muted mb-4">
                    <i className="bi bi-chat-left-text display-1"></i>
                  </div>
                  <h5 className="text-dark mb-3">Sélectionnez une conversation</h5>
                  <p className="text-muted">
                    Choisissez une transaction dans la liste pour voir les messages
                  </p>
                  {transactions.length === 0 && (
                    <button 
                      className="btn btn-primary mt-3"
                      onClick={handleGoToMarketplace}
                    >
                      <i className="bi bi-shop me-2"></i>
                      Commencer une transaction
                    </button>
                  )}
                </div>
              ) : loadingMessages ? (
                <div className="text-center py-5">
                  <div className="spinner-border spinner-border-sm text-primary"></div>
                  <p className="mt-2 small text-muted">Chargement des messages...</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-5 h-100 d-flex flex-column justify-content-center">
                  <div className="text-muted mb-4">
                    <i className="bi bi-chat-left-dots display-1"></i>
                  </div>
                  <h5 className="text-dark mb-3">Aucun message</h5>
                  <p className="text-muted mb-4">
                    Soyez le premier à envoyer un message pour cette transaction
                  </p>
                  <div className="bg-white p-4 rounded border mx-auto" style={{maxWidth: '500px'}}>
                    <p className="mb-2">
                      <strong>Détails de la transaction :</strong>
                    </p>
                    <p className="mb-1">
                      <i className="bi bi-arrow-left-right me-2"></i>
                      {selectedTx.ad.type === 'buy' ? 'Achat' : 'Vente'} de {selectedTx.usdtAmount} {selectedTx.ad.currency.code}
                    </p>
                    <p className="mb-1">
                      <i className="bi bi-currency-exchange me-2"></i>
                      Montant total : {selectedTx.fiatAmount.toLocaleString('fr-MA')} MAD
                    </p>
                    <p className="mb-0">
                      <i className="bi bi-person me-2"></i>
                      {selectedTx.ad.type === 'buy' ? 'Acheteur' : 'Vendeur'} : {otherUser?.fullName}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="messages-container">
                  {messages.map((msg, index) => {
                    const isUser = user && msg.sender.id === user.id;
                    const showDate = index === 0 || 
                      formatDate(messages[index-1].createdAt) !== formatDate(msg.createdAt);
                    
                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && (
                          <div className="text-center my-3">
                            <span className="badge bg-secondary bg-opacity-25 text-secondary px-3 py-1">
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        
                        <div className={`mb-3 ${isUser ? 'text-end' : ''}`}>
                          {!isUser && (
                            <div className="small text-muted mb-1 ms-1">
                              <i className="bi bi-person-circle me-1"></i>
                              {msg.sender.fullName}
                            </div>
                          )}
                          <div className={`d-flex ${isUser ? 'justify-content-end' : 'justify-content-start'}`}>
                            <div 
                              className={`p-3 rounded-3 ${isUser ? 'bg-primary text-white' : 'bg-white border'}`}
                              style={{ 
                                maxWidth: '70%',
                                borderRadius: isUser ? '18px 4px 18px 18px' : '4px 18px 18px 18px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                              }}
                            >
                              <div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                                {msg.message}
                              </div>
                            </div>
                          </div>
                          <div className={`small text-muted mt-1 ${isUser ? 'text-end me-1' : 'ms-1'}`}>
                            <i className="bi bi-clock me-1"></i>
                            {formatTime(msg.createdAt)}
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Zone d'envoi de message */}
            {selectedTx && (
              <div className="card-footer bg-white border-top py-3">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control border-end-0"
                    placeholder={`Écrivez un message à ${otherUser?.fullName || '...'}...`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
                    disabled={sending || loadingMessages}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim() || loadingMessages}
                  >
                    {sending ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      <i className="bi bi-send"></i>
                    )}
                  </button>
                </div>
                <div className="mt-2 d-flex justify-content-between">
                  <small className="text-muted">
                    <i className="bi bi-info-circle me-1"></i>
                    Appuyez sur Entrée pour envoyer
                  </small>
                  <small className="text-muted">
                    {messages.length} message{messages.length !== 1 ? 's' : ''}
                  </small>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;