import React, { useState, useEffect } from "react";
import useAxiosPrivate from "../hooks/useAxiosPrivate";
import { Search, UserPlus, UserMinus, Check, X } from "lucide-react";
import useAuth from "../hooks/useAuth";
import "./Profile.css";

const Profile = () => {
  const { auth } = useAuth();
  const axiosPrivate = useAxiosPrivate();

  const [userInfo, setUserInfo] = useState({
    name: "",
    userType: "",
    email: "",
    age: "",
    weight: "",
    height: "",
    gender: "",
  });

  const [connectedTrainers, setConnectedTrainers] = useState([]);
  const [connectedTrainees, setConnectedTrainees] = useState([]);
  const [trainerRequests, setTrainerRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const fetchUserDetails = async () => {
      const USER_DETAILS_URL =
        auth?.user?.userType === "trainer"
          ? "/api/trainer/profile"
          : "/api/trainee/profile";

      try {
        const response = await axiosPrivate.get(USER_DETAILS_URL);
        setUserInfo(response.data.user);
      } catch (error) {
        console.error("Error fetching user details:", error);
      }
    };

    fetchUserDetails();
  }, []);

  useEffect(() => {
    if (userInfo?.userType === "trainee") {
      // Fetch connected trainers
      const fetchConnectedTrainers = async () => {
        try {
          const response = await axiosPrivate.get(
            "/api/trainee/request/connected-trainers"
          );
          setConnectedTrainers(response.data.trainers || []);
        } catch (error) {
          console.error("Error fetching connected trainers:", error);
        }
      };

      // Fetch trainer requests
      const fetchTrainerRequests = async () => {
        try {
          const response = await axiosPrivate.get(
            "/api/trainee/request/show-request"
          );
          setTrainerRequests(response.data.trainers || []);
        } catch (error) {
          console.error("Error fetching trainer requests:", error);
        }
      };

      fetchConnectedTrainers();
      fetchTrainerRequests();
    }

    if (userInfo?.userType === "trainer") {
      // Fetch connected trainees for trainers
      const fetchConnectedTrainees = async () => {
        try {
          const response = await axiosPrivate.get(
            "/api/trainer/request/connected-trainees"
          );
          setConnectedTrainees(response.data.trainees || []);
        } catch (error) {
          console.error("Error fetching connected trainees:", error);
        }
      };

      fetchConnectedTrainees();
    }
  }, [userInfo?.userType, axiosPrivate]);

  const handleSearch = async (e) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    try {
      const response = await axiosPrivate.post(
        `/api/trainer/request/search-trainee`,
        { username: searchQuery }
      );
      console.log("Search trainee response:", response);

      if (response.data && response.data.trainee) {
        setSearchResults([response.data.trainee]);
        setErrorMessage("");
      } else {
        setSearchResults([]);
        setErrorMessage("Trainee not found");
      }
    } catch (error) {
      console.error("Error searching trainee:", error);
      setSearchResults([]);

      if (error.response) {
        const status = error.response.status;
        if (status === 404)
          setErrorMessage("Trainee with given username is not found");
        else if (status === 410) setErrorMessage("Trainee already added");
        else if (status === 411) setErrorMessage("Request already sent");
        else setErrorMessage("An error occurred while searching.");
      }
    }
  };

  const handleSendRequest = async (traineeUsername) => {
    try {
      await axiosPrivate.post("/api/trainer/request/send", {
        username: traineeUsername,
      });
      console.log("Request sent successfully");
      setSearchResults([]);
      setErrorMessage("Request sent successfully");
      setSearchQuery("");
    } catch (error) {
      console.error("Error sending request:", error);
      if (error.response) {
        const status = error.response.status;
        if (status === 410) setErrorMessage("Trainee already added");
        else if (status === 411) setErrorMessage("Request already sent");
        else setErrorMessage("An error occurred while searching.");
      }
    }
  };

  const handleAcceptRequest = async (trainerUsername) => {
    try {
      await axiosPrivate.post("/api/trainee/request/accept", {
        username: trainerUsername,
      });

      // Update UI by removing request and adding to connected trainers
      const acceptedTrainer = trainerRequests.find(
        (request) => request.username === trainerUsername
      );

      setTrainerRequests((prevRequests) =>
        prevRequests.filter((request) => request.username !== trainerUsername)
      );

      if (acceptedTrainer) {
        setConnectedTrainers((prevTrainers) => [
          ...prevTrainers,
          acceptedTrainer,
        ]);
      }

      console.log("Request accepted successfully");
    } catch (error) {
      console.error("Error accepting request:", error);
    }
  };

  const handleRejectRequest = async (trainerUsername) => {
    try {
      await axiosPrivate.post("/api/trainee/request/reject", {
        username: trainerUsername,
      });

      // Update UI by removing request
      setTrainerRequests((prevRequests) =>
        prevRequests.filter((request) => request.username !== trainerUsername)
      );

      console.log("Request rejected successfully");
    } catch (error) {
      console.error("Error rejecting request:", error);
    }
  };

  const handleRemoveTrainer = async (trainerUsername) => {
    try {
      await axiosPrivate.post("/api/trainee/request/remove-trainer", {
        username: trainerUsername,
      });

      // Update UI by removing trainer from connected list
      setConnectedTrainers((prevTrainers) =>
        prevTrainers.filter((trainer) => trainer.username !== trainerUsername)
      );

      console.log("Trainer removed successfully");
    } catch (error) {
      console.error("Error removing trainer:", error);
    }
  };

  const handleRemoveTrainee = async (traineeUsername) => {
    try {
      await axiosPrivate.post("/api/trainer/request/remove-trainee", {
        username: traineeUsername,
      });

      // Update UI by removing trainee from connected list
      setConnectedTrainees((prevTrainees) =>
        prevTrainees.filter((trainee) => trainee.username !== traineeUsername)
      );

      console.log("Trainee removed successfully");
    } catch (error) {
      console.error("Error removing trainee:", error);
    }
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
              { label: "Username", value: userInfo?.name || "N/A" },
              { label: "User Type", value: userInfo?.userType || "N/A" },
              { label: "Email", value: userInfo?.email || "N/A" },
              { label: "Age", value: userInfo?.age || "N/A" },
              {
                label: "Weight",
                value: userInfo?.weight ? `${userInfo.weight} kg` : "N/A",
              },
              {
                label: "Height",
                value: userInfo?.height ? `${userInfo.height} cm` : "N/A",
              },
            ].map((info, index) => (
              <div key={index} className="info-card">
                <label>{info.label}</label>
                <p>{info.value}</p>
              </div>
            ))}
          </div>
        </div>

        {userInfo?.userType === "trainer" && (
          <>
            {/* Search Trainees Section */}
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

              {errorMessage && <p className="no-results">{errorMessage}</p>}

              {Array.isArray(searchResults) && searchResults.length > 0 && (
                <div className="search-results">
                  {searchResults.map((trainee, index) => (
                    <div key={trainee.id || index} className="search-result-card">
                      <div className="trainee-info">
                        <p className="trainee-name">{trainee.name}</p>
                        <p className="trainee-username">@{trainee.username}</p>
                      </div>
                      <button
                        onClick={() => handleSendRequest(trainee.username)}
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

            {/* Connected Trainees Section */}
            <div className="profile-section connected-trainees">
              <h2>Connected Trainees</h2>
              <div className="trainees-list">
                {connectedTrainees.length === 0 ? (
                  <p className="no-connections">No connected trainees</p>
                ) : (
                  connectedTrainees.map((trainee, index) => (
                    <div key={trainee.id || index} className="trainee-card">
                      <div className="trainee-info">
                        <p className="trainee-name">{trainee.name}</p>
                        <p className="trainee-username">@{trainee.username}</p>
                      </div>
                      <button
                        className="btn-remove"
                        onClick={() => handleRemoveTrainee(trainee.username)}
                      >
                        <UserMinus size={16} />
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}

        {userInfo?.userType === "trainee" && (
          <>
            {/* Connected Trainers Section */}
            <div className="profile-section connected-trainers">
              <h2>Connected Trainers</h2>
              <div className="trainers-list">
                {connectedTrainers.length === 0 ? (
                  <p className="no-connections">No connected trainers</p>
                ) : (
                  connectedTrainers.map((trainer, index) => (
                    <div key={trainer.id || index} className="trainer-card">
                      <div className="trainer-info">
                        <p className="trainer-name">{trainer.name}</p>
                        <p className="trainer-username">@{trainer.username}</p>
                      </div>
                      <button
                        className="btn-remove"
                        onClick={() => handleRemoveTrainer(trainer.username)}
                      >
                        <UserMinus size={16} />
                        Remove
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Trainer Requests Section */}
            <div className="profile-section trainer-requests">
              <h2>Trainers Request</h2>
              <div className="requests-list">
                {trainerRequests.length === 0 ? (
                  <p className="no-requests">No pending requests</p>
                ) : (
                  trainerRequests.map((request, index) => (
                    <div key={request.id || index} className="request-card">
                      <div className="trainer-info">
                        <p className="trainer-name">{request.name}</p>
                        <p className="trainer-username">@{request.username}</p>
                      </div>
                      <div className="request-actions">
                        <button
                          className="btn-accept"
                          onClick={() => handleAcceptRequest(request.username)}
                        >
                          <Check size={16} />
                          Accept
                        </button>
                        <button
                          className="btn-reject"
                          onClick={() => handleRejectRequest(request.username)}
                        >
                          <X size={16} />
                          Reject
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default Profile;
