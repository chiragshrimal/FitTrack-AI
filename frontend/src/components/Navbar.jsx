import React, { useState, useCallback, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, User, LogOut, Menu } from 'lucide-react';
import { useSocket } from '../context/SocketProvider';
import useLogout from '../hooks/useLogout';
import useAuth from '../hooks/useAuth';

import './Navbar.css';

const Navbar = () => {

  const logout=useLogout();
  const {auth}=useAuth()

  // const socket = useSocket();
  // const exercise = "pushUp";

  const [isDropDownOpen, setIsDropDownOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const userType=auth?.user?.userType;
  const name=auth?.user?.name;
  const isAuthenticated=!!auth?.user;

  const toggleDropdown = () => setIsDropDownOpen(!isDropDownOpen);
  const toggleMenu = () => setIsMenuOpen(!isMenuOpen);

  const navigate = useNavigate();

  const handleLogout =() => {
    logout();
    navigate('/');
  };

  // const handleVideoFeed = useCallback(
  //   (e) => {
  //     e.preventDefault();
  //     socket.emit("room:join", { exercise });
  //   },
  //   [exercise, socket]
  // );

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