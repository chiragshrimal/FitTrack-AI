import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Activity, Mail, Phone, MapPin, Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import useLogout from '../hooks/useLogout';

import './Footer.css';

const Footer = () => {

  const { auth } = useAuth();
  const logout=useLogout();
  const navigate = useNavigate();

  const handleLogout =() => {
    logout();
    navigate('/');
  };

  return (
    <footer className="footer">
      <div className="footer-content">
        <div className="footer-section">
          <div className="footer-brand">
            <Activity size={24} />
            <h3>FitTrack AI</h3>
          </div>
          <p>Transform your fitness journey with AI-powered tracking and personalized coaching.</p>
        </div>
        
        <div className="footer-section">
          <h3>Contact Info</h3>
          <div className="contact-item">
            <Mail size={16} />
            <span>support@fitTrack.ai</span>
          </div>
          <div className="contact-item">
            <Phone size={16} />
            <span>+91 1234567890</span>
          </div>
          <div className="contact-item">
            <MapPin size={16} />
            <span>Indian Institute of Information Technology Guwahati (IIITG), Near IT Park, Bongora, Guwahati, Assam</span>
          </div>
        </div>
        
        <div className="footer-section">
          <h3>Quick Links</h3>
          <ul>
            <li><a href="/">Home</a></li>
            <li><a href="/contact">Contact Us</a></li>
            {!auth?.user ? (
              <li><a href="/login">Login</a></li>
            ) : (
              <li><a onClick={handleLogout} className="logout-btn">Logout</a></li>
            )}
          </ul>
        </div>
        
        <div className="footer-section">
          <h3>Follow Us</h3>
          <div className="social-links">
            <a href="#" className="social-link"><Facebook size={20} /></a>
            <a href="#" className="social-link"><Twitter size={20} /></a>
            <a href="#" className="social-link"><Instagram size={20} /></a>
            <a href="#" className="social-link"><Linkedin size={20} /></a>
          </div>
        </div>
      </div>
      
      <div className="footer-bottom">
        <p>&copy; {new Date().getFullYear()} FitTrack AI. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;