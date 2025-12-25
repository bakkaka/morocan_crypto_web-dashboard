// src/components/AboutPage.tsx
import React from 'react';

const AboutPage: React.FC = () => {
  const teamMembers = [
    {
      name: 'Jean Dubois',
      role: 'CEO & Fondateur',
      bio: 'Expert en blockchain avec 10 ans d\'expérience',
      image: 'JD',
      color: 'primary',
    },
    {
      name: 'Marie Lambert',
      role: 'Directrice Technique',
      bio: 'Ancienne développeuse chez Google, spécialiste sécurité',
      image: 'ML',
      color: 'success',
    },
    {
      name: 'Thomas Martin',
      role: 'Responsable Trading',
      bio: 'Trader professionnel depuis 2015',
      image: 'TM',
      color: 'warning',
    },
    {
      name: 'Sophie Bernard',
      role: 'Responsable Clientèle',
      bio: '15 ans d\'expérience dans le service client financier',
      image: 'SB',
      color: 'info',
    },
  ];

  const milestones = [
    { year: '2018', title: 'Fondation', description: 'Lancement de la plateforme avec 3 cryptomonnaies' },
    { year: '2019', title: 'Expansion', description: 'Ouverture à l\'international et ajout de 50+ cryptos' },
    { year: '2020', title: 'Innovation', description: 'Lancement de notre wallet mobile sécurisé' },
    { year: '2021', title: 'Croissance', description: 'Dépassement du million d\'utilisateurs' },
    { year: '2022', title: 'Reconnaissance', description: 'Certification ISO 27001 pour la sécurité' },
    { year: '2023', title: 'Leadership', description: 'Devenu leader européen du trading crypto' },
  ];

  return (
    <div className="container-fluid py-5">
      <div className="row justify-content-center mb-5">
        <div className="col-lg-10 text-center">
          <h1 className="display-5 fw-bold mb-4">
            <i className="bi bi-building me-2"></i>
            À Propos de Nous
          </h1>
          <p className="lead text-muted mb-4">
            Leader européen dans l'échange de cryptomonnaies depuis 2018
          </p>
        </div>
      </div>

      <div className="row mb-5">
        <div className="col-lg-6 mb-4">
          <div className="card h-100 border-0 shadow-lg">
            <div className="card-body p-5">
              <h2 className="h1 mb-4">Notre Mission</h2>
              <p className="fs-5 mb-4">
                Nous croyons que les cryptomonnaies et la technologie blockchain vont révolutionner 
                le système financier mondial. Notre mission est de rendre cette révolution accessible 
                à tous, en toute sécurité et simplicité.
              </p>
              <div className="d-flex align-items-center">
                <div className="flex-shrink-0">
                  <i className="bi bi-check-circle-fill text-success fs-1"></i>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-2">Accessibilité</h5>
                  <p className="text-muted mb-0">Rendre les cryptomonnaies accessibles à tous</p>
                </div>
              </div>
              <div className="d-flex align-items-center mt-4">
                <div className="flex-shrink-0">
                  <i className="bi bi-check-circle-fill text-success fs-1"></i>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-2">Sécurité</h5>
                  <p className="text-muted mb-0">Protéger les actifs de nos utilisateurs</p>
                </div>
              </div>
              <div className="d-flex align-items-center mt-4">
                <div className="flex-shrink-0">
                  <i className="bi bi-check-circle-fill text-success fs-1"></i>
                </div>
                <div className="flex-grow-1 ms-3">
                  <h5 className="mb-2">Innovation</h5>
                  <p className="text-muted mb-0">Pousser les limites de la technologie</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-6 mb-4">
          <div className="card h-100 border-0 shadow-lg">
            <div className="card-body p-5">
              <h2 className="h1 mb-4">Nos Valeurs</h2>
              <div className="row">
                <div className="col-md-6 mb-4">
                  <div className="text-center p-4">
                    <div className="icon-circle icon-circle-xl bg-light-primary text-primary mb-3">
                      <i className="bi bi-shield-check fs-2"></i>
                    </div>
                    <h4 className="h5 mb-2">Transparence</h4>
                    <p className="text-muted mb-0">Nous croyons en une communication claire et honnête</p>
                  </div>
                </div>
                <div className="col-md-6 mb-4">
                  <div className="text-center p-4">
                    <div className="icon-circle icon-circle-xl bg-light-success text-success mb-3">
                      <i className="bi bi-people fs-2"></i>
                    </div>
                    <h4 className="h5 mb-2">Collaboration</h4>
                    <p className="text-muted mb-0">Nous travaillons ensemble pour atteindre nos objectifs</p>
                  </div>
                </div>
                <div className="col-md-6 mb-4">
                  <div className="text-center p-4">
                    <div className="icon-circle icon-circle-xl bg-light-warning text-warning mb-3">
                      <i className="bi bi-lightning fs-2"></i>
                    </div>
                    <h4 className="h5 mb-2">Innovation</h4>
                    <p className="text-muted mb-0">Nous repoussons constamment les limites</p>
                  </div>
                </div>
                <div className="col-md-6 mb-4">
                  <div className="text-center p-4">
                    <div className="icon-circle icon-circle-xl bg-light-info text-info mb-3">
                      <i className="bi bi-heart fs-2"></i>
                    </div>
                    <h4 className="h5 mb-2">Passion</h4>
                    <p className="text-muted mb-0">Nous aimons ce que nous faisons</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-5">
        <div className="col-12 text-center mb-5">
          <h2 className="h1 mb-3">Notre Équipe</h2>
          <p className="text-muted lead">Des experts passionnés par la blockchain</p>
        </div>
        
        {teamMembers.map((member, index) => (
          <div key={index} className="col-lg-3 col-md-6 mb-4">
            <div className="card h-100 border-0 shadow-sm hover-lift">
              <div className="card-body text-center p-4">
                <div className={`avatar avatar-xxl bg-${member.color} text-white rounded-circle mb-4`}>
                  <span className="avatar-initials fs-2">{member.image}</span>
                </div>
                <h4 className="card-title mb-2">{member.name}</h4>
                <div className={`badge bg-${member.color}-subtle text-${member.color} mb-3`}>
                  {member.role}
                </div>
                <p className="card-text text-muted">{member.bio}</p>
                <div className="d-flex justify-content-center gap-2">
                  <button className="btn btn-sm btn-outline-secondary">
                    <i className="bi bi-linkedin"></i>
                  </button>
                  <button className="btn btn-sm btn-outline-secondary">
                    <i className="bi bi-twitter"></i>
                  </button>
                  <button className="btn btn-sm btn-outline-secondary">
                    <i className="bi bi-envelope"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="row mb-5">
        <div className="col-12">
          <div className="card bg-dark text-white">
            <div className="card-body p-5">
              <div className="row align-items-center">
                <div className="col-lg-8">
                  <h2 className="h1 mb-3">Chiffres Clés</h2>
                  <div className="row text-center">
                    <div className="col-md-3 mb-4">
                      <div className="display-4 fw-bold">1M+</div>
                      <div className="text-muted">Utilisateurs</div>
                    </div>
                    <div className="col-md-3 mb-4">
                      <div className="display-4 fw-bold">150+</div>
                      <div className="text-muted">Cryptomonnaies</div>
                    </div>
                    <div className="col-md-3 mb-4">
                      <div className="display-4 fw-bold">€10B+</div>
                      <div className="text-muted">Volume mensuel</div>
                    </div>
                    <div className="col-md-3 mb-4">
                      <div className="display-4 fw-bold">50+</div>
                      <div className="text-muted">Pays</div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-4 text-center">
                  <i className="bi bi-trophy display-1 opacity-50"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header bg-transparent">
              <h2 className="h1 mb-0">
                <i className="bi bi-calendar-event me-2"></i>
                Notre Histoire
              </h2>
            </div>
            <div className="card-body">
              <div className="timeline">
                {milestones.map((milestone, index) => (
                  <div key={index} className="timeline-item">
                    <div className="timeline-line w-20px"></div>
                    <div className="timeline-icon symbol symbol-circle symbol-20px me-4">
                      <span className="symbol-label bg-light-primary">
                        <i className="bi bi-star-fill text-primary"></i>
                      </span>
                    </div>
                    <div className="timeline-content mb-10">
                      <div className="pe-3 mb-2">
                        <span className="fs-3 fw-bold text-primary me-2">{milestone.year}</span>
                        <span className="fs-5 fw-bold text-gray-800">{milestone.title}</span>
                      </div>
                      <div className="fs-6 text-muted">{milestone.description}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutPage;