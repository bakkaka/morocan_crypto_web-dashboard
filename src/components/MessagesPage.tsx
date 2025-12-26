// src/components/MessagesPage.tsx - VERSION SIMPLIFIÉE ET FONCTIONNELLE
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig';

interface User {
  id: number;
  fullName: string;
  email: string;
}

interface Transaction {
  id: number;
  amount: number;
  price: number;
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
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [selectedTransaction, setSelectedTransaction] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Récupérer l'état de la navigation
  useEffect(() => {
    const state = location.state as any;
    if (state?.transactionId) {
      setSelectedTransaction(state.transactionId);
    }
  }, [location]);

  // Charger les transactions
  useEffect(() => {
    if (user) {
      loadTransactions();
    } else {
      setLoading(false);
    }
  }, [user]);

  // Charger les messages
  useEffect(() => {
    if (selectedTransaction) {
      loadMessages(selectedTransaction);
    }
  }, [selectedTransaction]);

  // Fonction pour charger les transactions - SIMPLIFIÉE
  const loadTransactions = async () => {
    try {
      setLoading(true);
      console.log('🔍 Chargement des transactions...');
      
      // Essayer plusieurs endpoints
      const endpoints = [
        '/api/transactions',
        '/transactions'
      ];

      let response = null;
      let data = [];
      
      for (const endpoint of endpoints) {
        try {
          response = await api.get(endpoint);
          console.log(`✅ Réussi avec: ${endpoint}`);
          
          // Extraire les données selon le format
          if (response.data['hydra:member']) {
            data = response.data['hydra:member'];
          } else if (Array.isArray(response.data)) {
            data = response.data;
          } else if (response.data.data) {
            data = response.data.data;
          }
          
          break;
        } catch (err) {
          console.log(`❌ Échec avec: ${endpoint}`);
          continue;
        }
      }

      if (!response) {
        console.log('⚠️ Aucune transaction trouvée');
        setTransactions([]);
        return;
      }

      console.log('📊 Données brutes des transactions:', data);

      // Filtrer pour ne garder que les transactions de l'utilisateur
      const userTransactions = data.filter((tx: any) => {
        if (!tx.buyer || !tx.seller) return false;
        
        // Récupérer les IDs selon le format
        const buyerId = typeof tx.buyer === 'object' ? tx.buyer.id : tx.buyer;
        const sellerId = typeof tx.seller === 'object' ? tx.seller.id : tx.seller;
        
        return user && (buyerId === user.id || sellerId === user.id);
      });

      console.log(`📊 ${userTransactions.length} transactions pour l'utilisateur`);

      // Formater les transactions
      const formattedTransactions: Transaction[] = userTransactions.map((tx: any) => {
        // Fonction pour formater un utilisateur
        const formatUser = (userData: any, defaultName: string): User => {
          if (!userData) {
            return { id: 0, fullName: defaultName, email: '' };
          }
          if (typeof userData === 'object') {
            return {
              id: userData.id || 0,
              fullName: userData.fullName || userData.full_name || userData.name || defaultName,
              email: userData.email || ''
            };
          }
          return { id: 0, fullName: defaultName, email: '' };
        };

        return {
          id: tx.id,
          amount: parseFloat(tx.amount) || parseFloat(tx.usdtAmount) || 0,
          price: parseFloat(tx.price) || parseFloat(tx.fiatAmount) || 0,
          status: tx.status || 'pending',
          buyer: formatUser(tx.buyer, 'Acheteur'),
          seller: formatUser(tx.seller, 'Vendeur'),
          ad: {
            id: tx.ad?.id || 0,
            type: tx.ad?.type || 'buy',
            currency: {
              code: tx.ad?.currency?.code || 'USDT'
            }
          },
          createdAt: tx.createdAt || tx.created_at || new Date().toISOString()
        };
      });

      console.log('📊 Transactions formatées:', formattedTransactions);
      setTransactions(formattedTransactions);

      // Sélectionner la première transaction
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

  // Fonction pour charger les messages - SIMPLIFIÉE
  const loadMessages = async (transactionId: number) => {
    try {
      console.log(`🔍 Chargement messages pour transaction ${transactionId}`);
      
      // Essayer plusieurs endpoints
      const endpoints = [
        `/api/chat_messages?transaction.id=${transactionId}`,
        `/chat_messages?transaction.id=${transactionId}`,
        `/api/messages?transaction.id=${transactionId}`,
        `/messages?transaction.id=${transactionId}`
      ];

      let response = null;
      let data = [];
      
      for (const endpoint of endpoints) {
        try {
          response = await api.get(endpoint);
          console.log(`✅ Réussi avec: ${endpoint}`);
          
          // Extraire les données
          if (response.data['hydra:member']) {
            data = response.data['hydra:member'];
          } else if (Array.isArray(response.data)) {
            data = response.data;
          } else if (response.data.data) {
            data = response.data.data;
          }
          
          break;
        } catch (err) {
          console.log(`❌ Échec avec: ${endpoint}`);
          continue;
        }
      }

      if (!response) {
        console.log('⚠️ Aucun message trouvé');
        setMessages([]);
        return;
      }

      console.log('📨 Messages bruts:', data);

      // Formater les messages
      const formattedMessages: Message[] = data.map((msg: any) => ({
        id: msg.id,
        sender: {
          id: msg.sender?.id || 0,
          fullName: msg.sender?.fullName || msg.sender?.full_name || msg.sender?.name || 'Expéditeur',
          email: msg.sender?.email || ''
        },
        message: msg.message || msg.content || '(Message vide)',
        createdAt: msg.createdAt || msg.created_at || new Date().toISOString(),
        transaction: { id: transactionId }
      }));

      console.log(`📨 ${formattedMessages.length} messages chargés:`, formattedMessages);
      setMessages(formattedMessages);
      
      // Scroll vers le bas
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('❌ Erreur chargement messages:', error);
      setMessages([]);
    }
  };

  // Fonction pour envoyer un message - SIMPLIFIÉE
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTransaction || !user || sending) return;
    
    try {
      setSending(true);
      console.log(`📤 Envoi message pour transaction ${selectedTransaction}`);
      
      // TEST : Créer d'abord un message simple
      const messageData = {
        message: newMessage.trim(),
        transaction: `/api/transactions/${selectedTransaction}`,
        sender: `/api/users/${user.id}`
      };
      
      console.log('📦 Données du message:', messageData);
      
      // Essayer plusieurs endpoints
      const endpoints = [
        '/api/chat_messages',
        '/chat_messages'
      ];
      
      let response = null;
      
      for (const endpoint of endpoints) {
        try {
          console.log(`🔄 Tentative POST vers: ${endpoint}`);
          response = await api.post(endpoint, messageData);
          console.log(`✅ Message envoyé!`, response.data);
          break;
        } catch (err: any) {
          console.log(`❌ Échec ${endpoint}:`, err.response?.status, err.response?.data);
          
          // Si c'est une erreur 400, essayer un format différent
          if (err.response?.status === 400) {
            try {
              const altMessageData = {
                content: newMessage.trim(),
                transactionId: selectedTransaction,
                senderId: user.id
              };
              console.log('🔄 Tentative avec format alternatif:', altMessageData);
              response = await api.post(endpoint, altMessageData);
              console.log(`✅ Message envoyé avec format alternatif!`);
              break;
            } catch (altErr) {
              console.log('❌ Format alternatif échoué aussi');
            }
          }
        }
      }
      
      if (!response) {
        throw new Error('Impossible d\'envoyer le message');
      }
      
      // Ajouter le message localement
      const tempMessage: Message = {
        id: Date.now(),
        sender: {
          id: user.id,
          fullName: user.fullName || 'Vous',
          email: user.email || ''
        },
        message: newMessage.trim(),
        createdAt: new Date().toISOString(),
        transaction: { id: selectedTransaction }
      };
      
      setMessages(prev => [...prev, tempMessage]);
      setNewMessage('');
      
      // Recharger les messages après 1 seconde
      setTimeout(() => {
        loadMessages(selectedTransaction);
      }, 1000);
      
    } catch (error: any) {
      console.error('❌ Erreur envoi message:', error);
      alert(`Erreur: ${error.message || 'Impossible d\'envoyer le message'}`);
    } finally {
      setSending(false);
    }
  };

