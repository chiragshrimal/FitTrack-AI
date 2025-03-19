import React from "react";
import { Link } from "react-router-dom";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTriangleExclamation, faKey, faUserPlus } from "@fortawesome/free-solid-svg-icons";
import Footer from "../components/Footer";
import "./PageNotFound.css";

const PageNotFound = () => {
  return (
    <div className="not-found">
      <div className="hero-section">
        <div className="hero-content">
          <h1>404 - Page Not Found</h1>
          <p>Oops! The page you are looking for does not exist.</p>
          <div className="cta-buttons">
            <Link to="/" className="btn-primary">Go to Home</Link>
          </div>
        </div>
        <div className="hero-image">
          <FontAwesomeIcon icon={faTriangleExclamation} size="6x" className="hero-icon" />
        </div>
      </div>

      <div className="features-section">
        <h2>Quick Links</h2>
        <div className="features-grid">
          <div className="feature-card">
            <Link to="/login" className="feature-link">
              <FontAwesomeIcon icon={faKey} className="feature-icon" /> Login
            </Link>
          </div>
          <div className="feature-card">
            <Link to="/signup" className="feature-link">
              <FontAwesomeIcon icon={faUserPlus} className="feature-icon" /> Sign Up
            </Link>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default PageNotFound;
