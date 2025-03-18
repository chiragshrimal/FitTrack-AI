import React, { useState, useEffect, useContext } from "react";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUser } from "../store/slices/authSlice";
import "./SignUp.css";
import AuthContext from "../context/AuthProvider";
import axios from "axios";

const Login = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    userType: "trainee",
  });

  const [LOGIN_URL, setLOGIN_URL] = useState("http://192.168.133.164:5000/api/trainee/login");
  const [errors, setErrors] = useState({});
  const [formError, setFormError] = useState("");
  const [isFormValid, setIsFormValid] = useState(false);

  const { setAuth } = useContext(AuthContext);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    if (formData.userType === "trainer") {
      setLOGIN_URL("http://192.168.133.164:5000/api/trainer/login");
    }
  }, [formData.userType]);

  useEffect(() => {
    const isValid =
      Object.values(errors).every((error) => !error) &&
      Object.values(formData).every((value) => value !== "");
    setIsFormValid(isValid);
  }, [formData, errors]);

  const validateField = (name, value) => {
    let errorMessage = "";
    switch (name) {
      case "email":
        if (!/\S+@\S+\.\S+/.test(value)) errorMessage = "Invalid email format";
        break;
      case "password":
        if (value.length < 8) errorMessage = "Password must be at least 8 characters";
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
      const response = await axios.post(LOGIN_URL, formData, {
        headers: { "Content-Type": "application/json" },
        withCredentials: true,
      });
      console.log(response.data);
      console.log(response.data.token);

      setAuth({
        email: formData.email,
        userType: formData.userType,
      });

      dispatch(setUser({ email: formData.email, userType: formData.userType }));
      navigate("/");
    } catch (error) {
      if (error.response?.status === 401) {
        setFormError("Invalid email or password");
      } else if (error.response?.status === 403) {
        setFormError("Access denied. Please check your user type.");
      } else {
        setFormError("Login failed. Please try again.");
      }
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Login</h2>
        {formError && <div className="error">{formError}</div>}
        <form onSubmit={handleSubmit}>
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

          <div className="form-group">
            <label htmlFor="userType">User Type</label>
            <select id="userType" name="userType" value={formData.userType} onChange={handleChange}>
              <option value="trainee">Trainee</option>
              <option value="trainer">Trainer</option>
            </select>
          </div>

          <button type="submit" className="btn-primary" disabled={!isFormValid}>
            Login
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