  // Fonctions utilitaires
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '--:--';
    }
  };

  const getOtherUser = (transaction: Transaction): User => {
    if (!user) return { id: 0, fullName: 'Inconnu', email: '' };
    return transaction.buyer.id === user.id ? transaction.seller : transaction.buyer;
  };

  const handleRefresh = () => {
    loadTransactions();
    if (selectedTransaction) {
      loadMessages(selectedTransaction);
    }
  };

  const handleGoToMarketplace = () => {
    navigate('/market');
  };

  // Rendu
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
        <div className="col-md-4">
          <div className="card h-100 shadow-sm">
            <div className="card-header bg-white border-bottom">
              <h5 className="mb-0">
                <i className="bi bi-list-ul me-2"></i>
                Conversations ({transactions.length})
              </h5>
            </div>
            <div className="card-body p-0" style={{ maxHeight: '70vh', overflowY: 'auto' }}>
              {transactions.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-chat display-6 mb-3"></i>
                  <h5>Aucune conversation</h5>
                  <p className="small">Commencez une transaction pour démarrer une conversation</p>
                  <button 
                    className="btn btn-sm btn-primary mt-2"
                    onClick={handleGoToMarketplace}
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
                          isActive ? 'bg-primary text-white' : ''
                        }`}
                        onClick={() => setSelectedTransaction(tx.id)}
                      >
                        <div className="d-flex align-items-center">
                          <div className="flex-shrink-0">
                            <div className="rounded-circle bg-light p-2">
                              <i className="bi bi-person fs-5"></i>
                            </div>
                          </div>
                          <div className="flex-grow-1 ms-3">
                            <div className="d-flex justify-content-between align-items-start">
                              <div>
                                <h6 className="mb-1">{otherUser.fullName}</h6>
                                <p className="small mb-0">
                                  {tx.ad?.type === 'buy' ? 'Achat' : 'Vente'} de {tx.amount} {tx.ad?.currency?.code}
                                </p>
                                <p className="small text-muted mb-0">
                                  {tx.price.toLocaleString('fr-MA')} MAD
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
                <div>
                  <h5 className="mb-1">
                    <i className="bi bi-chat-left-text me-2"></i>
                    Conversation avec {getOtherUser(selectedTx).fullName}
                  </h5>
                  <div className="small text-muted">
                    Transaction #{selectedTx.id} • 
                    {selectedTx.ad?.type === 'buy' ? 'Achat' : 'Vente'} de {selectedTx.amount} {selectedTx.ad?.currency?.code} • 
                    {selectedTx.price.toLocaleString('fr-MA')} MAD • 
                    Statut: <span className={`badge ${
                      selectedTx.status === 'completed' ? 'bg-success' :
                      selectedTx.status === 'pending' ? 'bg-warning' :
                      selectedTx.status === 'cancelled' ? 'bg-danger' :
                      'bg-secondary'
                    }`}>
                      {selectedTx.status}
                    </span>
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
                background: '#f8f9fa'
              }}
            >
              {!selectedTx ? (
                <div className="text-center py-5">
                  <div className="display-1 text-muted mb-4">
                    <i className="bi bi-chat-left"></i>
                  </div>
                  <h4 className="mb-3">Sélectionnez une conversation</h4>
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
                  <div className="bg-white p-3 rounded border">
                    <p className="mb-1">
                      <strong>Détails de la transaction :</strong>
                    </p>
                    <p className="mb-1">
                      {selectedTx.ad?.type === 'buy' ? 'Achat' : 'Vente'} de {selectedTx.amount} {selectedTx.ad?.currency?.code}
                    </p>
                    <p className="mb-0">
                      Montant total : {selectedTx.price.toLocaleString('fr-MA')} MAD
                    </p>
                  </div>
                </div>
              ) : (
                <div>
                  {messages.map((msg, index) => {
                    const isUser = user && msg.sender.id === user.id;
                    
                    return (
                      <div key={msg.id || index} className={`mb-3 ${isUser ? 'text-end' : ''}`}>
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
                              : 'bg-white border text-dark'
                          }`}
                          style={{ 
                            boxShadow: '0 2px 4px rgba(0,0,0,0.05)',
                            borderRadius: isUser ? '18px 18px 4px 18px' : '18px 18px 18px 4px'
                          }}>
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
                    type="text"
                    className="form-control"
                    placeholder={`Écrivez un message à ${getOtherUser(selectedTx).fullName}...`}
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