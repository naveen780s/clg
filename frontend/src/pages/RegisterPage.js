import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import { validationUtils } from '../services/utils';
import authService from '../services/authService';

const RegisterPage = () => {
  const navigate = useNavigate();
  const { login } = useAuth();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [mentors, setMentors] = useState([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  
  const [formData, setFormData] = useState({
    // Step 1: Basic Info
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    
    // Step 2: College Info
    regNumber: '',
    department: '',
    year: '',
    section: '',
    
    // Step 3: Contact & Mentor
    phone: '',
    parentPhone: '',
    address: '',
    mentorId: '',
  });

  const departments = [
    { value: 'cse', label: 'Computer Science Engineering' },
    { value: 'ece', label: 'Electronics & Communication' },
    { value: 'me', label: 'Mechanical Engineering' },
    { value: 'ce', label: 'Civil Engineering' },
    { value: 'eee', label: 'Electrical Engineering' },
    { value: 'it', label: 'Information Technology' },
  ];

  const years = [
    { value: '1', label: 'First Year' },
    { value: '2', label: 'Second Year' },
    { value: '3', label: 'Third Year' },
    { value: '4', label: 'Fourth Year' },
  ];

  const sections = [
    { value: 'A', label: 'Section A' },
    { value: 'B', label: 'Section B' },
    { value: 'C', label: 'Section C' },
  ];

  // Fetch mentors when department changes
  useEffect(() => {
    if (formData.department) {
      fetchMentors(formData.department);
    }
  }, [formData.department]);

  const fetchMentors = async (department) => {
    try {
      const mentorsData = await authService.getMentors(department);
      setMentors(mentorsData);
    } catch (error) {
      console.error('Error fetching mentors:', error);
      setMentors([]);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value,
    }));
    
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: '',
      }));
    }
  };

  const validateStep1 = () => {
    const newErrors = {};

    if (!formData.name || formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters';
    }

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!validationUtils.isEmail(formData.email)) {
      newErrors.email = 'Please enter a valid email';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (!validationUtils.isStrongPassword(formData.password)) {
      newErrors.password = 'Password must be at least 8 characters with uppercase, lowercase, number, and special character';
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password';
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = () => {
    const newErrors = {};

    if (!formData.regNumber) {
      newErrors.regNumber = 'Registration number is required';
    } else if (!validationUtils.isValidRegNumber(formData.regNumber)) {
      newErrors.regNumber = 'Please enter a valid registration number (e.g., 21CS1234)';
    }

    if (!formData.department) {
      newErrors.department = 'Department is required';
    }

    if (!formData.year) {
      newErrors.year = 'Year is required';
    }

    if (!formData.section) {
      newErrors.section = 'Section is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep3 = () => {
    const newErrors = {};

    if (!formData.phone) {
      newErrors.phone = 'Phone number is required';
    } else if (!validationUtils.isPhone(formData.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
    }

    if (!formData.parentPhone) {
      newErrors.parentPhone = 'Parent phone number is required';
    } else if (!validationUtils.isPhone(formData.parentPhone)) {
      newErrors.parentPhone = 'Please enter a valid parent phone number';
    }

    if (!formData.address || formData.address.trim().length < 10) {
      newErrors.address = 'Address must be at least 10 characters';
    }

    if (!formData.mentorId) {
      newErrors.mentorId = 'Please select a mentor';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    let isValid = false;
    
    switch (currentStep) {
      case 1:
        isValid = validateStep1();
        break;
      case 2:
        isValid = validateStep2();
        break;
      default:
        isValid = true;
    }

    if (isValid) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateStep3()) return;

    setLoading(true);
    try {
      const registrationData = {
        name: formData.name,
        email: formData.email,
        password: formData.password,
        regNumber: formData.regNumber,
        department: formData.department,
        year: parseInt(formData.year),
        section: formData.section,
        phone: formData.phone,
        parentContact: formData.parentPhone,
        address: formData.address,
        mentor: formData.mentorId,
      };

      await authService.register(registrationData);
      
      // Auto-login after successful registration
      await login({
        email: formData.email,
        password: formData.password,
      });
      
      navigate('/dashboard');
    } catch (error) {
      setErrors({
        submit: error.message || 'Registration failed. Please try again.',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderStep1 = () => (
    <motion.div 
      className="registration-step"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="step-title">Basic Information</h2>
      
      <div className="form-group">
        <label htmlFor="name" className="form-label">Full Name</label>
        <input
          type="text"
          id="name"
          name="name"
          value={formData.name}
          onChange={handleInputChange}
          className={`form-input ${errors.name ? 'error' : ''}`}
          placeholder="Enter your full name"
        />
        {errors.name && <span className="error-text">{errors.name}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="email" className="form-label">Email Address</label>
        <input
          type="email"
          id="email"
          name="email"
          value={formData.email}
          onChange={handleInputChange}
          className={`form-input ${errors.email ? 'error' : ''}`}
          placeholder="Enter your college email"
        />
        {errors.email && <span className="error-text">{errors.email}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="password" className="form-label">Password</label>
          <input
            type="password"
            id="password"
            name="password"
            value={formData.password}
            onChange={handleInputChange}
            className={`form-input ${errors.password ? 'error' : ''}`}
            placeholder="Create a strong password"
          />
          {errors.password && <span className="error-text">{errors.password}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="confirmPassword" className="form-label">Confirm Password</label>
          <input
            type="password"
            id="confirmPassword"
            name="confirmPassword"
            value={formData.confirmPassword}
            onChange={handleInputChange}
            className={`form-input ${errors.confirmPassword ? 'error' : ''}`}
            placeholder="Confirm your password"
          />
          {errors.confirmPassword && <span className="error-text">{errors.confirmPassword}</span>}
        </div>
      </div>
    </motion.div>
  );

  const renderStep2 = () => (
    <motion.div 
      className="registration-step"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="step-title">College Information</h2>
      
      <div className="form-group">
        <label htmlFor="regNumber" className="form-label">Registration Number</label>
        <input
          type="text"
          id="regNumber"
          name="regNumber"
          value={formData.regNumber}
          onChange={handleInputChange}
          className={`form-input ${errors.regNumber ? 'error' : ''}`}
          placeholder="e.g., 21CS1234"
        />
        {errors.regNumber && <span className="error-text">{errors.regNumber}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="department" className="form-label">Department</label>
        <select
          id="department"
          name="department"
          value={formData.department}
          onChange={handleInputChange}
          className={`form-select ${errors.department ? 'error' : ''}`}
        >
          <option value="">Select Department</option>
          {departments.map(dept => (
            <option key={dept.value} value={dept.value}>
              {dept.label}
            </option>
          ))}
        </select>
        {errors.department && <span className="error-text">{errors.department}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="year" className="form-label">Year</label>
          <select
            id="year"
            name="year"
            value={formData.year}
            onChange={handleInputChange}
            className={`form-select ${errors.year ? 'error' : ''}`}
          >
            <option value="">Select Year</option>
            {years.map(year => (
              <option key={year.value} value={year.value}>
                {year.label}
              </option>
            ))}
          </select>
          {errors.year && <span className="error-text">{errors.year}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="section" className="form-label">Section</label>
          <select
            id="section"
            name="section"
            value={formData.section}
            onChange={handleInputChange}
            className={`form-select ${errors.section ? 'error' : ''}`}
          >
            <option value="">Select Section</option>
            {sections.map(section => (
              <option key={section.value} value={section.value}>
                {section.label}
              </option>
            ))}
          </select>
          {errors.section && <span className="error-text">{errors.section}</span>}
        </div>
      </div>
    </motion.div>
  );

  const renderStep3 = () => (
    <motion.div 
      className="registration-step"
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
    >
      <h2 className="step-title">Contact & Mentor</h2>
      
      <div className="form-row">
        <div className="form-group">
          <label htmlFor="phone" className="form-label">Your Phone</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleInputChange}
            className={`form-input ${errors.phone ? 'error' : ''}`}
            placeholder="Your mobile number"
          />
          {errors.phone && <span className="error-text">{errors.phone}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="parentPhone" className="form-label">Parent Phone</label>
          <input
            type="tel"
            id="parentPhone"
            name="parentPhone"
            value={formData.parentPhone}
            onChange={handleInputChange}
            className={`form-input ${errors.parentPhone ? 'error' : ''}`}
            placeholder="Parent's mobile number"
          />
          {errors.parentPhone && <span className="error-text">{errors.parentPhone}</span>}
        </div>
      </div>

      <div className="form-group">
        <label htmlFor="address" className="form-label">Address</label>
        <textarea
          id="address"
          name="address"
          value={formData.address}
          onChange={handleInputChange}
          className={`form-textarea ${errors.address ? 'error' : ''}`}
          placeholder="Your complete address"
          rows="3"
        />
        {errors.address && <span className="error-text">{errors.address}</span>}
      </div>

      <div className="form-group">
        <label htmlFor="mentorId" className="form-label">Select Mentor</label>
        <select
          id="mentorId"
          name="mentorId"
          value={formData.mentorId}
          onChange={handleInputChange}
          className={`form-select ${errors.mentorId ? 'error' : ''}`}
        >
          <option value="">Select your mentor</option>
          {mentors.map(mentor => (
            <option key={mentor._id} value={mentor._id}>
              {mentor.name} - {mentor.department}
            </option>
          ))}
        </select>
        {errors.mentorId && <span className="error-text">{errors.mentorId}</span>}
      </div>
    </motion.div>
  );

  return (
    <div className="auth-page">
      <div className="auth-container registration-container">
        {/* Left Side - Progress & Illustration */}
        <motion.div 
          className="auth-illustration"
          initial={{ opacity: 0, x: -50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8 }}
        >
          <div className="registration-progress">
            <h2>Join Our Community</h2>
            <p>Create your account in 3 simple steps</p>
            
            <div className="progress-steps">
              <div className={`progress-step ${currentStep >= 1 ? 'active' : ''}`}>
                <div className="step-circle">1</div>
                <div className="step-info">
                  <h4>Basic Info</h4>
                  <p>Name, email & password</p>
                </div>
              </div>
              
              <div className={`progress-step ${currentStep >= 2 ? 'active' : ''}`}>
                <div className="step-circle">2</div>
                <div className="step-info">
                  <h4>College Details</h4>
                  <p>Registration & department</p>
                </div>
              </div>
              
              <div className={`progress-step ${currentStep >= 3 ? 'active' : ''}`}>
                <div className="step-circle">3</div>
                <div className="step-info">
                  <h4>Contact & Mentor</h4>
                  <p>Phone, address & mentor</p>
                </div>
              </div>
            </div>
          </div>

          <div className="doodle-register-scene">
            <div className="register-character">
              <div className="character-head"></div>
              <div className="character-body"></div>
              <div className="character-form">
                <div className="form-lines"></div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Right Side - Registration Form */}
        <motion.div 
          className="auth-form-container"
          initial={{ opacity: 0, x: 50 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
        >
          <div className="auth-form-wrapper">
            <div className="auth-header">
              <h1 className="auth-title">Create Account</h1>
              <p className="auth-subtitle">Step {currentStep} of 3</p>
            </div>

            <form onSubmit={handleSubmit} className="auth-form registration-form">
              {errors.submit && (
                <motion.div 
                  className="error-banner"
                  initial={{ opacity: 0, y: -20 }}
                  animate={{ opacity: 1, y: 0 }}
                >
                  {errors.submit}
                </motion.div>
              )}

              {/* Form Steps */}
              {currentStep === 1 && renderStep1()}
              {currentStep === 2 && renderStep2()}
              {currentStep === 3 && renderStep3()}

              {/* Navigation Buttons */}
              <div className="form-navigation">
                {currentStep > 1 && (
                  <button
                    type="button"
                    onClick={handlePrevious}
                    className="btn btn-outline"
                  >
                    Previous
                  </button>
                )}
                
                {currentStep < 3 ? (
                  <button
                    type="button"
                    onClick={handleNext}
                    className="btn btn-primary"
                  >
                    Next
                  </button>
                ) : (
                  <motion.button
                    type="submit"
                    className="btn btn-primary"
                    disabled={loading}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    {loading ? (
                      <div className="btn-loading">
                        <div className="spinner"></div>
                        <span>Creating Account...</span>
                      </div>
                    ) : (
                      'Create Account'
                    )}
                  </motion.button>
                )}
              </div>
            </form>

            <div className="auth-footer">
              <p>
                Already have an account?{' '}
                <Link to="/login" className="auth-link">
                  Sign in here
                </Link>
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Back to Home */}
      <Link to="/" className="back-home">
        ← Back to Home
      </Link>
    </div>
  );
};

export default RegisterPage;