// src/components/ContactPage.tsx
import React from 'react';

const ContactPage: React.FC = () => {
  return (
    <div className="container-fluid py-5">
      <div className="row justify-content-center">
        <div className="col-lg-8">
          <div className="text-center mb-5">
            <h1 className="display-5 fw-bold mb-3">
              Contact
            </h1>
            <p className="lead text-muted">
              Contactez notre équipe de support
            </p>
          </div>
          
          <div className="card">
            <div className="card-body">
              <h3>Nous contacter</h3>
              <p>
                Pour toute question, contactez-nous à: support@votreplateforme.com
              </p>
              {/* Contenu statique */}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ContactPage;