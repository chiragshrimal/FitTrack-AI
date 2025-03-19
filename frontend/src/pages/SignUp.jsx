import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import axiosInstance from "../api/axios";
import useAuth from "../hooks/useAuth";
import "./SignUp.css";

const SignUp = () => {
  const [formData, setFormData] = useState({
    username: "",
    name: "",
    email: "",
    password: "",
    age: "",
    weight: "",
    height: "",
    userType: "trainee",
    gender: "male",
  });

  const [SIGNUP_URL, setSIGNUP_URL] = useState("/api/trainee/register");
  const { setAuth } = useAuth();

  useEffect(() => {
    if (formData.userType === "trainer") {
      setSIGNUP_URL("/api/trainer/register");
    }
  }, [formData.userType]);

  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);

  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from.pathname || "/";

  useEffect(() => {
    const isValid =
      Object.values(errors).every((error) => !error) &&
      Object.values(formData).every((value) => value !== "");
    setIsFormValid(isValid);
  }, [formData, errors]);

  const validateField = (name, value) => {
    let errorMessage = "";
    switch (name) {
      case "username":
        if (value.length < 3) errorMessage = "Username must be at least 3 characters";
        break;
      case "name":
        if (!/^[a-zA-Z\s]+$/.test(value)) errorMessage = "Only letters and spaces allowed";
        break;
      case "email":
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) errorMessage = "Invalid email format";
        break;
      case "password":
        if (value.length < 8) errorMessage = "Password must be at least 8 characters";
        break;
      case "age":
        if (value < 13 || value > 120) errorMessage = "Invalid age";
        break;
      case "weight":
      case "height":
        if (value <= 0) errorMessage = "Must be greater than 0";
        break;
      default:
        break;
    }
    return errorMessage;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    setErrors({ ...errors, [name]: validateField(name, value) });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const newErrors = {};
    let hasErrors = false;

    Object.entries(formData).forEach(([name, value]) => {
      const error = validateField(name, value);
      newErrors[name] = error;
      if (error) hasErrors = true;
    });
    setErrors(newErrors);

    if (hasErrors) {
      setFormError("Please correct the errors before submitting");
      return;
    }

    setFormError("");
    try {
      const response = await axiosInstance.post(SIGNUP_URL, formData, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      console.log(response.data.data.username);
      setAuth(response.data);
      navigate(from, {replace:true});
    } catch (error) {
      if (error.response?.status === 409) {
        setFormError("Email already exists");
      } else {
        setFormError("Sign Up failed. Try again later");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Sign Up</h2>
        {formError && <div className="error">{formError}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              className={errors.username ? "error-input" : ""}
              required
            />
            {errors.username && <div className="input-error">{errors.username}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="name">Name</label>
            <input
              type="text"
              id="name"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className={errors.name ? "error-input" : ""}
              required
            />
            {errors.name && <div className="input-error">{errors.name}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={errors.email ? "error-input" : ""}
              required
            />
            {errors.email && <div className="input-error">{errors.email}</div>}
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              className={errors.password ? "error-input" : ""}
              required
            />
            {errors.password && <div className="input-error">{errors.password}</div>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="age">Age</label>
              <input
                type="number"
                id="age"
                name="age"
                value={formData.age}
                onChange={handleChange}
                className={errors.age ? "error-input" : ""}
                required
              />
              {errors.age && <div className="input-error">{errors.age}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="weight">Weight (kg)</label>
              <input
                type="number"
                id="weight"
                name="weight"
                value={formData.weight}
                onChange={handleChange}
                className={errors.weight ? "error-input" : ""}
                required
              />
              {errors.weight && <div className="input-error">{errors.weight}</div>}
            </div>

            <div className="form-group">
              <label htmlFor="height">Height (cm)</label>
              <input
                type="number"
                id="height"
                name="height"
                value={formData.height}
                onChange={handleChange}
                className={errors.height ? "error-input" : ""}
                required
              />
              {errors.height && <div className="input-error">{errors.height}</div>}
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="gender">Gender</label>
            <select id="gender" name="gender" value={formData.gender} onChange={handleChange}>
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="userType">User Type</label>
            <select
              id="userType"
              name="userType"
              value={formData.userType}
              onChange={handleChange}
            >
              <option value="trainee">Trainee</option>
              <option value="trainer">Trainer</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={!isFormValid}>
            Sign Up
          </button>
        </form>
      </div>
    </div>
  );
};

export default SignUp;
