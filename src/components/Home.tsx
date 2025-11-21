// src/components/Home.tsx
import React from "react";
import { Link } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Home: React.FC = () => {
  return (
    <div className="bg-light" style={{ minHeight: "100vh" }}>
      {/* NAVBAR */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-primary">
        <div className="container">
          <a className="navbar-brand fw-bold" href="#">
            Moroccan Crypto
          </a>

          <button
            className="navbar-toggler"
            type="button"
            data-bs-toggle="collapse"
            data-bs-target="#navbarNav"
          >
            <span className="navbar-toggler-icon"></span>
          </button>

          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav ms-auto">
              <li className="nav-item">
                <Link to="/login" className="nav-link">
                  Se connecter
                </Link>
              </li>
              <li className="nav-item">
                <Link to="/register" className="btn btn-light ms-2">
                  Créer un compte
                </Link>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <header className="container text-center py-5">
        <h1 className="display-4 fw-bold mb-3">
          La plateforme P2P la plus simple au Maroc 🇲🇦
        </h1>
        <p className="lead mb-4">
          Achetez et vendez vos cryptomonnaies de manière rapide, sécurisée et
          facile.
        </p>

        <Link to="/register" className="btn btn-primary btn-lg">
          Commencer maintenant
        </Link>
      </header>

      {/* FEATURES */}
      <section className="container py-5">
        <div className="row text-center">
          <div className="col-md-4 mb-4">
            <div className="p-4 border rounded shadow-sm bg-white">
              <h4 className="fw-bold mb-3">Sécurisé</h4>
              <p>Vos transactions sont protégées 24/7 avec notre technologie.</p>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="p-4 border rounded shadow-sm bg-white">
              <h4 className="fw-bold mb-3">Rapide</h4>
              <p>Déposez et retirez vos fonds en quelques minutes.</p>
            </div>
          </div>

          <div className="col-md-4 mb-4">
            <div className="p-4 border rounded shadow-sm bg-white">
              <h4 className="fw-bold mb-3">Fiable</h4>
              <p>Des milliers d’utilisateurs nous font confiance.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Home;
