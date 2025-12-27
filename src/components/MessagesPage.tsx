// src/components/MessagesPage.tsx - VERSION CORRIGÉE ET OPTIMISÉE
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

// 🔧 SERVICE DE MESSAGERIE
class MessageService {
  static async loadTransactions(userId: number) {
    try {
      console.log('📥 Chargement des transactions...');
      
      // ✅ ENDPOINT CORRECT - Sans /api
      const response = await api.get('/transactions');
      
      let data: any[] = [];
      if (response.data['hydra:member']) {
        data = response.data['hydra:member'];
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }
      
      console.log(`📊 ${data.length} transactions récupérées`);

      // Filtrer les transactions de l'utilisateur
      return data.filter((tx: any) => {
        const buyerId = typeof tx.buyer === 'object' ? tx.buyer.id : tx.buyer;
        const sellerId = typeof tx.seller === 'object' ? tx.seller.id : tx.seller;
        
        return buyerId === userId || sellerId === userId;
      }).map((tx: any) => ({
        id: tx.id,
        usdtAmount: tx.usdtAmount || 0,
        fiatAmount: tx.fiatAmount || 0,
        status: tx.status || 'pending',
        buyer: typeof tx.buyer === 'object' ? {
          id: tx.buyer.id,
          fullName: tx.buyer.fullName || tx.buyer.full_name || 'Acheteur',
          email: tx.buyer.email || ''
        } : { id: 0, fullName: 'Acheteur', email: '' },
        seller: typeof tx.seller === 'object' ? {
          id: tx.seller.id,
          fullName: tx.seller.fullName || tx.seller.full_name || 'Vendeur',
          email: tx.seller.email || ''
        } : { id: 0, fullName: 'Vendeur', email: '' },
        ad: {
          id: tx.ad?.id || 0,
          type: tx.ad?.type || 'buy',
          currency: {
            code: tx.ad?.currency?.code || 'USDT'
          }
        },
        createdAt: tx.createdAt || tx.created_at
      }));
      
    } catch (error) {
      console.error('❌ Erreur chargement transactions:', error);
      return [];
    }
  }

  static async loadMessages(transactionId: number) {
    try {
      console.log(`📨 Chargement messages pour transaction ${transactionId}`);
      
      // ✅ ENDPOINT CORRECT - Sans /api
      const response = await api.get(`/chat_messages`, {
        params: {
          'transaction.id': transactionId,
          'order[createdAt]': 'asc'
        }
      });
      
      let data: any[] = [];
      if (response.data['hydra:member']) {
        data = response.data['hydra:member'];
      } else if (Array.isArray(response.data)) {
        data = response.data;
      }
      
      return data.map((msg: any) => ({
        id: msg.id,
        sender: {
          id: msg.sender?.id || 0,
          fullName: msg.sender?.fullName || msg.sender?.full_name || 'Expéditeur',
          email: msg.sender?.email || ''
        },
        message: msg.message || '(Message vide)',
        createdAt: msg.createdAt || msg.created_at,
        transaction: { id: transactionId }
      }));
      
    } catch (error) {
      console.error(`❌ Erreur chargement messages:`, error);
      return [];
    }
  }

  static async sendMessage(transactionId: number, userId: number, message: string) {
    try {
      console.log(`📤 Envoi message transaction ${transactionId}`);
      
      // ✅ FORMAT CORRECT - URLs sans /api
      const messageData = {
        transaction: `/transactions/${transactionId}`,
        sender: `/users/${userId}`,
        message: message.trim()
      };
      
      const response = await api.post('/chat_messages', messageData);
      console.log('✅ Message envoyé avec succès');
      return response.data;
      
    } catch (error: any) {
      console.error('❌ Erreur envoi message:', error);
      throw error;
    }
  }
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

  // 📍 Récupérer l'ID de transaction depuis la navigation
  useEffect(() => {
    const state = location.state as any;
    if (state?.transactionId) {
      setSelectedTransaction(state.transactionId);
    }
  }, [location]);

  // 📥 Charger les transactions au démarrage
  useEffect(() => {
    const loadData = async () => {
      if (user) {
        try {
          setLoading(true);
          const transactionsData = await MessageService.loadTransactions(user.id);
          setTransactions(transactionsData);
          
          // Si pas de transaction sélectionnée, prendre la première
          if (!selectedTransaction && transactionsData.length > 0) {
            setSelectedTransaction(transactionsData[0].id);
          }
        } catch (error) {
          console.error('Erreur initialisation:', error);
        } finally {
          setLoading(false);
        }
      }
    };
    
    loadData();
  }, [user]);

  // 📨 Charger les messages quand la transaction change
  useEffect(() => {
    if (selectedTransaction) {
      const loadMessages = async () => {
        const messagesData = await MessageService.loadMessages(selectedTransaction);
        setMessages(messagesData);
        
        // Scroll vers le bas
        setTimeout(() => {
          messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
        }, 100);
      };
      
      loadMessages();
    }
  }, [selectedTransaction]);

