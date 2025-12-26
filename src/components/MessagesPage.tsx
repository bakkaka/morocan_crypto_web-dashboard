// src/components/MessagesPage.tsx - VERSION CORRIGÉE
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
  const messagesContainerRef = useRef<HTMLDivElement>(null);

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

  // Scroll automatique vers le bas pour les nouveaux messages
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

  // Fonction pour charger les transactions
  const loadTransactions = async () => {
    if (!user) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    
    try {
      setLoading(true);
      
      console.log(`🔍 Chargement transactions pour utilisateur ID: ${user.id}`);
      
      // Essayer différents endpoints comme dans vos autres fichiers
      const endpoints = [
        `/transactions?buyer.id=${user.id}&order[createdAt]=desc`,
        `/transactions?seller.id=${user.id}&order[createdAt]=desc`,
        `/transactions?user=${user.id}&order[createdAt]=desc`,
        `/transactions?order[createdAt]=desc`
      ];

      let response = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Tentative: ${endpoint}`);
          response = await api.get(endpoint);
          console.log(`✅ Succès avec: ${endpoint}`);
          break;
        } catch (err: any) {
          console.log(`❌ Échec ${endpoint}:`, err.message);
          continue;
        }
      }

      if (!response) {
        console.warn('⚠️ Aucun endpoint transaction ne fonctionne');
        setTransactions([]);
        return;
      }

      const data = extractHydraMember(response.data);
      console.log(`📊 Transactions brutes:`, data);
      
      // Formater les transactions
      const formattedTransactions: Transaction[] = data
        .filter((tx: any) => {
          if (!tx.buyer || !tx.seller) return false;
          
          // Vérifier si l'utilisateur est impliqué
          const buyerId = typeof tx.buyer === 'object' ? tx.buyer.id : tx.buyer;
          const sellerId = typeof tx.seller === 'object' ? tx.seller.id : tx.seller;
          
          const isUserInvolved = buyerId === user.id || sellerId === user.id;
          console.log(`Transaction ${tx.id}: user=${user.id}, buyer=${buyerId}, seller=${sellerId}, involved=${isUserInvolved}`);
          
          return isUserInvolved;
        })
        .map((tx: any) => {
          console.log(`📋 Traitement transaction ${tx.id}:`, tx);
          
          // Fonction pour formater un utilisateur
          const formatUser = (userData: any, defaultName: string): User => {
            if (!userData) {
              return { 
                id: 0, 
                fullName: defaultName, 
                email: '',
                avatar: ''
              };
            }
            
            if (typeof userData === 'object') {
              return {
                id: userData.id || 0,
                fullName: userData.fullName || userData.full_name || userData.name || defaultName,
                username: userData.username,
                email: userData.email || '',
                avatar: userData.avatar || userData.profileImage || ''
              };
            }
            
            return { 
              id: 0, 
              fullName: defaultName, 
              email: '',
              avatar: ''
            };
          };
          
          // Formater l'annonce
          const adData = tx.ad || {};
          const currencyCode = adData.currency?.code || 'USDT';
          
          return {
            id: tx.id,
            usdtAmount: parseFloat(tx.usdtAmount) || parseFloat(tx.amount) || 0,
            fiatAmount: parseFloat(tx.fiatAmount) || parseFloat(tx.localAmount) || 0,
            status: tx.status || 'pending',
            buyer: formatUser(tx.buyer, 'Acheteur'),
            seller: formatUser(tx.seller, 'Vendeur'),
            ad: {
              id: adData.id || 0,
              type: adData.type || 'buy',
              currency: {
                code: currencyCode
              },
              title: adData.title || `Transaction ${tx.id}`
            },
            createdAt: tx.createdAt || tx.created_at || new Date().toISOString(),
            updatedAt: tx.updatedAt || tx.updated_at || new Date().toISOString()
          };
        })
        .filter((tx: Transaction) => tx.id > 0)
        .sort((a: Transaction, b: Transaction) => 
          new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
        );

      console.log(`📊 ${formattedTransactions.length} transactions formatées:`, formattedTransactions);
      setTransactions(formattedTransactions);
      setLastUpdated(new Date());
      
      // Sélectionner la première transaction si aucune n'est sélectionnée
      if (formattedTransactions.length > 0 && !selectedTransaction) {
        setSelectedTransaction(formattedTransactions[0].id);
      }
      
      // Sélectionner automatiquement la transaction passée en state si elle existe
      const state = location.state as any;
      if (state?.transactionId && formattedTransactions.some(tx => tx.id === state.transactionId)) {
        setSelectedTransaction(state.transactionId);
      }
      
    } catch (error: any) {
      console.error('❌ Erreur chargement transactions:', error);
      alert('Erreur lors du chargement des transactions. Veuillez réessayer.');
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour charger les messages
  const loadMessages = async (transactionId: number) => {
    if (!transactionId) return;
    
    try {
      setMessageLoading(true);
      
      console.log(`🔍 Chargement messages pour transaction ${transactionId}`);
      
      // Essayer différents endpoints comme dans vos autres fichiers
      const endpoints = [
        `/chat_messages?transaction.id=${transactionId}&order[createdAt]=asc`,
        `/chat_messages?transaction=${transactionId}&order[createdAt]=asc`,
        `/messages?transaction.id=${transactionId}&order[createdAt]=asc`,
        `/messages?transaction=${transactionId}`
      ];

      let response = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Tentative: ${endpoint}`);
          response = await api.get(endpoint);
          console.log(`✅ Succès avec: ${endpoint}`);
          break;
        } catch (err: any) {
          console.log(`❌ Échec ${endpoint}:`, err.message);
          continue;
        }
      }

      if (!response) {
        console.warn('⚠️ Aucun endpoint message ne fonctionne');
        setMessages([]);
        return;
      }

      const data = extractHydraMember(response.data);
      console.log(`📨 Messages bruts pour transaction ${transactionId}:`, data);
      
      // Formater les messages
      const formattedMessages: Message[] = data.map((msg: any) => {
        // Formater l'expéditeur
        let senderData: User = {
          id: 0,
          fullName: 'Anonyme',
          email: '',
          avatar: ''
        };
        
        if (msg.sender) {
          if (typeof msg.sender === 'object') {
            senderData = {
              id: msg.sender.id,
              fullName: msg.sender.fullName || msg.sender.full_name || msg.sender.name || 'Expéditeur',
              username: msg.sender.username,
              email: msg.sender.email || '',
              avatar: msg.sender.avatar || msg.sender.profileImage || ''
            };
          }
        }
        
        return {
          id: msg.id,
          sender: senderData,
          message: msg.message || msg.content || '',
          createdAt: msg.createdAt || msg.created_at || msg.timestamp || new Date().toISOString(),
          transaction: {
            id: transactionId
          },
          isRead: msg.isRead || msg.read || false
        };
      }).sort((a: Message, b: Message) => 
        new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      console.log(`📨 ${formattedMessages.length} messages formatés`);
      setMessages(formattedMessages);
      
    } catch (error: any) {
      console.error('❌ Erreur chargement messages:', error);
      setMessages([]);
    } finally {
      setMessageLoading(false);
    }
  };

  // Fonction pour envoyer un message - CORRIGÉE AVEC LE BON FORMAT
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTransaction || !user || sending) return;
    
    try {
      setSending(true);
      
      console.log(`📤 Envoi message pour transaction ${selectedTransaction}`);
      console.log(`👤 Utilisateur ID: ${user.id}`);
      
      // FORMAT CORRECT comme dans vos autres fichiers
      const messageData = {
        message: newMessage.trim(),
        transaction: `/api/transactions/${selectedTransaction}`,
        sender: `/api/users/${user.id}`
      };
      
      console.log('📦 Données message:', messageData);
      
      // Essayer différents endpoints comme dans vos autres fichiers
      const endpoints = [
        '/api/chat_messages',
        '/chat_messages',
        '/api/messages',
        '/messages'
      ];
      
      let response = null;
      let lastError = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Tentative d'envoi via ${endpoint}`);
          response = await api.post(endpoint, messageData);
          console.log(`✅ Message envoyé via: ${endpoint}`);
          console.log('📦 Réponse:', response.data);
          break;
        } catch (err: any) {
          lastError = err;
          console.log(`❌ ${endpoint} échoué:`, err.message);
          if (err.response) {
            console.log('📋 Détails erreur:', {
              status: err.response.status,
              data: err.response.data
            });
          }
          continue;
        }
      }
      
      if (!response) {
        throw lastError || new Error('Aucun endpoint ne fonctionne');
      }
      
      // Ajouter le message localement pour un feedback immédiat
      const tempMessage: Message = {
        id: Date.now(), // ID temporaire
        sender: {
          id: user.id,
          fullName: user.fullName || 'Vous',
          email: user.email || '',
          avatar: (user as any).avatar || '' // Correction ici
        },
        message: newMessage.trim(),
        createdAt: new Date().toISOString(),
        transaction: { id: selectedTransaction },
        isRead: true
      };
      
      console.log('💾 Message temporaire ajouté:', tempMessage);
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      
      // Recharger les messages depuis le serveur
      await loadMessages(selectedTransaction);
      
      // Focus sur l'input
      if (inputRef.current) {
        inputRef.current.focus();
      }
      
    } catch (error: any) {
      console.error('❌ Erreur envoi message:', error);
      alert(`Erreur lors de l'envoi du message: ${error.message || 'Vérifiez votre connexion'}`);
    } finally {
      setSending(false);
    }
  };

  // Fonctions utilitaires
  const formatTime = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('fr-FR', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '--:--';
    }
  }, []);

  const formatDate = useCallback((dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - date.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays === 1) return 'Hier';
      if (diffDays < 7) return date.toLocaleDateString('fr-FR', { weekday: 'long' });
      
      return date.toLocaleDateString('fr-FR', {
        day: 'numeric',
        month: 'short',
        year: diffDays > 365 ? 'numeric' : undefined
      });
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
    
    return `${type} ${amount} ${currency}`;
  }, [getOtherUser]);

  const getUserInitials = useCallback((name: string): string => {
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .substring(0, 2);
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey && !sending) {
      e.preventDefault();
      sendMessage();
    }
  };

  const handleGoToMarketplace = () => {
    navigate('/market');
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
        <div className="row">
          <div className="col-12">
            <h1 className="h3 mb-4">
              <i className="bi bi-chat-left-text me-2"></i>
              Messagerie
            </h1>
          </div>
        </div>
        <div className="row">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body text-center py-5">
                <div className="spinner-border text-primary mb-3" role="status">
                  <span className="visually-hidden">Chargement...</span>
                </div>
                <h5>Chargement de vos conversations...</h5>
                <p className="text-muted">Veuillez patienter</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const selectedTx = transactions.find(tx => tx.id === selectedTransaction);

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 mb-0">
              <i className="bi bi-chat-left-text me-2"></i>
              Messagerie
            </h1>
            <div className="d-flex gap-2">
              <button 
                className="btn btn-outline-primary btn-sm"
                onClick={handleRefresh}
                title="Actualiser"
              >
                <i className="bi bi-arrow-clockwise"></i>
              </button>
              <button 
                className="btn btn-primary btn-sm"
                onClick={handleGoToMarketplace}
              >
                <i className="bi bi-plus-circle me-1"></i>
                Nouvelle transaction
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="row g-3">
        {/* Liste des conversations */}
        <div className="col-md-4 col-lg-3">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white border-bottom py-3">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-list-ul me-2"></i>
                  Conversations
                </h5>
                <span className="badge bg-primary rounded-pill">
                  {transactions.length}
                </span>
              </div>
              <div className="mt-2 small text-muted">
                <i className="bi bi-info-circle me-1"></i>
                Dernière mise à jour: {lastUpdated.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
            <div className="card-body p-0" style={{ maxHeight: 'calc(100vh - 200px)', overflowY: 'auto' }}>
              {transactions.length === 0 ? (
                <div className="text-center py-5 px-3">
                  <div className="display-6 text-muted mb-3">
                    <i className="bi bi-chat"></i>
                  </div>
                  <h5 className="mb-2">Aucune conversation</h5>
                  <p className="text-muted small mb-3">
                    Commencez une transaction depuis le marketplace pour démarrer une conversation
                  </p>
                  <button 
                    className="btn btn-primary btn-sm"
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
                    const lastMessageTime = formatTime(tx.updatedAt);
                    const transactionTitle = getTransactionTitle(tx);
                    
                    return (
                      <button
                        key={tx.id}
                        className={`list-group-item list-group-item-action border-0 py-3 ${
                          isActive ? 'active' : ''
                        }`}
                        onClick={() => {
                          setSelectedTransaction(tx.id);
                          setAutoFocus(true);
                        }}
                      >
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0 position-relative">
                            {otherUser.avatar ? (
                              <img 
                                src={otherUser.avatar} 
                                alt={otherUser.fullName}
                                className="rounded-circle"
                                style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                              />
                            ) : (
                              <div className={`rounded-circle d-flex align-items-center justify-content-center ${
                                isActive ? 'bg-white text-primary' : 'bg-primary text-white'
                              }`}
                              style={{ width: '48px', height: '48px' }}>
                                <span className="fw-bold">{getUserInitials(otherUser.fullName)}</span>
                              </div>
                            )}
                            <span className={`position-absolute bottom-0 end-0 translate-middle badge rounded-circle border border-2 ${
                              tx.status === 'completed' ? 'bg-success' :
                              tx.status === 'pending' ? 'bg-warning' :
                              tx.status === 'cancelled' ? 'bg-danger' :
                              'bg-secondary'
                            }`}
                            style={{ width: '12px', height: '12px' }}></span>
                          </div>
                          <div className="flex-grow-1 ms-3 text-start">
                            <div className="d-flex justify-content-between align-items-start">
                              <div style={{ maxWidth: '70%' }}>
                                <h6 className="mb-1 fw-semibold text-truncate">
                                  {otherUser.fullName}
                                </h6>
                                <p className="small mb-0 text-truncate">
                                  {transactionTitle}
                                </p>
                                <p className="small text-muted mb-0">
                                  {tx.fiatAmount.toLocaleString('fr-MA')} MAD
                                </p>
                              </div>
                              <div className="text-end">
                                <small className={`${isActive ? 'text-white' : 'text-muted'}`}>
                                  {lastMessageTime}
                                </small>
                                <div className="mt-1">
                                  <span className={`badge ${
                                    tx.status === 'completed' ? 'bg-success' :
                                    tx.status === 'pending' ? 'bg-warning' :
                                    tx.status === 'cancelled' ? 'bg-danger' :
                                    'bg-secondary'
                                  }`}>
                                    {tx.status}
                                  </span>
                                </div>
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

        {/* Zone de messages */}
        <div className="col-md-8 col-lg-9">
          <div className="card h-100 shadow-sm">
            {selectedTx ? (
              <>
                <div className="card-header bg-white border-bottom py-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <div className="d-flex align-items-center">
                      <div className="flex-shrink-0 me-3">
                        {getOtherUser(selectedTx).avatar ? (
                          <img 
                            src={getOtherUser(selectedTx).avatar} 
                            alt={getOtherUser(selectedTx).fullName}
                            className="rounded-circle"
                            style={{ width: '48px', height: '48px', objectFit: 'cover' }}
                          />
                        ) : (
                          <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center"
                            style={{ width: '48px', height: '48px' }}>
                            <span className="fw-bold">{getUserInitials(getOtherUser(selectedTx).fullName)}</span>
                          </div>
                        )}
                      </div>
                      <div>
                        <h5 className="mb-1 fw-semibold">
                          {getOtherUser(selectedTx).fullName}
                        </h5>
                        <div className="small text-muted">
                          <span className="me-3">
                            Transaction #{selectedTx.id}
                          </span>
                          <span className="me-3">
                            <span className={`badge ${
                              selectedTx.status === 'completed' ? 'bg-success' :
                              selectedTx.status === 'pending' ? 'bg-warning' :
                              selectedTx.status === 'cancelled' ? 'bg-danger' :
                              'bg-secondary'
                            }`}>
                              {selectedTx.status}
                            </span>
                          </span>
                          <span>
                            {selectedTx.usdtAmount} {selectedTx.ad?.currency?.code}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="d-flex gap-2">
                      <button 
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => loadMessages(selectedTx.id)}
                        disabled={messageLoading}
                        title="Actualiser les messages"
                      >
                        <i className={`bi ${messageLoading ? 'bi-arrow-clockwise spin' : 'bi-arrow-clockwise'}`}></i>
                      </button>
                      <button 
                        className="btn btn-outline-primary btn-sm"
                        onClick={() => navigate(`/transaction/${selectedTx.id}`)}
                        title="Voir les détails"
                      >
                        <i className="bi bi-eye"></i>
                      </button>
                    </div>
                  </div>
                </div>
                
                <div 
                  ref={messagesContainerRef}
                  className="card-body p-4" 
                  style={{ 
                    height: 'calc(100vh - 300px)', 
                    overflowY: 'auto',
                    background: 'linear-gradient(180deg, #f8f9fa 0%, #ffffff 100%)'
                  }}
                >
                  {messageLoading && messages.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="spinner-border text-primary mb-3" role="status">
                        <span className="visually-hidden">Chargement...</span>
                      </div>
                      <p>Chargement des messages...</p>
                    </div>
                  ) : messages.length === 0 ? (
                    <div className="text-center py-5">
                      <div className="display-1 text-muted mb-4 opacity-50">
                        <i className="bi bi-chat-left-dots"></i>
                      </div>
                      <h4 className="mb-3">Aucun message</h4>
                      <p className="text-muted mb-4">
                        Soyez le premier à envoyer un message pour cette transaction
                      </p>
                      <div className="bg-light p-3 rounded">
                        <p className="small text-muted mb-1">
                          <i className="bi bi-info-circle me-1"></i>
                          Détails de la transaction
                        </p>
                        <p className="mb-1">
                          <strong>Montant:</strong> {selectedTx.usdtAmount} {selectedTx.ad?.currency?.code}
                        </p>
                        <p className="mb-1">
                          <strong>Équivalent:</strong> {selectedTx.fiatAmount.toLocaleString('fr-MA')} MAD
                        </p>
                        <p className="mb-0">
                          <strong>Type:</strong> {selectedTx.ad?.type === 'buy' ? 'Achat' : 'Vente'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {/* Premier message avec date */}
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
                          <React.Fragment key={msg.id || index}>
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
                              <div className="d-inline-block" style={{ maxWidth: '75%' }}>
                                {!isUser && (
                                  <div className="small text-muted mb-1 d-flex align-items-center">
                                    {msg.sender.avatar ? (
                                      <img 
                                        src={msg.sender.avatar} 
                                        alt={msg.sender.fullName}
                                        className="rounded-circle me-2"
                                        style={{ width: '20px', height: '20px', objectFit: 'cover' }}
                                      />
                                    ) : (
                                      <div className="rounded-circle bg-secondary text-white d-flex align-items-center justify-content-center me-2"
                                        style={{ width: '20px', height: '20px', fontSize: '10px' }}>
                                        {getUserInitials(msg.sender.fullName)}
                                      </div>
                                    )}
                                    <span>{msg.sender.fullName}</span>
                                  </div>
                                )}
                                <div className={`p-3 rounded-4 ${
                                  isUser 
                                    ? 'bg-primary text-white' 
                                    : 'bg-white border text-dark'
                                }`}
                                style={{ 
                                  boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                                  borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
                                }}>
                                  <div style={{ whiteSpace: 'pre-line', wordBreak: 'break-word' }}>
                                    {msg.message}
                                  </div>
                                </div>
                                <div className={`small text-muted mt-1 ${isUser ? 'text-end' : ''}`}>
                                  <i className="bi bi-clock me-1"></i>
                                  {formatTime(msg.createdAt)}
                                  {isUser && msg.isRead && (
                                    <span className="ms-2">
                                      <i className="bi bi-check-all text-primary"></i>
                                    </span>
                                  )}
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

                {/* Input pour envoyer des messages */}
                <div className="card-footer border-top bg-white py-3">
                  <div className="input-group">
                    <input
                      ref={inputRef}
                      type="text"
                      className="form-control border-primary border-2"
                      placeholder={`Écrivez un message à ${getOtherUser(selectedTx).fullName}...`}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyDown={handleKeyPress}
                      disabled={sending}
                      style={{ 
                        borderRadius: '8px 0 0 8px',
                        borderRight: 'none'
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
                  <div className="mt-2 small text-muted d-flex justify-content-between">
                    <div>
                      <i className="bi bi-info-circle me-1"></i>
                      Appuyez sur Entrée pour envoyer
                    </div>
                    <div>
                      <i className="bi bi-shield-check me-1"></i>
                      Messages sécurisés
                    </div>
                  </div>
                </div>
              </>
            ) : (
              <div className="card-body d-flex align-items-center justify-content-center" style={{ minHeight: '400px' }}>
                <div className="text-center py-5">
                  <div className="display-1 text-muted mb-4 opacity-25">
                    <i className="bi bi-chat-left"></i>
                  </div>
                  <h4 className="mb-3">Sélectionnez une conversation</h4>
                  <p className="text-muted mb-4">
                    Choisissez une transaction dans la liste pour commencer à chatter
                  </p>
                  <button 
                    className="btn btn-primary"
                    onClick={handleGoToMarketplace}
                  >
                    <i className="bi bi-shop me-2"></i>
                    Démarrer une nouvelle transaction
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Styles inline */}
      <style>{`
        .list-group-item.active {
          background-color: #0d6efd !important;
          border-color: #0d6efd !important;
          color: white !important;
        }
        
        .list-group-item:hover:not(.active) {
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
          transition: all 0.2s ease;
        }
        
        .message-bubble:hover {
          transform: translateY(-1px);
        }
        
        .bg-primary {
          background-color: #0d6efd !important;
        }
        
        .border-primary {
          border-color: #0d6efd !important;
        }
        
        .spin {
          animation: spin 1s linear infinite;
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        
        /* Scrollbar personnalisée */
        ::-webkit-scrollbar {
          width: 6px;
        }
        
        ::-webkit-scrollbar-track {
          background: #f1f1f1;
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb {
          background: #c1c1c1;
          border-radius: 10px;
        }
        
        ::-webkit-scrollbar-thumb:hover {
          background: #a8a8a8;
        }
      `}</style>
    </div>
  );
};

export default MessagesPage;