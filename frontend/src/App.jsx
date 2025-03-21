import React from 'react';
import { Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import ContactUs from './pages/ContactUs';
import Profile from './pages/Profile';
import VideoFeed from './pages/VideoFeed';
import PageNotFound from './pages/PageNotFound';
import RequireAuth from './components/RequireAuth';
import AccessDenied from './pages/AccessDenied';
import PersistLogin from './components/PersistLogin';
import './App.css';

function App() {
  return (
      <div className="app">
        <Navbar />
        <Routes>
          {/* public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />
          <Route path="/contact" element={<ContactUs />} />

          {/* private routes */}
          <Route element={<PersistLogin />}>
            <Route element={<RequireAuth allowedUsers={["trainee", "trainer"]} />}>
              <Route path="/profile" element={<Profile />} />
              <Route path="/dashboard" element={<Dashboard />} />
            </Route>

            <Route element={<RequireAuth allowedUsers={["trainee"]} />}>
              <Route path="/video-feed" element={<VideoFeed />} />
            </Route>
          </Route>

          {/* error routes */}
          <Route path="/access-denied" element={<AccessDenied />} />
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </div>
  );
}

export default App;