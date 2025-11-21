import React from "react";
import { Link, Outlet } from "react-router-dom";
import "bootstrap/dist/css/bootstrap.min.css";

const Dashboard: React.FC = () => {
  return (
    <div className="d-flex" style={{ minHeight: "100vh" }}>

      {/* SIDEBAR */}
      <div
        className="bg-dark text-white p-3"
        style={{ width: "250px", minHeight: "100vh" }}
      >
        <h4 className="fw-bold mb-4">Dashboard</h4>

        <ul className="nav flex-column">
          <li className="nav-item mb-2">
            <Link className="nav-link text-white" to="/dashboard/users">
              Utilisateurs
            </Link>
          </li>

          <li className="nav-item mb-2">
            <Link className="nav-link text-white" to="/dashboard/ads">
              Annonces
            </Link>
          </li>

          <li className="nav-item mb-2">
            <Link className="nav-link text-white" to="/dashboard/transactions">
              Transactions
            </Link>
          </li>

          <li className="nav-item mb-2">
            <Link className="nav-link text-white" to="/dashboard/profile">
              Profil
            </Link>
          </li>
        </ul>
      </div>

      {/* CONTENT */}
      <div className="flex-grow-1 p-4 bg-light">
        <Outlet />
      </div>
    </div>
  );
};

export default Dashboard;
