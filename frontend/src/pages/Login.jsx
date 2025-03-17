import React, { useState, useContext } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUser } from "../store/slices/authSlice";
import "./SignUp.css";
import AuthContext from "../context/AuthProvider";
import axios from "axios";

const LOGIN_URL = "/login";

const Login = () => {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
    userType: "trainee",
  });
  const [error, setError] = useState("");
  const { setAuth } = useContext(AuthContext);

  const dispatch = useDispatch();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault(); // Prevent the default form submission behavior

    // Basic validation
    if (!formData.username || !formData.password || !formData.userType) {
      setError("Please fill in all fields");
      return;
    }

    setError("");

    // Make an API call to authenticate
    try {
      const response = await axios.post(LOGIN_URL, JSON.stringify(formData), {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      console.log(JSON.stringify(response.data));
      const accessToken = response?.data?.accessToken;
      setAuth({
        username: formData.username,
        userType: formData.userType,
        accessToken,
      });
      dispatch(
        setUser({ username: formData.username, userType: formData.userType })
      );
    } catch (error) {
      if (error.response) {
        if (error.response.status === 401) {
          setError("Invalid username or password");
        } else if (error.response.status === 403) {
          setError("Access denied. Please check your user type.");
        } else {
          setError("Login failed. Please try again.");
        }
      } else if (error.request) {
        setError("No response from server. Please try again later.");
      } else {
        setError("Login failed. Please try again.");
      }
      console.error("Login error:", error);
    }
    navigate("/");
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        {error && <div className="error">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              required
            />
          </div>
          <div className="form-group">
            <label htmlFor="userType">User Type</label>
            <select
              id="userType"
              name="userType"
              value={formData.userType}
              onChange={handleChange}
            >
              <option value="">Select User Type</option>
              <option value="trainee">Trainee</option>
              <option value="trainer">Trainer</option>
            </select>
          </div>
          <button type="submit" className="btn-primary">
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
