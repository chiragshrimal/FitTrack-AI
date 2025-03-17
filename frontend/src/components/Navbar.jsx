import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { Activity, User, LogOut } from 'lucide-react';
import { logout } from '../store/slices/authSlice';
import './Navbar.css';

const Navbar = () => {
  const [isDropDownOpen, setIsDropDownOpen] = useState(false);

  const toggleDropdown = () => {
    setIsDropDownOpen(!isDropDownOpen);
  };

  const { isAuthenticated, userType, user } = useSelector((state) => state.auth);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleLogout = () => {
    dispatch(logout());
    navigate('/');
  };

  return (
    <nav className="navbar">
      <div className="navbar-brand">
        <Activity size={24} />
        <Link to="/">FitTrack AI</Link>
        {isAuthenticated && <div className="type">{userType}</div>}
      </div>
      <div className="navbar-links">
        <Link to="/">Home</Link>
        {isAuthenticated && (
          <>
            <Link to="/dashboard">Dashboard</Link>
            {userType === 'trainee' && <Link to="/video-feed">Video Feed</Link>}
            <Link to="/profile">Profile</Link>
          </>
        )}
        <Link to="/contact">Contact Us</Link>
        {!isAuthenticated ? (
          <>
            <Link to="/login" className="btn-login">Log In</Link>
            <Link to="/signup" className="btn-signup">Sign Up</Link>
          </>
        ) : (
          <div className="user-menu">
            <div className="user-name" onClick={toggleDropdown}>
              <User size={16} />
              {user?.username}
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