  // 📤 Envoyer un message
  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedTransaction || !user || sending) return;
    
    try {
      setSending(true);
      
      // Message temporaire pour feedback immédiat
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
      
      // Envoyer réellement le message
      await MessageService.sendMessage(selectedTransaction, user.id, newMessage);
      
      // Recharger les messages pour avoir l'ID réel
      const updatedMessages = await MessageService.loadMessages(selectedTransaction);
      setMessages(updatedMessages);
      
    } catch (error: any) {
      console.error('Erreur envoi:', error);
      alert('Erreur lors de l\'envoi du message');
    } finally {
      setSending(false);
    }
  };

  // 🛠️ Fonctions utilitaires
  const formatTime = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleTimeString('fr-FR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } catch {
      return '--:--';
    }
  };

  const getOtherUser = (transaction: Transaction): User => {
    if (!user) return { id: 0, fullName: 'Inconnu', email: '' };
    return transaction.buyer.id === user.id ? transaction.seller : transaction.buyer;
  };

  const handleRefresh = async () => {
    if (user) {
      const transactionsData = await MessageService.loadTransactions(user.id);
      setTransactions(transactionsData);
      
      if (selectedTransaction) {
        const messagesData = await MessageService.loadMessages(selectedTransaction);
        setMessages(messagesData);
      }
    }
  };

  const selectedTx = transactions.find(tx => tx.id === selectedTransaction);

  // 🎨 Rendu
  if (loading) {
    return (
      <div className="container py-5">
        <div className="text-center py-5">
          <div className="spinner-border text-primary"></div>
          <p className="mt-3">Chargement des conversations...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-4">
      <div className="row g-4">
        {/* Colonne gauche - Liste des conversations */}
        <div className="col-lg-4">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white">
              <div className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">
                  <i className="bi bi-chat-left-text me-2"></i>
                  Conversations
                </h5>
                <button 
                  className="btn btn-sm btn-outline-primary"
                  onClick={handleRefresh}
                  title="Actualiser"
                >
                  <i className="bi bi-arrow-clockwise"></i>
                </button>
              </div>
            </div>
            
            <div className="card-body p-0">
              {transactions.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-chat-dots display-6 mb-3"></i>
                  <p>Aucune conversation</p>
                  <button 
                    className="btn btn-sm btn-primary"
                    onClick={() => navigate('/market')}
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
                              <i className="bi bi-person"></i>
                            </div>
                          </div>
                          <div className="flex-grow-1 ms-3">
                            <div className="d-flex justify-content-between">
                              <h6 className="mb-1">{otherUser.fullName}</h6>
                              <span className={`badge ${
                                tx.status === 'completed' ? 'bg-success' :
                                tx.status === 'pending' ? 'bg-warning' :
                                'bg-secondary'
                              }`}>
                                {tx.status}
                              </span>
                            </div>
                            <p className="small mb-1">
                              {tx.ad.type === 'buy' ? 'Achat' : 'Vente'} de {tx.usdtAmount} {tx.ad.currency.code}
                            </p>
                            <p className="small text-muted mb-0">
                              {tx.fiatAmount.toLocaleString('fr-MA')} MAD
                            </p>
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

        {/* Colonne droite - Messages */}
        <div className="col-lg-8">
          <div className="card shadow-sm h-100">
            <div className="card-header bg-white">
              {selectedTx ? (
                <div>
                  <h5 className="mb-1">
                    <i className="bi bi-chat-dots me-2"></i>
                    Conversation avec {getOtherUser(selectedTx).fullName}
                  </h5>
                  <p className="small text-muted mb-0">
                    Transaction #{selectedTx.id} • {selectedTx.ad.type === 'buy' ? 'Achat' : 'Vente'} de {selectedTx.usdtAmount} {selectedTx.ad.currency.code}
                  </p>
                </div>
              ) : (
                <h5 className="mb-0">Sélectionnez une conversation</h5>
              )}
            </div>
            
            <div 
              className="card-body p-4" 
              style={{ 
                height: '60vh', 
                overflowY: 'auto',
                backgroundColor: '#f8f9fa'
              }}
            >
              {!selectedTx ? (
                <div className="text-center py-5">
                  <i className="bi bi-chat-left-text display-6 text-muted mb-3"></i>
                  <h5>Sélectionnez une conversation</h5>
                  <p className="text-muted">
                    Choisissez une transaction dans la liste pour voir les messages
                  </p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-5">
                  <i className="bi bi-chat-left-dots display-6 text-muted mb-3"></i>
                  <h5>Aucun message</h5>
                  <p className="text-muted">
                    Soyez le premier à envoyer un message
                  </p>
                </div>
              ) : (
                <div>
                  {messages.map((msg, index) => {
                    const isUser = user && msg.sender.id === user.id;
                    
                    return (
                      <div key={msg.id || index} className={`mb-3 ${isUser ? 'text-end' : ''}`}>
                        {!isUser && (
                          <div className="small text-muted mb-1">
                            <i className="bi bi-person-circle me-1"></i>
                            {msg.sender.fullName}
                          </div>
                        )}
                        <div className={`p-3 rounded-3 d-inline-block ${
                          isUser 
                            ? 'bg-primary text-white' 
                            : 'bg-white border'
                        }`} style={{ maxWidth: '80%' }}>
                          {msg.message}
                        </div>
                        <div className={`small text-muted mt-1 ${isUser ? 'text-end' : ''}`}>
                          <i className="bi bi-clock me-1"></i>
                          {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    );
                  })}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {/* Zone d'envoi de message */}
            {selectedTx && (
              <div className="card-footer bg-white">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder={`Message à ${getOtherUser(selectedTx).fullName}...`}
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
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
                      <i className="bi bi-send"></i>
                    )}
                  </button>
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