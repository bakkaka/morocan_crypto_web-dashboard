// src/components/Home.tsx
import React from "react";
import { Link } from "react-router-dom";

const Home: React.FC = () => {
  return (
    <div>
      {/* HERO SECTION */}
      <section className="hero-gradient text-white py-5">
        <div className="container text-center py-5">
          <h1 className="display-4 fw-bold mb-3">
            La plateforme P2P la plus simple au Maroc 🇲🇦
          </h1>
          <p className="lead mb-4 fs-4">
            Achetez et vendez vos cryptomonnaies de manière rapide, sécurisée et
            facile.
          </p>

          <div className="d-flex flex-column flex-md-row justify-content-center gap-3">
            <Link to="/market" className="btn btn-light btn-lg fw-bold px-4 py-3">
              <i className="bi bi-shop me-2"></i>
              Voir le Marketplace
            </Link>
            <Link to="/register" className="btn btn-warning btn-lg text-dark fw-bold px-4 py-3">
              <i className="bi bi-person-plus me-2"></i>
              Commencer maintenant
            </Link>
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="container py-5">
        <div className="row text-center">
          <div className="col-md-4 mb-4">
            <div className="p-4 border rounded shadow-sm bg-white feature-card h-100">
              <div className="d-flex justify-content-center mb-3">
                <div className="bg-primary bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-shield-check text-primary fs-1"></i>
                </div>
              </div>
              <h4 className="fw-bold mb-3 text-primary">Sécurisé</h4>
              <p className="text-muted">
                Vos transactions sont protégées 24/7 avec notre technologie de pointe.
              </p>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="p-4 border rounded shadow-sm bg-white feature-card h-100">
              <div className="d-flex justify-content-center mb-3">
                <div className="bg-success bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-lightning text-success fs-1"></i>
                </div>
              </div>
              <h4 className="fw-bold mb-3 text-success">Rapide</h4>
              <p className="text-muted">
                Déposez et retirez vos fonds en quelques minutes seulement.
              </p>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="p-4 border rounded shadow-sm bg-white feature-card h-100">
              <div className="d-flex justify-content-center mb-3">
                <div className="bg-info bg-opacity-10 rounded-circle p-3">
                  <i className="bi bi-people text-info fs-1"></i>
                </div>
              </div>
              <h4 className="fw-bold mb-3 text-info">Fiable</h4>
              <p className="text-muted">
                Des milliers d'utilisateurs nous font confiance depuis 2020.
              </p>
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
                <div className="text-primary display-4 fw-bold">50M+</div>
                <div className="text-muted fs-5">DH Échangés</div>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="p-4">
                <div className="text-success display-4 fw-bold">10K+</div>
                <div className="text-muted fs-5">Utilisateurs Actifs</div>
              </div>
            </div>
            <div className="col-md-4 mb-4">
              <div className="p-4">
                <div className="text-info display-4 fw-bold">99.8%</div>
                <div className="text-muted fs-5">Transactions Réussies</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA SECTION */}
      <section className="bg-warning py-5">
        <div className="container text-center">
          <h2 className="display-5 fw-bold mb-4">Prêt à commencer ?</h2>
          <p className="fs-5 mb-4">
            Rejoignez la plus grande communauté crypto P2P du Maroc
          </p>
          <div className="d-flex flex-column flex-md-row justify-content-center gap-3">
            <Link to="/market" className="btn btn-dark btn-lg px-4 py-3">
              <i className="bi bi-eye me-2"></i>
              Explorer les annonces
            </Link>
            <Link to="/register" className="btn btn-primary btn-lg px-4 py-3">
              <i className="bi bi-rocket me-2"></i>
              S'inscrire gratuitement
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;