// src/components/PublicAdList.tsx
import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import api from '../api/axiosConfig';

interface User {
  id: number;
  fullName: string;
  reputation: number;
}

interface Currency {
  id: number;
  code: string;
  name: string;
  type: 'crypto' | 'fiat';
}

interface Ad {
  id: number;
  type: 'buy' | 'sell';
  amount: number;
  price: number;
  currency: Currency;
  status: 'active' | 'paused' | 'completed' | 'cancelled';
  paymentMethod: string;
  user: User;
  createdAt: string;
  timeLimitMinutes: number;
  terms?: string;
  minAmountPerTransaction?: number;
  maxAmountPerTransaction?: number;
}

const PublicAdList: React.FC = () => {
  const [ads, setAds] = useState<Ad[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'buy' | 'sell'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'price' | 'amount' | 'created'>('created');
  const { isAuthenticated, user } = useAuth();
  const navigate = useNavigate();

  const extractHydraMember = useCallback((data: any): any[] => {
    if (data?.member && Array.isArray(data.member)) return data.member;
    if (data?.['hydra:member'] && Array.isArray(data['hydra:member'])) return data['hydra:member'];
    if (Array.isArray(data)) return data;
    return [];
  }, []);

  const loadAds = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🌐 Chargement des annonces publiques...');
      
      // NOTE: Pas besoin de token pour les annonces publiques
      // On peut ajouter un timeout court pour éviter de bloquer
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      const response = await api.get('/ads', { 
        params: { 
          status: 'active',
          'order[createdAt]': 'desc'
        },
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);
      
      const adsData = extractHydraMember(response.data);
      console.log('✅ Annonces publiques chargées:', adsData.length);
      
      // Formatage simplifié pour le public
      const formattedAds: Ad[] = adsData.map((ad: any) => {
        // Gestion sécurisée des données
        let userInfo: User;
        if (ad.user && typeof ad.user === 'object') {
          userInfo = {
            id: ad.user.id || 0,
            fullName: ad.user.fullName || 'Utilisateur',
            reputation: ad.user.reputation || 5.0
          };
        } else {
          userInfo = { id: 0, fullName: 'Utilisateur', reputation: 5.0 };
        }
        
        let currencyInfo: Currency;
        if (ad.currency && typeof ad.currency === 'object') {
          currencyInfo = {
            id: ad.currency.id || 0,
            code: ad.currency.code || 'USDT',
            name: ad.currency.name || 'Tether USD',
            type: ad.currency.type || 'crypto'
          };
        } else {
          currencyInfo = { id: 0, code: 'USDT', name: 'Tether USD', type: 'crypto' };
        }
        
        return {
          id: ad.id,
          type: ad.type || 'buy',
          amount: parseFloat(ad.amount) || 0,
          price: parseFloat(ad.price) || 0,
          currency: currencyInfo,
          status: ad.status || 'active',
          paymentMethod: ad.paymentMethod || 'Non spécifié',
          user: userInfo,
          createdAt: ad.createdAt || new Date().toISOString(),
          timeLimitMinutes: ad.timeLimitMinutes || 60,
          terms: ad.terms,
          minAmountPerTransaction: ad.minAmountPerTransaction ? parseFloat(ad.minAmountPerTransaction) : undefined,
          maxAmountPerTransaction: ad.maxAmountPerTransaction ? parseFloat(ad.maxAmountPerTransaction) : undefined
        };
      });

      setAds(formattedAds);

    } catch (err: any) {
      console.error('❌ Erreur chargement annonces publiques:', err);
      
      if (err.name === 'AbortError') {
        setError('Le chargement a pris trop de temps. Veuillez réessayer.');
      } else if (err.response?.status === 404) {
        setError('Aucune annonce disponible pour le moment.');
      } else {
        setError('Impossible de charger les annonces. Veuillez réessayer plus tard.');
      }
      
      setAds([]);
    } finally {
      setLoading(false);
    }
  }, [extractHydraMember]);

  useEffect(() => {
    loadAds();
  }, [loadAds]);

  // Filtrage et tri
  const filteredAds = ads
    .filter(ad => {
      const matchesSearch = searchTerm === '' || 
        (ad.currency?.code?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (ad.paymentMethod?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (ad.terms?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (ad.user?.fullName?.toLowerCase() || '').includes(searchTerm.toLowerCase());
      
      const matchesType = typeFilter === 'all' || ad.type === typeFilter;
      const matchesCurrency = currencyFilter === 'all' || 
        (ad.currency?.code?.toLowerCase() || '') === currencyFilter.toLowerCase();
      
      return matchesSearch && matchesType && matchesCurrency && ad.status === 'active';
    })
    .sort((a, b) => {
      switch (sortBy) {
        case 'price':
          return a.price - b.price;
        case 'amount':
          return a.amount - b.amount;
        case 'created':
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

  // Devises uniques pour filtre
  const uniqueCurrencies = Array.from(
    new Set(ads.map(ad => ad.currency?.code).filter(Boolean))
  ).sort();

  const handleViewDetails = () => {
    if (!isAuthenticated) {
      alert('🔐 Connectez-vous pour voir les détails et contacter les vendeurs !');
      navigate('/login', { state: { from: '/market' } });
      return;
    }
    navigate('/dashboard/ads');
  };

  const handleCreateAd = () => {
    if (!isAuthenticated) {
      alert('📝 Créez un compte gratuit pour publier vos propres annonces !');
      navigate('/register', { state: { from: '/market' } });
      return;
    }
    navigate('/dashboard/ads/create');
  };

  const formatDate = (dateString: string): string => {
    try {
      const date = new Date(dateString);
      const now = new Date();
      const diffMs = now.getTime() - date.getTime();
      const diffMins = Math.floor(diffMs / 60000);
      const diffHours = Math.floor(diffMs / 3600000);
      const diffDays = Math.floor(diffMs / 86400000);
      
      if (diffMins < 1) {
        return 'À l\'instant';
      } else if (diffMins < 60) {
        return `Il y a ${diffMins} min`;
      } else if (diffHours < 24) {
        return `Il y a ${diffHours} h`;
      } else if (diffDays === 1) {
        return 'Hier';
      } else if (diffDays < 7) {
        return `Il y a ${diffDays} j`;
      } else {
        return date.toLocaleDateString('fr-MA', {
          day: '2-digit',
          month: 'short'
        });
      }
    } catch {
      return 'Date inconnue';
    }
  };

  const calculateTotal = (ad: Ad): number => {
    return ad.amount * ad.price;
  };

  const formatPrice = (price: number): string => {
    if (price >= 1000) {
      return price.toLocaleString('fr-MA', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
      });
    }
    return price.toLocaleString('fr-MA', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-16">
        <div className="container mx-auto px-4">
          <div className="text-center py-20">
            <div className="spinner-border text-yellow-500" style={{width: '4rem', height: '4rem'}} role="status">
              <span className="visually-hidden">Chargement...</span>
            </div>
            <h3 className="text-gray-800 mt-4">Chargement du marché...</h3>
            <p className="text-gray-600">Récupération des annonces en cours</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100 py-16">
        <div className="container mx-auto px-4">
          <div className="max-w-2xl mx-auto">
            <div className="alert alert-danger shadow-lg">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <i className="bi bi-exclamation-triangle fs-3"></i>
                </div>
                <div className="ml-3">
                  <h3 className="alert-heading">Impossible de charger les annonces</h3>
                  <p className="mb-0">{error}</p>
                  <div className="mt-3">
                    <button 
                      className="btn btn-primary me-2"
                      onClick={loadAds}
                    >
                      <i className="bi bi-arrow-clockwise me-2"></i>
                      Réessayer
                    </button>
                    <Link to="/" className="btn btn-outline-secondary">
                      Retour à l'accueil
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-gray-100">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-blue-900 via-purple-900 to-indigo-900 text-white py-12 md:py-16">
        <div className="container mx-auto px-4 text-center">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Marketplace Crypto P2P Maroc
          </h1>
          <p className="text-xl text-gray-300 mb-6 max-w-3xl mx-auto">
            Achetez et vendez des cryptomonnaies en MAD avec des particuliers de confiance
          </p>
          
          {/* Stats rapides */}
          <div className="flex flex-wrap justify-center gap-4 mb-8">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
              <div className="text-2xl font-bold text-yellow-400">{ads.length}</div>
              <div className="text-gray-300 text-sm">Annonces actives</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
              <div className="text-2xl font-bold text-green-400">
                {ads.filter(a => a.type === 'buy').length}
              </div>
              <div className="text-gray-300 text-sm">Demandes d'achat</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg px-6 py-3">
              <div className="text-2xl font-bold text-red-400">
                {ads.filter(a => a.type === 'sell').length}
              </div>
              <div className="text-gray-300 text-sm">Offres de vente</div>
            </div>
          </div>
          
          {/* CTA Buttons */}
          {!isAuthenticated && (
            <div className="flex flex-col md:flex-row gap-4 justify-center mb-8">
              <Link 
                to="/register" 
                className="px-8 py-3 bg-yellow-500 text-black font-bold rounded-lg hover:bg-yellow-400 transition shadow-lg"
              >
                🚀 S'inscrire Gratuitement
              </Link>
              <Link 
                to="/login" 
                className="px-8 py-3 border-2 border-yellow-500 text-yellow-500 font-bold rounded-lg hover:bg-yellow-500 hover:text-black transition"
              >
                🔑 Se Connecter
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* Filtres et recherche */}
      <div className="container mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6">
            <i className="bi bi-filter me-2"></i>
            Trouvez l'offre parfaite
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            {/* Recherche */}
            <div className="md:col-span-2">
              <label className="text-gray-700 mb-2 block font-medium">Rechercher</label>
              <div className="relative">
                <input
                  type="text"
                  className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Rechercher par crypto, banque, vendeur..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                {searchTerm && (
                  <button 
                    className="absolute right-3 top-3 text-gray-500 hover:text-gray-700"
                    onClick={() => setSearchTerm('')}
                  >
                    <i className="bi bi-x-lg"></i>
                  </button>
                )}
              </div>
            </div>
            
            {/* Type */}
            <div>
              <label className="text-gray-700 mb-2 block font-medium">Type</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as any)}
              >
                <option value="all">Tous types</option>
                <option value="buy">Achat</option>
                <option value="sell">Vente</option>
              </select>
            </div>
            
            {/* Devise */}
            <div>
              <label className="text-gray-700 mb-2 block font-medium">Devise</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={currencyFilter}
                onChange={(e) => setCurrencyFilter(e.target.value)}
              >
                <option value="all">Toutes devises</option>
                {uniqueCurrencies.map(code => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
            </div>
            
            {/* Trier par */}
            <div>
              <label className="text-gray-700 mb-2 block font-medium">Trier par</label>
              <select
                className="w-full p-3 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="created">Plus récent</option>
                <option value="price">Prix</option>
                <option value="amount">Montant</option>
              </select>
            </div>
          </div>
          
          {/* Résultats */}
          <div className="mt-6 pt-6 border-t border-gray-200">
            <div className="flex justify-between items-center">
              <div>
                <span className="text-lg font-semibold text-gray-800">
                  {filteredAds.length} annonce{filteredAds.length !== 1 ? 's' : ''} trouvée{filteredAds.length !== 1 ? 's' : ''}
                </span>
                {searchTerm && (
                  <span className="text-gray-600 ml-2">
                    pour "{searchTerm}"
                  </span>
                )}
              </div>
              <div className="text-gray-600">
                <i className="bi bi-arrow-clockwise me-1"></i>
                Mise à jour en temps réel
              </div>
            </div>
          </div>
        </div>

        {/* Liste des annonces */}
        {filteredAds.length === 0 ? (
          <div className="text-center py-16 bg-white rounded-xl shadow-sm">
            <div className="max-w-md mx-auto">
              <i className="bi bi-inbox text-5xl text-gray-400 mb-4"></i>
              <h3 className="text-2xl font-bold text-gray-800 mb-2">Aucune annonce trouvée</h3>
              <p className="text-gray-600 mb-6">
                {searchTerm || typeFilter !== 'all' || currencyFilter !== 'all'
                  ? 'Ajustez vos critères de recherche ou revenez plus tard.'
                  : 'Aucune annonce active pour le moment. Soyez le premier à publier !'
                }
              </p>
              <div className="space-x-3">
                {(searchTerm || typeFilter !== 'all' || currencyFilter !== 'all') && (
                  <button 
                    className="px-6 py-2 bg-gray-800 text-white rounded-lg hover:bg-gray-700 transition"
                    onClick={() => {
                      setSearchTerm('');
                      setTypeFilter('all');
                      setCurrencyFilter('all');
                    }}
                  >
                    Réinitialiser les filtres
                  </button>
                )}
                {isAuthenticated ? (
                  <button 
                    className="px-6 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition"
                    onClick={handleCreateAd}
                  >
                    <i className="bi bi-plus-circle me-2"></i>
                    Créer une annonce
                  </button>
                ) : (
                  <Link 
                    to="/register" 
                    className="px-6 py-2 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 transition inline-block"
                  >
                    <i className="bi bi-person-plus me-2"></i>
                    Créer un compte gratuit
                  </Link>
                )}
              </div>
            </div>
          </div>
        ) : (
          <>
            {/* Grid des annonces */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredAds.map((ad) => (
                <div key={ad.id} className="bg-white rounded-xl shadow-md hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-blue-300">
                  {/* En-tête avec badges */}
                  <div className="p-6 border-b border-gray-100">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <span className={`inline-block px-3 py-1 rounded-full text-sm font-semibold ${ad.type === 'buy' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                          {ad.type === 'buy' ? '🛒 ACHAT' : '💰 VENTE'}
                        </span>
                        <div className="text-sm text-gray-500 mt-2">
                          <i className="bi bi-clock me-1"></i>
                          {formatDate(ad.createdAt)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-blue-600">
                          {formatPrice(ad.price)} MAD
                        </div>
                        <div className="text-gray-500">/{ad.currency?.code}</div>
                      </div>
                    </div>
                    
                    {/* Titre */}
                    <h3 className="text-xl font-bold text-gray-900 mb-3">
                      {ad.type === 'buy' ? 'Achat de' : 'Vente de'} {ad.amount} {ad.currency?.code}
                    </h3>
                    
                    {/* Méthode de paiement */}
                    <div className="flex items-center text-gray-700 mb-3">
                      <i className="bi bi-bank text-gray-500 me-2"></i>
                      <span className="font-medium">{ad.paymentMethod}</span>
                    </div>
                    
                    {/* Conditions */}
                    {ad.terms && (
                      <div className="mb-4">
                        <div className="flex items-center text-gray-600 mb-1">
                          <i className="bi bi-chat-left-text me-2"></i>
                          <span className="text-sm font-medium">Conditions</span>
                        </div>
                        <p className="text-gray-600 text-sm line-clamp-2">
                          {ad.terms}
                        </p>
                      </div>
                    )}
                  </div>
                  
                  {/* Infos transaction */}
                  <div className="p-6 bg-gray-50 rounded-b-xl">
                    {/* Totaux */}
                    <div className="mb-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-gray-600">Montant total</span>
                        <span className="text-xl font-bold text-gray-900">
                          {calculateTotal(ad).toLocaleString('fr-MA')} MAD
                        </span>
                      </div>
                      
                      {/* Limites */}
                      {(ad.minAmountPerTransaction || ad.maxAmountPerTransaction) && (
                        <div className="text-sm text-gray-500">
                          <i className="bi bi-sliders me-1"></i>
                          {ad.minAmountPerTransaction ? `Min: ${ad.minAmountPerTransaction}` : 'Sans min'} / 
                          {ad.maxAmountPerTransaction ? ` Max: ${ad.maxAmountPerTransaction}` : 'Sans max'}
                        </div>
                      )}
                    </div>
                    
                    {/* Vendeur/Acheteur */}
                    <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                      <div>
                        <div className="text-sm text-gray-600">
                          {ad.type === 'buy' ? 'Acheteur' : 'Vendeur'}
                        </div>
                        <div className="flex items-center">
                          <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center me-2">
                            <i className="bi bi-person text-blue-600"></i>
                          </div>
                          <div>
                            <div className="font-semibold text-gray-900">
                              {ad.user?.fullName || 'Anonyme'}
                            </div>
                            <div className="flex items-center text-yellow-500 text-sm">
                              <i className="bi bi-star-fill me-1"></i>
                              {ad.user?.reputation?.toFixed(1) || '5.0'}
                            </div>
                          </div>
                        </div>
                      </div>
                      
                      {/* Durée */}
                      <div className="text-right">
                        <div className="text-sm text-gray-600">Durée limite</div>
                        <div className={`px-3 py-1 rounded-full ${ad.timeLimitMinutes < 60 ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}`}>
                          {ad.timeLimitMinutes >= 1440 
                            ? `${Math.floor(ad.timeLimitMinutes / 1440)}j`
                            : ad.timeLimitMinutes >= 60
                              ? `${Math.floor(ad.timeLimitMinutes / 60)}h`
                              : `${ad.timeLimitMinutes}min`
                          }
                        </div>
                      </div>
                    </div>
                    
                    {/* Boutons d'action */}
                    <div className="mt-6 space-y-3">
                      {isAuthenticated ? (
                        <>
                          <button 
                            className="w-full py-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white font-bold rounded-lg hover:from-blue-700 hover:to-blue-800 transition shadow-md"
                            onClick={() => {
                              alert(`Contactez ${ad.user.fullName} pour cette annonce. Redirection vers le dashboard pour plus d'actions.`);
                              navigate('/dashboard/ads');
                            }}
                          >
                            ✉️ Contacter le {ad.type === 'buy' ? 'vendeur' : 'acheteur'}
                          </button>
                          <button 
                            className="w-full py-2 text-center border border-blue-600 text-blue-600 font-medium rounded-lg hover:bg-blue-50 transition"
                            onClick={handleCreateAd}
                          >
                            Créer une annonce similaire
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                            className="w-full py-3 bg-gradient-to-r from-yellow-500 to-yellow-600 text-black font-bold rounded-lg hover:from-yellow-600 hover:to-yellow-700 transition shadow-md"
                            onClick={handleViewDetails}
                          >
                            🔐 Se connecter pour échanger
                          </button>
                          <div className="text-center text-gray-500 text-sm">
                            <i className="bi bi-shield-check me-1"></i>
                            Gratuit • Sécurisé • Rapide
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Call to Action pour non connectés */}
            {!isAuthenticated && filteredAds.length > 0 && (
              <div className="mt-12 bg-gradient-to-r from-blue-900 to-purple-800 rounded-2xl p-8 text-center text-white shadow-xl">
                <div className="max-w-3xl mx-auto">
                  <h3 className="text-2xl font-bold mb-4">
                    Prêt à commencer à échanger ?
                  </h3>
                  <p className="text-blue-100 mb-6">
                    Rejoignez {filteredAds.length} annonces actives et des milliers d'utilisateurs 
                    qui échangent en toute confiance.
                  </p>
                  <div className="flex flex-col md:flex-row gap-4 justify-center">
                    <Link 
                      to="/register" 
                      className="px-8 py-3 bg-white text-blue-900 font-bold rounded-lg hover:bg-gray-100 transition shadow-lg"
                    >
                      <i className="bi bi-rocket me-2"></i>
                      Créer un compte gratuit
                    </Link>
                    <Link 
                      to="/login" 
                      className="px-8 py-3 border-2 border-white text-white font-bold rounded-lg hover:bg-white hover:text-blue-900 transition"
                    >
                      <i className="bi bi-box-arrow-in-right me-2"></i>
                      Se connecter
                    </Link>
                  </div>
                </div>
              </div>
            )}
            
            {/* Statistiques */}
            <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="text-3xl font-bold text-green-600">
                  {ads.filter(a => a.type === 'buy').length}
                </div>
                <div className="text-gray-600">Demandes d'achat</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="text-3xl font-bold text-red-600">
                  {ads.filter(a => a.type === 'sell').length}
                </div>
                <div className="text-gray-600">Offres de vente</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="text-3xl font-bold text-blue-600">
                  {ads.reduce((total, ad) => total + ad.amount, 0).toFixed(0)}
                </div>
                <div className="text-gray-600">{uniqueCurrencies[0] || 'Crypto'} disponibles</div>
              </div>
              <div className="bg-white p-6 rounded-xl shadow-sm text-center">
                <div className="text-3xl font-bold text-purple-600">
                  {ads.reduce((total, ad) => total + calculateTotal(ad), 0).toLocaleString('fr-MA').split(',')[0]}K
                </div>
                <div className="text-gray-600">MAD en circulation</div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default PublicAdList;