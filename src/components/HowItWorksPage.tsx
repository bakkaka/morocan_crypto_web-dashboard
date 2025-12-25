// src/components/HowItWorksPage.tsx
import React from 'react';

const HowItWorksPage: React.FC = () => {
  return (
    <div className="container-fluid py-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="text-center mb-5">
            <h1 className="display-5 fw-bold mb-3">
              Comment ça marche ?
            </h1>
            <p className="lead text-muted">
              Guide d'utilisation de notre plateforme P2P
            </p>
          </div>
          
          <div className="card">
            <div className="card-body">
              <h3>Guide d'utilisation</h3>
              <p>
                Cette page explique le fonctionnement de notre plateforme.
              </p>
              {/* Contenu statique */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HowItWorksPage;