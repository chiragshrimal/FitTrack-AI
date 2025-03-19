import React from "react";
import { Link } from "react-router-dom";
import "./AccessDenied.css";

const AccessDenied = () => {
  return (
    <div className="access-denied">
      <h1>Access Denied</h1>
      <p>You do not have permission to view this page.</p>
      <Link to="/" className="btn-home">Go to Home</Link>
    </div>
  );
};

export default AccessDenied;
