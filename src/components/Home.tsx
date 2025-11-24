// src/components/Home.tsx
import React from "react";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <div>
      {/* HERO SECTION */}
      <section className="bg-primary text-white py-5">
        <div className="container text-center py-5">
          <h1 className="display-4 fw-bold mb-3">
            La plateforme P2P la plus simple au Maroc 🇲🇦
          </h1>
          <p className="lead mb-4">
            Achetez et vendez vos cryptomonnaies de manière rapide, sécurisée et
            facile.
          </p>

          <Link to="/register" className="btn btn-warning btn-lg text-dark fw-bold">
            Commencer maintenant
          </Link>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="container py-5">
        <div className="row text-center">
          <div className="col-md-4 mb-4">
            <div className="p-4 border rounded shadow-sm bg-white">
              <h4 className="fw-bold mb-3 text-primary">Sécurisé</h4>
              <p className="text-muted">Vos transactions sont protégées 24/7 avec notre technologie.</p>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="p-4 border rounded shadow-sm bg-white">
              <h4 className="fw-bold mb-3 text-success">Rapide</h4>
              <p className="text-muted">Déposez et retirez vos fonds en quelques minutes.</p>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="p-4 border rounded shadow-sm bg-white">
              <h4 className="fw-bold mb-3 text-info">Fiable</h4>
              <p className="text-muted">Des milliers d'utilisateurs nous font confiance.</p>
            </div>
          </div>
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="bg-light py-5">
        <div className="container">
          <div className="row text-center">
            <div className="col-md-4 mb-4">
              <div className="p-4">
                <div className="text-primary display-6 fw-bold">50M+</div>
                <div className="text-muted">DH Échangés</div>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="p-4">
                <div className="text-success display-6 fw-bold">10K+</div>
                <div className="text-muted">Utilisateurs Actifs</div>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="p-4">
                <div className="text-info display-6 fw-bold">99.8%</div>
                <div className="text-muted">Transactions Réussies</div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;