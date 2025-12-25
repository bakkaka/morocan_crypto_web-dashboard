// src/components/Home.tsx - VERSION OPTIMISÉE
import React from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";

const Home: React.FC = () => {
  const { isAuthenticated, user } = useAuth();

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
            {!isAuthenticated ? (
              <Link to="/register" className="btn btn-warning btn-lg text-dark fw-bold px-4 py-3">
                <i className="bi bi-person-plus me-2"></i>
                Commencer maintenant
              </Link>
            ) : (
              <Link to="/dashboard" className="btn btn-success btn-lg fw-bold px-4 py-3">
                <i className="bi bi-speedometer2 me-2"></i>
                Aller au Dashboard
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* FEATURES SECTION */}
      <section className="container py-5">
        <div className="row text-center">
          {[
            {
              icon: "bi-shield-check",
              color: "primary",
              title: "Sécurisé",
              description: "Vos transactions sont protégées 24/7 avec notre technologie de pointe.",
              bgColor: "bg-primary bg-opacity-10",
              textColor: "text-primary"
            },
            {
              icon: "bi-lightning",
              color: "success",
              title: "Rapide",
              description: "Déposez et retirez vos fonds en quelques minutes seulement.",
              bgColor: "bg-success bg-opacity-10",
              textColor: "text-success"
            },
            {
              icon: "bi-people",
              color: "info",
              title: "Fiable",
              description: "Des milliers d'utilisateurs nous font confiance depuis 2020.",
              bgColor: "bg-info bg-opacity-10",
              textColor: "text-info"
            }
          ].map((feature, index) => (
            <div key={index} className="col-md-4 mb-4">
              <div className="p-4 border rounded shadow-sm bg-white feature-card h-100">
                <div className="d-flex justify-content-center mb-3">
                  <div className={`${feature.bgColor} rounded-circle p-3`}>
                    <i className={`bi ${feature.icon} ${feature.textColor} fs-1`}></i>
                  </div>
                </div>
                <h4 className={`fw-bold mb-3 ${feature.textColor}`}>{feature.title}</h4>
                <p className="text-muted">{feature.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* STATS SECTION */}
      <section className="bg-light py-5">
        <div className="container">
          <div className="row text-center">
            {[
              { value: "50M+", label: "DH Échangés", color: "primary" },
              { value: "10K+", label: "Utilisateurs Actifs", color: "success" },
              { value: "99.8%", label: "Transactions Réussies", color: "info" }
            ].map((stat, index) => (
              <div key={index} className="col-md-4 mb-4">
                <div className="p-4">
                  <div className={`text-${stat.color} display-4 fw-bold`}>{stat.value}</div>
                  <div className="text-muted fs-5">{stat.label}</div>
                </div>
              </div>
            ))}
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
            {!isAuthenticated ? (
              <Link to="/register" className="btn btn-primary btn-lg px-4 py-3">
                <i className="bi bi-rocket me-2"></i>
                S'inscrire gratuitement
              </Link>
            ) : (
              <Link to="/dashboard/ads/create" className="btn btn-success btn-lg px-4 py-3">
                <i className="bi bi-plus-circle me-2"></i>
                Créer une annonce
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* BONUS: Quick Navigation for Logged-in Users */}
      {isAuthenticated && (
        <section className="container py-4">
          <div className="row">
            <div className="col-12">
              <div className="card bg-light border-0">
                <div className="card-body">
                  <div className="d-flex flex-wrap justify-content-center gap-3">
                    <Link to="/dashboard" className="btn btn-outline-primary">
                      <i className="bi bi-speedometer2 me-2"></i>
                      Dashboard
                    </Link>
                    <Link to="/dashboard/ads" className="btn btn-outline-success">
                      <i className="bi bi-megaphone me-2"></i>
                      Mes annonces
                    </Link>
                    <Link to="/dashboard/transactions" className="btn btn-outline-info">
                      <i className="bi bi-arrow-left-right me-2"></i>
                      Mes transactions
                    </Link>
                    <Link to="/dashboard/wallet" className="btn btn-outline-warning">
                      <i className="bi bi-wallet2 me-2"></i>
                      Mon portefeuille
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>
      )}
    </div>
  );
};

export default Home;