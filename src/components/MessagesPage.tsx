// src/components/MessagesPage.tsx - VERSION FONCTIONNELLE
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation } from 'react-router-dom';
import api from '../api/axiosConfig';

interface User {
  id: number;
  fullName: string;
  username?: string;
  email: string;
}

interface Transaction {
  id: number;
  usdtAmount: number;
  fiatAmount: number;
  status: string;
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
}

interface Message {
  id: number;
  sender: User;
  message: string;
  createdAt: string;
  transaction: {
    id: number;
  };
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [autoFocus, setAutoFocus] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Récupérer l'état de la navigation
  useEffect(() => {
    const state = location.state as any;
    if (state?.transactionId) {
      setSelectedTransaction(state.transactionId);
      setAutoFocus(state.autoFocus || false);
    }
  }, [location]);

  useEffect(() => {
    loadTransactions();
  }, []);

  useEffect(() => {
    if (selectedTransaction) {
      loadMessages(selectedTransaction);
      if (autoFocus && inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 500);
      }
    }
  }, [selectedTransaction, autoFocus]);

  const loadTransactions = async () => {
    try {
      setLoading(true);
      
      if (!user) {
        setTransactions([]);
        return;
      }
      
      // Charger les transactions de l'utilisateur
      const endpoints = [
        `/api/transactions?buyer.id=${user.id}`,
        `/api/transactions?seller.id=${user.id}`,
        '/api/transactions',
        '/transactions'
      ];

      let response = null;
      
      for (const endpoint of endpoints) {
        try {
          response = await api.get(endpoint);
          console.log('✅ Transactions chargées depuis:', endpoint);
          break;
        } catch (err) {
          console.log(`❌ ${endpoint} échoué:`, err);
          continue;
        }
      }

      if (!response) {
        console.warn('⚠️ Aucune transaction trouvée');
        setTransactions([]);
        return;
      }

      const data = extractHydraMember(response.data);
      
      // Filtrer les transactions où l'utilisateur est impliqué
      const userTransactions = data.filter((transaction: any) => {
        if (!transaction.buyer || !transaction.seller) return false;
        const buyerId = typeof transaction.buyer === 'object' ? transaction.buyer.id : transaction.buyer;
        const sellerId = typeof transaction.seller === 'object' ? transaction.seller.id : transaction.seller;
        return buyerId === user.id || sellerId === user.id;
      });

      console.log(`📊 ${userTransactions.length} transactions pour l'utilisateur`);
      
      // Formater les transactions
      const formattedTransactions: Transaction[] = userTransactions.map((tx: any) => {
        // Formater l'acheteur
        let buyerData: User = { 
          id: 0, 
          fullName: 'Inconnu', 
          email: '' 
        };
        if (tx.buyer) {
          if (typeof tx.buyer === 'object') {
            buyerData = {
              id: tx.buyer.id,
              fullName: tx.buyer.fullName || tx.buyer.full_name || 'Acheteur',
              username: tx.buyer.username,
              email: tx.buyer.email || ''
            };
          }
        }
        
        // Formater le vendeur
        let sellerData: User = { 
          id: 0, 
          fullName: 'Inconnu', 
          email: '' 
        };
        if (tx.seller) {
          if (typeof tx.seller === 'object') {
            sellerData = {
              id: tx.seller.id,
              fullName: tx.seller.fullName || tx.seller.full_name || 'Vendeur',
              username: tx.seller.username,
              email: tx.seller.email || ''
            };
          }
        }
        
        // Formater l'annonce
        const adData = tx.ad || {};
        
        return {
          id: tx.id,
          usdtAmount: parseFloat(tx.usdtAmount) || 0,
          fiatAmount: parseFloat(tx.fiatAmount) || 0,
          status: tx.status || 'pending',
          buyer: buyerData,
          seller: sellerData,
          ad: {
            id: adData.id || 0,
            type: adData.type || 'buy',
            currency: {
              code: adData.currency?.code || 'USDT'
            }
          },
          createdAt: tx.createdAt || new Date().toISOString()
        };
      }).filter((tx: Transaction) => tx.id > 0);

      setTransactions(formattedTransactions);
      
      // Sélectionner la première transaction si aucune n'est sélectionnée
      if (formattedTransactions.length > 0 && !selectedTransaction) {
        setSelectedTransaction(formattedTransactions[0].id);
      }
      
    } catch (error) {
      console.error('❌ Erreur chargement transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (transactionId: number) => {
    try {
      const endpoints = [
        `/api/chat_messages?transaction.id=${transactionId}&order[createdAt]=asc`,
        `/chat_messages?transaction.id=${transactionId}`,
        `/api/messages?transaction=${transactionId}`
      ];

      let response = null;
      
      for (const endpoint of endpoints) {
        try {
          response = await api.get(endpoint);
          console.log('✅ Messages chargés depuis:', endpoint);
          break;
        } catch (err) {
          console.log(`❌ ${endpoint} échoué:`, err);
          continue;
        }
      }

      if (!response) {
        console.warn('⚠️ Aucun message trouvé pour cette transaction');
        setMessages([]);
        return;
      }

      const data = extractHydraMember(response.data);
      
      // Formater les messages
      const formattedMessages: Message[] = data.map((msg: any) => {
        // Formater l'expéditeur
        let senderData: User = {
          id: 0,
          fullName: 'Anonyme',
          email: ''
        };
        
        if (msg.sender) {
          if (typeof msg.sender === 'object') {
            senderData = {
              id: msg.sender.id,
              fullName: msg.sender.fullName || msg.sender.full_name || 'Expéditeur',
              username: msg.sender.username,
              email: msg.sender.email || ''
            };
          }
        }
        
        return {
          id: msg.id,
          sender: senderData,
          message: msg.message || '',
          createdAt: msg.createdAt || new Date().toISOString(),
          transaction: {
            id: transactionId
          }
        };
      });

      setMessages(formattedMessages);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('❌ Erreur chargement messages:', error);
      setMessages([]);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTransaction || !user) return;
    
    try {
      setSending(true);
      
      console.log('🔄 Envoi message pour transaction:', selectedTransaction);
      
      // Créer le message
      const messageData = {
        transaction: `/api/transactions/${selectedTransaction}`,
        sender: `/api/users/${user.id}`,
        message: newMessage.trim()
      };
      
      // Essayer différents endpoints
      const endpoints = ['/api/chat_messages', '/chat_messages', '/api/messages'];
      let response = null;
      
      for (const endpoint of endpoints) {
        try {
          response = await api.post(endpoint, messageData);
          console.log('✅ Message envoyé via:', endpoint);
          break;
        } catch (err) {
          console.log(`❌ ${endpoint} échoué:`, err);
          continue;
        }
      }
      
      if (!response) {
        throw new Error('Aucun endpoint message ne fonctionne');
      }
      
      console.log('✅ Message enregistré dans la BDD:', response.data);
      
      // Réinitialiser et recharger
      setNewMessage('');
      await loadMessages(selectedTransaction);
      
      // Remettre le focus sur l'input
      if (inputRef.current) {
        inputRef.current.focus();
      }
      
    } catch (error) {
      console.error('❌ Erreur envoi message:', error);
      alert('Erreur lors de l\'envoi du message. Vérifiez votre connexion.');
    } finally {
      setSending(false);
    }
  };

  const extractHydraMember = (data: any): any[] => {
    if (data?.['hydra:member']) return data['hydra:member'];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  };

  const formatTime = (dateString: string) => {
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

  const formatDate = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: 'numeric'
      });
    } catch {
      return 'Date inconnue';
    }
  };

  const getOtherUser = (transaction: Transaction): User => {
    if (!user) return { id: 0, fullName: 'Inconnu', email: '' };
    return transaction.buyer.id === user.id ? transaction.seller : transaction.buyer;
  };

  const getTransactionTitle = (transaction: Transaction): string => {
    const otherUser = getOtherUser(transaction);
    const amount = transaction.usdtAmount;
    const currency = transaction.ad?.currency?.code || 'USDT';
    const type = transaction.ad?.type === 'buy' ? 'Achat' : 'Vente';
    
    return `${type} ${amount} ${currency} avec ${otherUser.fullName}`;
  };

  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3">Chargement des messages...</p>
        </div>
      </div>
    );
  }

  const selectedTx = transactions.find(tx => tx.id === selectedTransaction);

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <h1 className="h3 mb-4">
            <i className="bi bi-chat-left-text me-2"></i>
            Messagerie
          </h1>
        </div>
      </div>

      <div className="row">
        {/* Liste des conversations */}
        <div className="col-md-4">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-list-ul me-2"></i>
                Transactions
              </h5>
            </div>
            <div className="card-body p-0" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {transactions.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-chat display-6 mb-3"></i>
                  <h5>Aucune conversation</h5>
                  <p className="small">Commencez une transaction depuis le marketplace</p>
                  <a href="/market" className="btn btn-sm btn-outline-primary mt-2">
                    <i className="bi bi-shop me-1"></i>
                    Voir le marketplace
                  </a>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {transactions.map(tx => {
                    const otherUser = getOtherUser(tx);
                    const isActive = selectedTransaction === tx.id;
                    
                    return (
                      <button
                        key={tx.id}
                        className={`list-group-item list-group-item-action border-0 py-3 ${
                          isActive ? 'bg-light bg-opacity-50' : ''
                        }`}
                        onClick={() => {
                          setSelectedTransaction(tx.id);
                          setAutoFocus(false);
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0">
                            <div className={`rounded-circle p-2 ${
                              isActive ? 'bg-primary text-white' : 'bg-light'
                            }`}>
                              <i className="bi bi-person fs-5"></i>
                            </div>
                          </div>
                          <div className="flex-grow-1 ms-3">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h6 className="mb-1 text-truncate" style={{ maxWidth: '200px' }}>
                                  {otherUser.fullName}
                                </h6>
                                <p className="small text-muted mb-0 text-truncate" style={{ maxWidth: '200px' }}>
                                  {tx.ad?.type === 'buy' ? 'Achat' : 'Vente'} de {tx.usdtAmount} {tx.ad?.currency?.code}
                                </p>
                              </div>
                              <div className="text-end">
                                <span className={`badge ${
                                  tx.status === 'completed' ? 'bg-success' :
                                  tx.status === 'pending' ? 'bg-warning' :
                                  tx.status === 'cancelled' ? 'bg-danger' :
                                  'bg-secondary'
                                }`}>
                                  {tx.status}
                                </span>
                                <small className="text-muted d-block mt-1">
                                  {formatTime(tx.createdAt)}
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
          </div>
        </div>

        {/* Messages */}
        <div className="col-md-8">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white border-bottom">
              {selectedTx ? (
                <div className="d-flex justify-content-between align-items-center">
                  <div>
                    <h5 className="mb-1">
                      <i className="bi bi-chat-left-text me-2"></i>
                      {getTransactionTitle(selectedTx)}
                    </h5>
                    <div className="small text-muted">
                      Transaction #{selectedTx.id} • 
                      Statut: <span className={`badge ${
                        selectedTx.status === 'completed' ? 'bg-success' :
                        selectedTx.status === 'pending' ? 'bg-warning' :
                        selectedTx.status === 'cancelled' ? 'bg-danger' :
                        'bg-secondary'
                      }`}>
                        {selectedTx.status}
                      </span> • 
                      Montant: {selectedTx.fiatAmount.toLocaleString('fr-MA')} MAD
                    </div>
                  </div>
                  <div className="text-end">
                    <button 
                      className="btn btn-sm btn-outline-secondary"
                      onClick={loadTransactions}
                      title="Actualiser"
                    >
                      <i className="bi bi-arrow-clockwise"></i>
                    </button>
                  </div>
                </div>
              ) : (
                <h5 className="mb-0">
                  <i className="bi bi-chat-left me-2"></i>
                  Sélectionnez une transaction
                </h5>
              )}
            </div>
            
            <div 
              className="card-body p-4" 
              style={{ 
                height: '60vh', 
                overflowY: 'auto',
                background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)'
              }}
            >
              {!selectedTx ? (
                <div className="text-center py-5">
                  <div className="display-1 text-muted mb-4">
                    <i className="bi bi-chat-left"></i>
                  </div>
                  <h4 className="mb-3">Sélectionnez une transaction</h4>
                  <p className="text-muted">
                    Choisissez une transaction dans la liste pour voir les messages
                  </p>
                  <a href="/market" className="btn btn-primary">
                    <i className="bi bi-shop me-2"></i>
                    Démarrer une nouvelle transaction
                  </a>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-5">
                  <div className="display-1 text-muted mb-4">
                    <i className="bi bi-chat-left-dots"></i>
                  </div>
                  <h4 className="mb-3">Aucun message</h4>
                  <p className="text-muted">
                    Soyez le premier à envoyer un message pour cette transaction
                  </p>
                  <p className="small text-muted">
                    Transaction #{selectedTx.id} • {selectedTx.usdtAmount} {selectedTx.ad?.currency?.code} • {selectedTx.fiatAmount.toLocaleString('fr-MA')} MAD
                  </p>
                </div>
              ) : (
                <div>
                  {/* Date du premier message */}
                  {messages.length > 0 && (
                    <div className="text-center my-3">
                      <span className="badge bg-light text-dark px-3 py-2">
                        <i className="bi bi-calendar me-2"></i>
                        {formatDate(messages[0].createdAt)}
                      </span>
                    </div>
                  )}
                  
                  {/* Liste des messages */}
                  {messages.map((msg, index) => {
                    const isUser = user && msg.sender.id === user.id;
                    const showDate = index === 0 || 
                      new Date(msg.createdAt).toDateString() !== 
                      new Date(messages[index - 1].createdAt).toDateString();
                    
                    return (
                      <React.Fragment key={msg.id}>
                        {/* Séparateur de date */}
                        {showDate && index > 0 && (
                          <div className="text-center my-3">
                            <span className="badge bg-light text-dark px-3 py-2">
                              <i className="bi bi-calendar me-2"></i>
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        
                        {/* Message */}
                        <div className={`mb-3 ${isUser ? 'text-end' : ''}`}>
                          <div className="d-inline-block" style={{ maxWidth: '80%' }}>
                            {!isUser && (
                              <div className="small text-muted mb-1">
                                <i className="bi bi-person-circle me-1"></i>
                                {msg.sender.fullName}
                              </div>
                            )}
                            <div className={`p-3 rounded-3 ${
                              isUser 
                                ? 'bg-primary text-white' 
                                : 'bg-light text-dark'
                            }`}>
                              <div style={{ whiteSpace: 'pre-line' }}>
                                {msg.message}
                              </div>
                            </div>
                            <div className={`small text-muted mt-1 ${isUser ? 'text-end' : ''}`}>
                              <i className="bi bi-clock me-1"></i>
                              {formatTime(msg.createdAt)}
                            </div>
                          </div>
                        </div>
                      </React.Fragment>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {selectedTx && (
              <div className="card-footer border-top bg-white">
                <div className="input-group">
                  <input
                    ref={inputRef}
                    type="text"
                    className="form-control border-2"
                    placeholder={`Envoyer un message à ${getOtherUser(selectedTx).fullName}...`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && !sending && sendMessage()}
                    disabled={sending}
                    style={{ 
                      borderColor: '#dee2e6',
                      borderRadius: '8px 0 0 8px'
                    }}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
                    style={{ borderRadius: '0 8px 8px 0' }}
                  >
                    {sending ? (
                      <span className="spinner-border spinner-border-sm"></span>
                    ) : (
                      <>
                        <i className="bi bi-send me-2"></i>
                        Envoyer
                      </>
                    )}
                  </button>
                </div>
                <div className="mt-2 small text-muted">
                  <i className="bi bi-info-circle me-1"></i>
                  Appuyez sur Entrée pour envoyer • Tous les messages sont enregistrés dans la base de données
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Styles inline */}
      <style>{`
        .list-group-item:hover {
          background-color: rgba(13, 110, 253, 0.05) !important;
        }
        
        .card {
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,.125);
        }
        
        .card-header {
          border-radius: 12px 12px 0 0 !important;
        }
        
        .message-bubble {
          position: relative;
        }
        
        .message-bubble:before {
          content: '';
          position: absolute;
          width: 0;
          height: 0;
          border-style: solid;
        }
        
        .message-bubble.user:before {
          right: -8px;
          top: 10px;
          border-width: 8px 0 8px 8px;
          border-color: transparent transparent transparent #0d6efd;
        }
        
        .message-bubble.other:before {
          left: -8px;
          top: 10px;
          border-width: 8px 8px 8px 0;
          border-color: transparent #f8f9fa transparent transparent;
        }
      `}</style>
    </div>
  );
};

export default MessagesPage;