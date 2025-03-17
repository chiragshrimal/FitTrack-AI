import React, { useState } from 'react';
import { useSelector } from 'react-redux';
import { Search, UserPlus, UserMinus, Check, X } from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const user = useSelector((state) => state.auth.user);
  const userType = useSelector((state) => state.auth.userType);
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [trainerRequests, setTrainerRequests] = useState([
    { id: 1, trainerName: 'John Doe', status: 'pending' },
    { id: 2, trainerName: 'Jane Smith', status: 'accepted' }
  ]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Here you would make an API call to search for trainees
    // For now, we'll simulate results
    if (searchQuery.trim()) {
      setSearchResults([
        { id: 1, username: searchQuery, name: 'Test User' }
      ]);
    }
  };

  const handleSendRequest = (traineeId) => {
    // Here you would make an API call to send the request
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
        <div className="profile-section">
          <h2>Personal Information</h2>
          <div className="info-grid">
            <div className="info-item">
              <label>Username</label>
              <p>{user?.username || 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>User Type</label>
              <p>{userType || 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>Email</label>
              <p>{user?.email || 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>Age</label>
              <p>{user?.age || 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>Weight</label>
              <p>{user?.weight ? `${user.weight} kg` : 'N/A'}</p>
            </div>
            <div className="info-item">
              <label>Height</label>
              <p>{user?.height ? `${user.height} cm` : 'N/A'}</p>
            </div>
          </div>
        </div>

        {userType === 'trainer' && (
          <div className="profile-section">
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
                  <div key={trainee.id} className="search-result-item">
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

        {userType === 'trainee' && (
          <div className="profile-section">
            <h2>Trainer Requests & Connections</h2>
            <div className="requests-list">
              {trainerRequests.map(request => (
                <div key={request.id} className="request-item">
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

        <div className="profile-section">
          <h2>Account Settings</h2>
          <button className="btn-primary">Change Password</button>
          <button className="btn-primary">Edit Profile</button>
        </div>
      </div>
    </div>
  );
};

export default Profile;