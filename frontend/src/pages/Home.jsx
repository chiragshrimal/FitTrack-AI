import React from 'react';
import { Link } from 'react-router-dom';
import { Activity, Award, BarChart2, Users } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import Footer from '../components/Footer';
import './Home.css';

const Home = () => {
  const { isAuthenticated, userType, user } = useSelector((state) => state.auth);

  return (
    <div className="home">
      <div className="hero-section">
        <div className="hero-content">
          <h1>AI-Powered Fitness Tracking & Coaching</h1>
          <p>Improve your form, track your progress, and achieve your fitness goals with personalized AI coaching.</p>
          <div className="cta-buttons">
            {!isAuthenticated ? (
              <>
                <Link to="/login" className="btn-login">Log In</Link>
                <Link to="/signup" className="btn-signup">Sign Up</Link>
              </>
            ) : (
              <div className="user-menu">
                <Link to="/dashboard" className="btn-signup">Go to Dashboard</Link>
              </div>
            )}
          </div>
        </div>
        <div className="hero-image">
          <Activity size={200} className="hero-icon" />
        </div>
      </div>

      <div className="features-section">
        <h2>Key Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <Award size={48} className="feature-icon" />
            <h3>Real-time Form Analysis</h3>
            <p>Get instant feedback on your exercise form using advanced AI technology.</p>
          </div>
          <div className="feature-card">
            <BarChart2 size={48} className="feature-icon" />
            <h3>Progress Tracking</h3>
            <p>Monitor your fitness journey with detailed analytics and progress charts.</p>
          </div>
          {/* <div className="feature-card">
            <Activity size={48} className="feature-icon" />
            <h3>Personal AI Coach</h3>
            <p>Receive personalized workout recommendations and form corrections.</p>
          </div> */}
          <div className="feature-card">
            <Users size={48} className="feature-icon" />
            <h3>Expert Trainers</h3>
            <p>Connect with certified trainers for professional guidance and support.</p>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default Home;