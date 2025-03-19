import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
// import { useSelector, useDispatch } from 'react-redux';
import { Activity, User, LogOut, Menu } from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import useAuth from '../hooks/useAuth';

import './Navbar.css';

const Navbar = () => {


  const [isDropDownOpen, setIsDropDownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { auth, setAuth } = useAuth();

  const userType=auth?.data?.userType;
  const name=auth?.data?.name;
  const isAuthenticated=!!auth?.data;

  const toggleDropdown = () => setIsDropDownOpen(!isDropDownOpen);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  // const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    setAuth(null);
    // dispatch(logout());
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Activity size={24} />
        <Link to="/">FitTrack AI</Link>
        {isAuthenticated && <div className="type">{userType}</div>}
      </div>

      {/* Mobile Menu Toggle Button */}
      <button className="menu-toggle" onClick={toggleMenu}>
        <Menu size={24} />
      </button>

      <div className={`navbar-links ${isMenuOpen ? 'active' : ''}`}>
        <Link to="/" onClick={toggleMenu}>Home</Link>
        {isAuthenticated && (
          <>
            <Link to="/dashboard" onClick={toggleMenu}>Dashboard</Link>
            {userType === 'trainee' && <Link to="/video-feed" onClick={toggleMenu}>Video Feed</Link>}
            <Link to="/profile" onClick={toggleMenu}>Profile</Link>
          </>
        )}
        <Link to="/contact" onClick={toggleMenu}>Contact Us</Link>

        {!isAuthenticated ? (
          <>
            <Link to="/login" className="btn-login" onClick={toggleMenu}>Log In</Link>
            <Link to="/signup" className="btn-signup" onClick={toggleMenu}>Sign Up</Link>
          </>
        ) : (
          <div className="user-menu">
            <div className="user-name" onClick={toggleDropdown}>
              <User size={16} />
              {name}
            </div>
            {isDropDownOpen && (
              <div className="dropdown-menu">
                <button onClick={handleLogout} className="btn-logout">
                  <LogOut size={16} />
                  Logout
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </nav>
  );
};

export default Navbar;