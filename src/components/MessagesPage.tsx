// src/components/MessagesPage.tsx - VERSION DÉFINITIVE CORRIGÉE
import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

interface User {
  id: number;
  fullName: string;
  username?: string;
  email: string;
  avatar?: string;
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
    title?: string;
  };
  createdAt: string;
  updatedAt: string;
}

interface Message {
  id: number;
  sender: User;
  message: string;
  createdAt: string;
  transaction: {
    id: number;
  };
  isRead?: boolean;
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [autoFocus, setAutoFocus] = useState(false);
  const [messageLoading, setMessageLoading] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  
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

  // Charger les transactions au montage
  useEffect(() => {
    loadTransactions();
  }, []);

  // Charger les messages quand une transaction est sélectionnée
  useEffect(() => {
    if (selectedTransaction) {
      loadMessages(selectedTransaction);
      if (autoFocus && inputRef.current) {
        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);
      }
    }
  }, [selectedTransaction, autoFocus]);

  // Scroll automatique vers le bas
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    }
  }, [messages]);

  // Fonction utilitaire pour extraire les données Hydra
  const extractHydraMember = useCallback((data: any): any[] => {
    if (data?.['hydra:member']) return data['hydra:member'];
    if (Array.isArray(data)) return data;
    if (data?.data && Array.isArray(data.data)) return data.data;
    if (data?.items && Array.isArray(data.items)) return data.items;
    return [];
  }, []);

  // Fonction pour charger les transactions - CORRIGÉE
  const loadTransactions = async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      console.log(`🔍 Chargement transactions pour utilisateur ID: ${user.id}`);
      
      // IMPORTANT: Utiliser les endpoints SANS /api (l'URL de base l'ajoute déjà)
      const endpoints = [
        `/transactions?buyer.id=${user.id}&order[createdAt]=desc`,
        `/transactions?seller.id=${user.id}&order[createdAt]=desc`,
        `/transactions?user=${user.id}&order[createdAt]=desc`,
        `/transactions?order[createdAt]=desc`
      ];

      let response = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Tentative GET: ${endpoint}`);
          response = await api.get(endpoint);
          console.log(`✅ Succès avec: ${endpoint}`, response.data);
          break;
        } catch (err: any) {
          console.log(`❌ Échec ${endpoint}:`, err.response?.status || err.message);
          continue;
        }
      }

      if (!response) {
        console.warn('⚠️ Aucune transaction trouvée');
        setTransactions([]);
        return;
      }

      const data = extractHydraMember(response.data);
      
      // Filtrer et formater les transactions
      const formattedTransactions: Transaction[] = data
        .filter((tx: any) => {
          if (!tx.buyer || !tx.seller) return false;
          
          const buyerId = typeof tx.buyer === 'object' ? tx.buyer.id : tx.buyer;
          const sellerId = typeof tx.seller === 'object' ? tx.seller.id : tx.seller;
          
          return buyerId === user.id || sellerId === user.id;
        })
        .map((tx: any) => {
          // Formater les utilisateurs
          const formatUser = (userData: any, defaultName: string): User => {
            if (!userData) return { id: 0, fullName: defaultName, email: '', avatar: '' };
            if (typeof userData === 'object') {
              return {
                id: userData.id || 0,
                fullName: userData.fullName || userData.full_name || userData.name || defaultName,
                username: userData.username,
                email: userData.email || '',
                avatar: userData.avatar || ''
              };
            }
            return { id: 0, fullName: defaultName, email: '', avatar: '' };
          };
          
          return {
            id: tx.id,
            usdtAmount: parseFloat(tx.usdtAmount) || parseFloat(tx.amount) || 0,
            fiatAmount: parseFloat(tx.fiatAmount) || parseFloat(tx.localAmount) || 0,
            status: tx.status || 'pending',
            buyer: formatUser(tx.buyer, 'Acheteur'),
            seller: formatUser(tx.seller, 'Vendeur'),
            ad: {
              id: tx.ad?.id || 0,
              type: tx.ad?.type || 'buy',
              currency: { code: tx.ad?.currency?.code || 'USDT' },
              title: tx.ad?.title || `Transaction ${tx.id}`
            },
            createdAt: tx.createdAt || tx.created_at || new Date().toISOString(),
            updatedAt: tx.updatedAt || tx.updated_at || new Date().toISOString()
          };
        })
        .filter((tx: Transaction) => tx.id > 0)
        .sort((a: Transaction, b: Transaction) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

      console.log(`📊 ${formattedTransactions.length} transactions chargées`);
      setTransactions(formattedTransactions);
      setLastUpdated(new Date());
      
      // Sélectionner la première transaction
      if (formattedTransactions.length > 0 && !selectedTransaction) {
        setSelectedTransaction(formattedTransactions[0].id);
      }
      
      const state = location.state as any;
      if (state?.transactionId && formattedTransactions.some(tx => tx.id === state.transactionId)) {
        setSelectedTransaction(state.transactionId);
      }
      
    } catch (error: any) {
      console.error('❌ Erreur chargement transactions:', error);
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour charger les messages - CORRIGÉE
  const loadMessages = async (transactionId: number) => {
    if (!transactionId) return;
    
    try {
      setMessageLoading(true);
      console.log(`🔍 Chargement messages pour transaction ${transactionId}`);
      
      // IMPORTANT: SANS /api dans l'endpoint
      const endpoints = [
        `/chat_messages?transaction.id=${transactionId}&order[createdAt]=asc`,
        `/chat_messages?transaction=${transactionId}&order[createdAt]=asc`
      ];

      let response = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Tentative GET: ${endpoint}`);
          response = await api.get(endpoint);
          console.log(`✅ Succès avec: ${endpoint}`);
          break;
        } catch (err: any) {
          console.log(`❌ Échec ${endpoint}:`, err.response?.status || err.message);
          continue;
        }
      }

      if (!response) {
        console.warn('⚠️ Aucun message trouvé');
        setMessages([]);
        return;
      }

      const data = extractHydraMember(response.data);
      
      const formattedMessages: Message[] = data.map((msg: any) => ({
        id: msg.id,
        sender: {
          id: msg.sender?.id || 0,
          fullName: msg.sender?.fullName || msg.sender?.full_name || msg.sender?.name || 'Expéditeur',
          username: msg.sender?.username,
          email: msg.sender?.email || '',
          avatar: msg.sender?.avatar || ''
        },
        message: msg.message || msg.content || '',
        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
        transaction: { id: transactionId },
        isRead: msg.isRead || msg.read || false
      })).sort((a: Message, b: Message) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      console.log(`📨 ${formattedMessages.length} messages chargés`);
      setMessages(formattedMessages);
      
    } catch (error: any) {
      console.error('❌ Erreur chargement messages:', error);
      setMessages([]);
    } finally {
      setMessageLoading(false);
    }
  };

  // Fonction pour envoyer un message - CORRIGÉE (format correct)
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTransaction || !user || sending) return;
    
    try {
      setSending(true);
      console.log(`📤 Envoi message pour transaction ${selectedTransaction}`);
      
      // FORMAT CORRECT POUR VOTRE API
      // Utiliser les IRIs complets sans /api (l'URL de base l'ajoute)
      const messageData = {
        message: newMessage.trim(),
        transaction: `/api/transactions/${selectedTransaction}`, // IRI complet
        sender: `/api/users/${user.id}` // IRI complet
      };
      
      console.log('📦 Données message:', messageData);
      
      // IMPORTANT: SANS /api dans l'endpoint
      const endpoints = [
        '/chat_messages',
        '/messages'
      ];
      
      let response = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Tentative POST: ${endpoint}`);
          response = await api.post(endpoint, messageData);
          console.log(`✅ Message envoyé via: ${endpoint}`, response.data);
          break;
        } catch (err: any) {
          console.log(`❌ ${endpoint} échoué:`, err.response?.status || err.message);
          if (err.response) {
            console.log('📋 Détails:', err.response.data);
          }
          continue;
        }
      }
      
      if (!response) {
        throw new Error('Aucun endpoint ne fonctionne');
      }
      
      // Message temporaire pour feedback
      const tempMessage: Message = {
        id: Date.now(),
        sender: {
          id: user.id,
          fullName: user.fullName || 'Vous',
          email: user.email || '',
          avatar: (user as any).avatar || ''
        },
        message: newMessage.trim(),
        createdAt: new Date().toISOString(),
        transaction: { id: selectedTransaction },
        isRead: true
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      
      // Recharger les messages
      await loadMessages(selectedTransaction);
      
      // Remettre le focus
      if (inputRef.current) {
        inputRef.current.focus();
      }
      
    } catch (error: any) {
      console.error('❌ Erreur envoi message:', error);
      alert(`Erreur: ${error.message || 'Vérifiez votre connexion'}`);
    } finally {
      setSending(false);
    }
  };

  // Fonctions utilitaires
  const formatTime = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
    } catch {
      return 'Date inconnue';
    }
  }, []);

  const getOtherUser = useCallback((transaction: Transaction): User => {
    if (!user) return { id: 0, fullName: 'Inconnu', email: '', avatar: '' };
    return transaction.buyer.id === user.id ? transaction.seller : transaction.buyer;
  }, [user]);

  const getTransactionTitle = useCallback((transaction: Transaction): string => {
    const otherUser = getOtherUser(transaction);
    const amount = transaction.usdtAmount;
    const currency = transaction.ad?.currency?.code || 'USDT';
    const type = transaction.ad?.type === 'buy' ? 'Achat' : 'Vente';
    return `${type} ${amount} ${currency} avec ${otherUser.fullName}`;
  }, [getOtherUser]);

  const getUserInitials = useCallback((name: string): string => {
    return name.split(' ').map(w => w[0]).join('').toUpperCase().substring(0, 2);
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !sending) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleRefresh = () => {
    loadTransactions();
    if (selectedTransaction) {
      loadMessages(selectedTransaction);
    }
  };

  // Rendu pendant le chargement
  if (loading) {
    return (
      <div className="container-fluid py-4">
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status">
            <span className="visually-hidden">Chargement...</span>
          </div>
          <p className="mt-3">Chargement des conversations...</p>
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

      <div className="row g-3">
        {/* Liste des conversations */}
        <div className="col-md-4">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-list-ul me-2"></i>
                  Conversations
                </h5>
                <button className="btn btn-sm btn-outline-primary" onClick={handleRefresh}>
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
            </div>
            <div className="card-body p-0" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {transactions.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-chat display-6 mb-3"></i>
                  <h5>Aucune conversation</h5>
                  <p className="small">Commencez une transaction depuis le marketplace</p>
                  <button 
                    className="btn btn-sm btn-primary mt-2"
                    onClick={() => navigate('/market')}
                  >
                    <i className="bi bi-shop me-1"></i>
                    Voir le marketplace
                  </button>
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
                                <h6 className="mb-1 text-truncate" style={{ maxWidth: '150px' }}>
                                  {otherUser.fullName}
                                </h6>
                                <p className="small text-muted mb-0">
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
                                  {formatTime(tx.updatedAt)}
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
                </div>
              ) : (
                <h5 className="mb-0">
                  <i className="bi bi-chat-left me-2"></i>
                  Sélectionnez une conversation
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
                </div>
              ) : (
                <div>
                  {messages.map((msg, index) => {
                    const isUser = user && msg.sender.id === user.id;
                    const showDate = index === 0 || 
                      new Date(msg.createdAt).toDateString() !== 
                      new Date(messages[index - 1].createdAt).toDateString();
                    
                    return (
                      <React.Fragment key={msg.id}>
                        {showDate && index > 0 && (
                          <div className="text-center my-3">
                            <span className="badge bg-light text-dark px-3 py-2">
                              {formatDate(msg.createdAt)}
                            </span>
                          </div>
                        )}
                        
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
                  />
                  <button
                    className="btn btn-primary"
                    onClick={sendMessage}
                    disabled={sending || !newMessage.trim()}
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
                  Appuyez sur Entrée pour envoyer
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