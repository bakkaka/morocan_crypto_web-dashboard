// src/components/PrivacyPage.tsx
import React from 'react';

const PrivacyPage: React.FC = () => {
  return (
    <div className="container-fluid py-5">
      <div className="row justify-content-center">
        <div className="col-lg-10">
          <div className="text-center mb-5">
            <h1 className="display-5 fw-bold mb-3">
              Politique de confidentialité
            </h1>
          </div>
          
          <div className="card">
            <div className="card-body">
              <h3>Protection des données</h3>
              <p>
                Nous respectons votre vie privée et protégeons vos données...
              </p>
              {/* Contenu statique */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrivacyPage;