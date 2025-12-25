// src/components/AnalyticsPage.tsx
import React from 'react';

const AnalyticsPage: React.FC = () => {
  const cryptoData = [
    { name: 'Bitcoin (BTC)', price: '$43,256.78', change: '+2.3%', volume: '$32.4B', marketCap: '$845B' },
    { name: 'Ethereum (ETH)', price: '$2,345.67', change: '+1.8%', volume: '$18.7B', marketCap: '$281B' },
    { name: 'Cardano (ADA)', price: '$0.5678', change: '+4.2%', volume: '$2.1B', marketCap: '$20B' },
    { name: 'Solana (SOL)', price: '$98.45', change: '+5.7%', volume: '$3.4B', marketCap: '$41B' },
    { name: 'Polkadot (DOT)', price: '$7.89', change: '+0.8%', volume: '$890M', marketCap: '$10B' },
  ];

  const chartData = {
    labels: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin'],
    datasets: [
      { label: 'Bitcoin', data: [40000, 42000, 39000, 43000, 42500, 43256], borderColor: '#f7931a' },
      { label: 'Ethereum', data: [2200, 2400, 2100, 2350, 2300, 2345], borderColor: '#627eea' },
    ],
  };

  return (
    <div className="container-fluid py-4">
      <div className="row mb-4">
        <div className="col-12">
          <h1 className="h2">
            <i className="bi bi-graph-up me-2"></i>
            Analytics & Marchés
          </h1>
          <p className="text-muted">Analysez les tendances du marché en temps réel</p>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-primary shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-primary text-uppercase mb-1">
                    Capitalisation Totale
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">$1.65T</div>
                  <div className="mt-2 mb-0 text-muted text-xs">
                    <span className="text-success mr-2">
                      <i className="bi bi-arrow-up"></i> 3.48%
                    </span>
                    <span>Depuis hier</span>
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-globe fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-success shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-success text-uppercase mb-1">
                    Volume 24h
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">$68.2B</div>
                  <div className="mt-2 mb-0 text-muted text-xs">
                    <span className="text-success mr-2">
                      <i className="bi bi-arrow-up"></i> 12.6%
                    </span>
                    <span>Augmentation</span>
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-activity fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-info shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-info text-uppercase mb-1">
                    BTC Dominance
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">51.2%</div>
                  <div className="mt-2 mb-0 text-muted text-xs">
                    <span className="text-danger mr-2">
                      <i className="bi bi-arrow-down"></i> 0.8%
                    </span>
                    <span>Depuis hier</span>
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-pie-chart fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-xl-3 col-md-6 mb-4">
          <div className="card border-left-warning shadow h-100 py-2">
            <div className="card-body">
              <div className="row no-gutters align-items-center">
                <div className="col mr-2">
                  <div className="text-xs font-weight-bold text-warning text-uppercase mb-1">
                    Altcoins Index
                  </div>
                  <div className="h5 mb-0 font-weight-bold text-gray-800">145.6</div>
                  <div className="mt-2 mb-0 text-muted text-xs">
                    <span className="text-success mr-2">
                      <i className="bi bi-arrow-up"></i> 2.4%
                    </span>
                    <span>Cette semaine</span>
                  </div>
                </div>
                <div className="col-auto">
                  <i className="bi bi-bar-chart fa-2x text-gray-300"></i>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row mb-4">
        <div className="col-lg-8">
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Performance du Marché</h6>
            </div>
            <div className="card-body">
              <div className="chart-area">
                <div className="text-center p-5">
                  <div className="placeholder-graph mb-3">
                    <div className="d-flex align-items-end justify-content-around" style={{ height: '200px' }}>
                      {chartData.datasets[0].data.map((value, index) => (
                        <div
                          key={index}
                          className="bg-primary"
                          style={{
                            width: '40px',
                            height: `${(value / 50000) * 180}px`,
                            borderRadius: '4px 4px 0 0',
                          }}
                        ></div>
                      ))}
                    </div>
                  </div>
                  <p className="text-muted mb-0">
                    <i className="bi bi-info-circle me-1"></i>
                    Graphique montrant la performance des principales cryptomonnaies
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="col-lg-4">
          <div className="card shadow mb-4">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Top Gagnants</h6>
            </div>
            <div className="card-body">
              <div className="list-group">
                <div className="list-group-item border-0 d-flex align-items-center justify-content-between px-0 mb-2">
                  <div>
                    <div className="d-flex align-items-center">
                      <div className="symbol symbol-30 me-3">
                        <span className="symbol-label bg-light-success">
                          <i className="bi bi-arrow-up-right text-success"></i>
                        </span>
                      </div>
                      <div>
                        <div className="fw-bold">Solana (SOL)</div>
                        <div className="text-muted fs-7">+12.4%</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="fw-bold">$98.45</div>
                  </div>
                </div>
                <div className="list-group-item border-0 d-flex align-items-center justify-content-between px-0 mb-2">
                  <div>
                    <div className="d-flex align-items-center">
                      <div className="symbol symbol-30 me-3">
                        <span className="symbol-label bg-light-success">
                          <i className="bi bi-arrow-up-right text-success"></i>
                        </span>
                      </div>
                      <div>
                        <div className="fw-bold">Cardano (ADA)</div>
                        <div className="text-muted fs-7">+8.2%</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="fw-bold">$0.5678</div>
                  </div>
                </div>
                <div className="list-group-item border-0 d-flex align-items-center justify-content-between px-0">
                  <div>
                    <div className="d-flex align-items-center">
                      <div className="symbol symbol-30 me-3">
                        <span className="symbol-label bg-light-danger">
                          <i className="bi bi-arrow-down-left text-danger"></i>
                        </span>
                      </div>
                      <div>
                        <div className="fw-bold">Ripple (XRP)</div>
                        <div className="text-muted fs-7">-2.1%</div>
                      </div>
                    </div>
                  </div>
                  <div className="text-end">
                    <div className="fw-bold">$0.6234</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="row">
        <div className="col-12">
          <div className="card shadow">
            <div className="card-header py-3">
              <h6 className="m-0 font-weight-bold text-primary">Données du Marché</h6>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-bordered" id="dataTable">
                  <thead>
                    <tr>
                      <th>Cryptomonnaie</th>
                      <th>Prix</th>
                      <th>Variation 24h</th>
                      <th>Volume 24h</th>
                      <th>Market Cap</th>
                      <th>Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {cryptoData.map((crypto, index) => (
                      <tr key={index}>
                        <td>
                          <div className="d-flex align-items-center">
                            <div className="symbol symbol-40 me-3">
                              <span className="symbol-label bg-light-primary">
                                <i className="bi bi-currency-bitcoin text-primary"></i>
                              </span>
                            </div>
                            <div>
                              <div className="fw-bold">{crypto.name.split(' (')[0]}</div>
                              <div className="text-muted fs-7">{crypto.name.match(/\(([^)]+)\)/)?.[1]}</div>
                            </div>
                          </div>
                        </td>
                        <td className="fw-bold">{crypto.price}</td>
                        <td>
                          <span className={`badge ${crypto.change.startsWith('+') ? 'badge-success' : 'badge-danger'}`}>
                            {crypto.change}
                          </span>
                        </td>
                        <td>{crypto.volume}</td>
                        <td>{crypto.marketCap}</td>
                        <td>
                          <button className="btn btn-sm btn-outline-primary">
                            <i className="bi bi-eye me-1"></i>
                            Détails
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsPage;