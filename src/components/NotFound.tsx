// src/components/NotFound.tsx
import React from 'react';
import { Link } from 'react-router-dom';

const NotFound: React.FC = () => {
  return (
    <div className="container text-center py-5">
      <div className="row justify-content-center">
        <div className="col-md-6">
          <h1 className="display-1 text-muted">404</h1>
          <h2 className="mb-4">Page non trouvée</h2>
          <p className="lead mb-4">
            La page que vous recherchez n'existe pas.
          </p>
          <Link to="/" className="btn btn-primary btn-lg">
            <i className="bi bi-house me-2"></i>
            Retour à l'accueil
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;