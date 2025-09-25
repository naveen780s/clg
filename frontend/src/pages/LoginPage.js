import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { validationUtils } from '../services/utils';

const LoginPage = () => {
  const navigate = useNavigate();
  const { login, loading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false,
  });
  
  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validationUtils.isEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await login({
        email: formData.email,
        password: formData.password,
        rememberMe: formData.rememberMe,
      });
      navigate('/dashboard');
    } catch (error) {
      setErrors({
        submit: error.message || 'Login failed. Please try again.',
      });
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        {/* Left Side - Illustration */}
        <motion.div 
          className="auth-illustration"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="doodle-login-scene">
            <div className="login-character">
              <div className="character-head"></div>
              <div className="character-body"></div>
              <div className="character-laptop">
                <div className="laptop-screen"></div>
                <div className="laptop-keyboard"></div>
              </div>
            </div>
            <div className="floating-elements">
              <div className="element key">🔑</div>
              <div className="element lock">🔒</div>
              <div className="element check">✓</div>
            </div>
            <div className="welcome-message">
              <h2>Welcome Back!</h2>
              <p>Access your college gate pass system</p>
            </div>
          </div>
        </motion.div>

        {/* Right Side - Login Form */}
        <motion.div 
          className="auth-form-container"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="auth-form-wrapper">
            <div className="auth-header">
              <h1 className="auth-title">Sign In</h1>
              <p className="auth-subtitle">Enter your credentials to access your account</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form">
              {errors.submit && (
                <motion.div 
                  className="error-banner"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {errors.submit}
                </motion.div>
              )}

              <div className="form-group">
                <label htmlFor="email" className="form-label">
                  Email Address
                </label>
                <div className="input-wrapper">
                  <input
                    type="email"
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    className={`form-input ${errors.email ? 'error' : ''}`}
                    placeholder="Enter your email"
                    autoComplete="email"
                    data-cy="email-input"
                  />
                  <div className="input-icon">📧</div>
                </div>
                {errors.email && (
                  <span className="error-text">{errors.email}</span>
                )}
              </div>

              <div className="form-group">
                <label htmlFor="password" className="form-label">
                  Password
                </label>
                <div className="input-wrapper">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    id="password"
                    name="password"
                    value={formData.password}
                    onChange={handleInputChange}
                    className={`form-input ${errors.password ? 'error' : ''}`}
                    placeholder="Enter your password"
                    autoComplete="current-password"
                    data-cy="password-input"
                  />
                  <button
                    type="button"
                    className="password-toggle"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    {showPassword ? '👁️' : '👁️‍🗨️'}
                  </button>
                </div>
                {errors.password && (
                  <span className="error-text">{errors.password}</span>
                )}
              </div>

              <div className="form-options">
                <label className="checkbox-wrapper">
                  <input
                    type="checkbox"
                    name="rememberMe"
                    checked={formData.rememberMe}
                    onChange={handleInputChange}
                  />
                  <span className="checkbox-custom"></span>
                  <span className="checkbox-label">Remember me</span>
                </label>
                
                <Link to="/forgot-password" className="forgot-link">
                  Forgot password?
                </Link>
              </div>

              <motion.button
                type="submit"
                className="btn btn-primary btn-full"
                disabled={loading}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                data-cy="login-button"
              >
                {loading ? (
                  <div className="btn-loading">
                    <div className="spinner"></div>
                    <span>Signing in...</span>
                  </div>
                ) : (
                  'Sign In'
                )}
              </motion.button>
            </form>

            <div className="auth-footer">
              <p>
                Don't have an account?{' '}
                <Link to="/register" className="auth-link">
                  Sign up here
                </Link>
              </p>
            </div>

            {/* Demo Credentials */}
            <div className="demo-credentials">
              <h4>Demo Credentials</h4>
              <div className="demo-grid">
                <div className="demo-item">
                  <strong>Student:</strong> student@college.edu / password123
                </div>
                <div className="demo-item">
                  <strong>Mentor:</strong> mentor@college.edu / password123
                </div>
                <div className="demo-item">
                  <strong>HOD:</strong> hod@college.edu / password123
                </div>
                <div className="demo-item">
                  <strong>Security:</strong> security@college.edu / password123
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Back to Home */}
      <Link to="/" className="back-home">
        ← Back to Home
      </Link>

      {/* Doodle Background Elements */}
      <div className="doodle-bg-elements">
        <div className="bg-element element-1"></div>
        <div className="bg-element element-2"></div>
        <div className="bg-element element-3"></div>
        <div className="bg-element element-4"></div>
      </div>
    </div>
  );
};

export default LoginPage;