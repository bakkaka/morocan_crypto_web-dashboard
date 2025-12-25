// src/components/MessagesPage.tsx
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

interface Message {
  id: number;
  sender: {
    id: number;
    username: string;
    email: string;
  };
  message: string;
  createdAt: string;
  transaction: {
    id: number;
    amount: number;
    currency: string;
  };
}

interface Conversation {
  id: number;
  withUser: {
    id: number;
    username: string;
  };
  lastMessage: string;
  lastMessageAt: string;
  transactionId: number;
}

const MessagesPage: React.FC = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConversations();
  }, []);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
    }
  }, [selectedConversation]);

  const loadConversations = async () => {
    try {
      setLoading(true);
      
      // Charger les conversations (basé sur les transactions)
      const response = await api.get('/chat_messages/conversations');
      const data = extractHydraMember(response.data);
      
      setConversations(data);
      
      if (data.length > 0 && !selectedConversation) {
        setSelectedConversation(data[0].transactionId);
      }
      
    } catch (error) {
      console.error('Erreur chargement conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadMessages = async (transactionId: number) => {
    try {
      const response = await api.get(`/chat_messages?transaction.id=${transactionId}&order[createdAt]=asc`);
      const data = extractHydraMember(response.data);
      setMessages(data);
      
      // Scroll to bottom
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
      
    } catch (error) {
      console.error('Erreur chargement messages:', error);
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation || !user) return;
    
    try {
      setSending(true);
      
      await api.post('/chat_messages', {
        transaction: `/api/transactions/${selectedConversation}`,
        sender: `/api/users/${user.id}`,
        message: newMessage.trim()
      });
      
      setNewMessage('');
      await loadMessages(selectedConversation);
      
    } catch (error) {
      console.error('Erreur envoi message:', error);
    } finally {
      setSending(false);
    }
  };

  const extractHydraMember = (data: any): any[] => {
    if (data?.['hydra:member']) return data['hydra:member'];
    if (Array.isArray(data)) return data;
    return [];
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString('fr-FR', {
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
          <p className="mt-3">Chargement des messages...</p>
        </div>
      </div>
    );
  }

  const selectedConv = conversations.find(c => c.transactionId === selectedConversation);

  return (
    <div className="container-fluid py-4">
      <div className="row">
        <div className="col-12">
          <h1 className="h3 mb-4">
            <i className="bi bi-chat-left-text me-2"></i>
            Messages
          </h1>
        </div>
      </div>

      <div className="row">
        {/* Liste des conversations */}
        <div className="col-md-4">
          <div className="card h-100">
            <div className="card-header">
              <h5 className="mb-0">Conversations</h5>
            </div>
            <div className="card-body p-0">
              {conversations.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-chat display-6"></i>
                  <p className="mt-3">Aucune conversation</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {conversations.map(conv => (
                    <button
                      key={conv.id}
                      className={`list-group-item list-group-item-action border-0 ${
                        selectedConversation === conv.transactionId ? 'bg-light' : ''
                      }`}
                      onClick={() => setSelectedConversation(conv.transactionId)}
                    >
                      <div className="d-flex w-100 justify-content-between">
                        <div>
                          <strong>{conv.withUser.username}</strong>
                          <p className="mb-1 text-truncate">{conv.lastMessage}</p>
                        </div>
                        <small className="text-muted">
                          {formatTime(conv.lastMessageAt)}
                        </small>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Messages */}
        <div className="col-md-8">
          <div className="card h-100">
            <div className="card-header">
              {selectedConv ? (
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    Conversation avec {selectedConv.withUser.username}
                  </h5>
                  <span className="badge bg-primary">
                    Transaction #{selectedConv.transactionId}
                  </span>
                </div>
              ) : (
                <h5 className="mb-0">Sélectionnez une conversation</h5>
              )}
            </div>
            
            <div className="card-body" style={{ height: '400px', overflowY: 'auto' }}>
              {!selectedConv ? (
                <div className="text-center py-5 text-muted">
                  <i className="bi bi-chat-left display-3"></i>
                  <p className="mt-3">Sélectionnez une conversation pour voir les messages</p>
                </div>
              ) : messages.length === 0 ? (
                <div className="text-center py-5 text-muted">
                  <p>Aucun message dans cette conversation</p>
                </div>
              ) : (
                <div>
                  {messages.map(msg => (
                    <div
                      key={msg.id}
                      className={`mb-3 ${msg.sender.id === user?.id ? 'text-end' : ''}`}
                    >
                      <div className="d-inline-block">
                        <div className={`p-3 rounded ${msg.sender.id === user?.id ? 'bg-primary text-white' : 'bg-light'}`}>
                          {msg.message}
                        </div>
                        <div className="small text-muted mt-1">
                          {msg.sender.id === user?.id ? 'Vous' : msg.sender.username} • {formatTime(msg.createdAt)}
                        </div>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>

            {selectedConv && (
              <div className="card-footer">
                <div className="input-group">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Tapez votre message..."
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