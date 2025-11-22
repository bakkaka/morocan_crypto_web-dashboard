import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import "bootstrap/dist/css/bootstrap.min.css";


const Home: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-purple-900 to-indigo-900 text-white">
      {/* Navigation */}
      <nav className="container mx-auto px-6 py-4">
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-yellow-500 rounded-lg flex items-center justify-center">
              <span className="text-black font-bold text-xl">₿</span>
            </div>
            <span className="text-2xl font-bold">MoroccanCrypto</span>
          </div>
          
          <div className="hidden md:flex space-x-8">
            <Link to="/market" className="hover:text-yellow-400 transition">Marché</Link>
            <Link to="/how-it-works" className="hover:text-yellow-400 transition">Comment ça marche</Link>
            <Link to="/about" className="hover:text-yellow-400 transition">À propos</Link>
          </div>

          {/* ⭐⭐ CHANGEMENT DYNAMIQUE SELON CONNEXION ⭐⭐ */}
          <div className="flex space-x-4">
            {isAuthenticated ? (
              // Si connecté
              <div className="flex items-center space-x-4">
                <span>Bonjour, {user?.fullName}</span>
                <Link 
                  to="/dashboard" 
                  className="px-6 py-2 bg-yellow-500 text-black font-semibold rounded-lg hover:bg-yellow-400 transition"
                >
                  Tableau de bord
                </Link>
                <button 
                  onClick={logout}
                  className="px-6 py-2 border border-red-500 text-red-500 rounded-lg hover:bg-red-500 hover:text-white transition"
                >
                  Déconnexion
                </button>
              </div>
            ) : (
              // Si non connecté
              <>
                <Link to="/login" className="px-6 py-2 rounded-lg border border-yellow-500 text-yellow-500 hover:bg-yellow-500 hover:text-black transition">
                  Connexion
                </Link>
                <Link to="/register" className="px-6 py-2 rounded-lg bg-yellow-500 text-black font-semibold hover:bg-yellow-400 transition">
                  S'inscrire
                </Link>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* Le reste de votre HeroSection reste identique */}
      <div className="container mx-auto px-6 py-20 text-center">
        <h1 className="text-5xl md:text-7xl font-bold mb-6">
          Échangez des <span className="text-yellow-400">cryptos</span> en toute <span className="text-green-400">confiance</span>
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-gray-300 max-w-3xl mx-auto">
          La première plateforme P2P marocaine pour acheter et vendre des cryptomonnaies en dirhams, 
          avec sécurité garantie et frais réduits.
        </p>
        
        <div className="flex flex-col md:flex-row justify-center space-y-4 md:space-y-0 md:space-x-6 mb-12">
          {isAuthenticated ? (
            <Link to="/dashboard" className="px-8 py-4 bg-yellow-500 text-black font-bold text-lg rounded-lg hover:bg-yellow-400 transition transform hover:scale-105">
              Accéder au Dashboard 🚀
            </Link>
          ) : (
            <Link to="/register" className="px-8 py-4 bg-yellow-500 text-black font-bold text-lg rounded-lg hover:bg-yellow-400 transition transform hover:scale-105">
              Commencer Maintenant 🚀
            </Link>
          )}
          <Link to="/market" className="px-8 py-4 border border-white text-white font-bold text-lg rounded-lg hover:bg-white hover:text-black transition">
            Voir le Marché
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-yellow-400">50M+</div>
            <div className="text-gray-300">DH Échangés</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-green-400">10K+</div>
            <div className="text-gray-300">Utilisateurs Actifs</div>
          </div>
          <div className="bg-white/10 backdrop-blur-lg rounded-xl p-6 border border-white/20">
            <div className="text-3xl font-bold text-blue-400">99.8%</div>
            <div className="text-gray-300">Transactions Réussies</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Home;