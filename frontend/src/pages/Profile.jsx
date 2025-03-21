import React, { useState } from 'react';
import { Search, UserPlus, UserMinus, Check, X } from 'lucide-react';
import useAuth from '../hooks/useAuth';
import './Profile.css';

const Profile = () => {
  const { auth } = useAuth();

  const userInfo = {
    name: auth?.user?.name,
    userType: auth?.user?.userType,
    email: auth?.user?.email,
    age: auth?.user?.age,
    weight: auth?.user?.weight,
    height: auth?.user?.height,
    gender: auth?.user?.gender
  }

  

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [trainerRequests, setTrainerRequests] = useState([
    { id: 1, trainerName: 'John Doe', status: 'pending' },
    { id: 2, trainerName: 'Jane Smith', status: 'accepted' }
  ]);

  const handleSearch = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      setSearchResults([
        { id: 1, username: searchQuery, name: 'Test User' }
      ]);
    }
  };

  const handleSendRequest = (traineeId) => {
    console.log('Sending request to trainee:', traineeId);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleTrainerRequest = (requestId, action) => {
    setTrainerRequests(requests =>
      requests.map(request =>
        request.id === requestId
          ? { ...request, status: action }
          : request
      )
    );
  };

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1>Profile</h1>
      </div>

      <div className="profile-content">
        <div className="profile-section personal-info">
          <h2>Personal Information</h2>
          <div className="info-grid">
            {[
              { label: 'Username', value : userInfo.name || 'N/A' },
              { label: 'User Type', value: userInfo.userType || 'N/A' },
              { label: 'Email', value: userInfo.email || 'N/A' },
              { label: 'Age', value: userInfo.age || 'N/A' },
              { label: 'Weight', value: userInfo.weight ? `${userInfo.weight} kg` : 'N/A' },
              { label: 'Height', value: userInfo.height ? `${userInfo.height} cm` : 'N/A' }
            ].map((info, index) => (
              <div key={index} className="info-card">
                <label>{info.label}</label>
                <p>{info.value}</p>
              </div>
            ))}
          </div>
        </div>

        {userInfo?.userType === 'trainer' && (
          <div className="profile-section search-trainees">
            <h2>Search Trainees</h2>
            <form onSubmit={handleSearch} className="search-form">
              <div className="search-input">
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                <button type="submit">
                  <Search size={20} />
                </button>
              </div>
            </form>
            {searchResults.length > 0 && (
              <div className="search-results">
                {searchResults.map(trainee => (
                  <div key={trainee.id} className="search-result-card">
                    <div className="trainee-info">
                      <p className="trainee-name">{trainee.name}</p>
                      <p className="trainee-username">@{trainee.username}</p>
                    </div>
                    <button
                      onClick={() => handleSendRequest(trainee.id)}
                      className="btn-send-request"
                    >
                      <UserPlus size={16} />
                      Send Request
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {userInfo?.userType === 'trainee' && (
          <div className="profile-section trainer-requests">
            <h2>Trainer Requests & Connections</h2>
            <div className="requests-list">
              {trainerRequests.map(request => (
                <div key={request.id} className="request-card">
                  <p>Trainer: {request.trainerName}</p>
                  {request.status === 'pending' && (
                    <div className="request-actions">
                      <button
                        className="btn-accept"
                        onClick={() => handleTrainerRequest(request.id, 'accepted')}
                      >
                        <Check size={16} />
                        Accept
                      </button>
                      <button
                        className="btn-reject"
                        onClick={() => handleTrainerRequest(request.id, 'rejected')}
                      >
                        <X size={16} />
                        Reject
                      </button>
                    </div>
                  )}
                  {request.status === 'accepted' && (
                    <div className="connection-actions">
                      <p className="status-accepted">
                        <Check size={16} />
                        Connected
                      </p>
                      <button
                        className="btn-remove"
                        onClick={() => handleTrainerRequest(request.id, 'removed')}
                      >
                        <UserMinus size={16} />
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Profile;