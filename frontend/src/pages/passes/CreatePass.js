import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import passService from '../../services/passService';
import { notificationUtils } from '../../services/utils';

const CreatePass = () => {
  const navigate = useNavigate();
  
  const [formData, setFormData] = useState({
    reason: '',
    destination: '',
    exitTime: '',
    expectedReturnTime: '',
    emergencyContact: {
      name: '',
      phone: '',
      relation: ''
    },
    category: 'personal',
    additionalNotes: '',
  });
  
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    
    // Handle nested emergency contact fields
    if (name.startsWith('emergencyContact.')) {
      const field = name.split('.')[1];
      setFormData(prev => ({
        ...prev,
        emergencyContact: {
          ...prev.emergencyContact,
          [field]: value
        }
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value,
      }));
    }
    
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
    
    // Reason validation
    if (!formData.reason || formData.reason.trim().length < 10) {
      newErrors.reason = 'Reason must be at least 10 characters';
    }
    
    // Destination validation
    if (!formData.destination || formData.destination.trim().length < 3) {
      newErrors.destination = 'Destination must be at least 3 characters';
    }
    
    // Time validation
    if (!formData.exitTime) {
      newErrors.exitTime = 'Exit time is required';
    }
    
    if (!formData.expectedReturnTime) {
      newErrors.expectedReturnTime = 'Expected return time is required';
    }
    
    if (formData.exitTime && formData.expectedReturnTime) {
      const exitTime = new Date(formData.exitTime);
      const returnTime = new Date(formData.expectedReturnTime);
      
      if (exitTime <= new Date()) {
        newErrors.exitTime = 'Exit time must be in the future';
      }
      
      if (returnTime <= exitTime) {
        newErrors.expectedReturnTime = 'Return time must be after exit time';
      }
    }
    
    // Emergency contact validation
    if (!formData.emergencyContact.name || formData.emergencyContact.name.trim().length < 2) {
      newErrors['emergencyContact.name'] = 'Contact name is required';
    }
    
    if (!formData.emergencyContact.phone) {
      newErrors['emergencyContact.phone'] = 'Contact phone is required';
    } else if (!/^[6-9]\d{9}$/.test(formData.emergencyContact.phone)) {
      newErrors['emergencyContact.phone'] = 'Please enter a valid 10-digit phone number';
    }
    
    if (!formData.emergencyContact.relation) {
      newErrors['emergencyContact.relation'] = 'Relation is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const passData = {
        reason: formData.reason,
        destination: formData.destination,
        departure_time: new Date(formData.exitTime).toISOString(),
        return_time: new Date(formData.expectedReturnTime).toISOString(),
        category: formData.category,
        emergency_contact: formData.emergencyContact,
        priority: 'medium'
      };

      const newPass = await passService.createPass(passData);
      
      notificationUtils.success('Gate pass created successfully!');
      navigate(`/passes/${newPass._id}`);
    } catch (error) {
      setErrors({
        submit: error.message || 'Failed to create pass. Please try again.',
      });
      notificationUtils.error('Failed to create pass');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="create-pass-page">
      <div className="page-container">
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="page-title">Create Gate Pass</h1>
          <p className="page-subtitle">
            Fill out the form below to request a new gate pass
          </p>
        </motion.div>

        <motion.div 
          className="form-container"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <form onSubmit={handleSubmit} className="create-pass-form">
            {errors.submit && (
              <motion.div 
                className="error-banner"
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                {errors.submit}
              </motion.div>
            )}

            <div className="form-section">
              <h3 className="section-title">Pass Details</h3>
              
              <div className="form-group">
                <label htmlFor="reason" className="form-label required">
                  Reason for Exit
                </label>
                <textarea
                  id="reason"
                  name="reason"
                  value={formData.reason}
                  onChange={handleInputChange}
                  className={`form-textarea ${errors.reason ? 'error' : ''}`}
                  placeholder="Please provide a detailed reason for your exit (minimum 10 characters)"
                  rows="3"
                />
                <div className="form-help">
                  Be specific about your reason for leaving campus
                </div>
                {errors.reason && <span className="error-text">{errors.reason}</span>}
              </div>

              <div className="form-group">
                <label htmlFor="destination" className="form-label required">
                  Destination
                </label>
                <input
                  type="text"
                  id="destination"
                  name="destination"
                  value={formData.destination}
                  onChange={handleInputChange}
                  className={`form-input ${errors.destination ? 'error' : ''}`}
                  placeholder="Where are you going?"
                />
                {errors.destination && <span className="error-text">{errors.destination}</span>}
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Timing</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="exitTime" className="form-label required">
                    Exit Time
                  </label>
                  <input
                    type="datetime-local"
                    id="exitTime"
                    name="exitTime"
                    value={formData.exitTime}
                    onChange={handleInputChange}
                    className={`form-input ${errors.exitTime ? 'error' : ''}`}
                    min={new Date().toISOString().slice(0, 16)}
                  />
                  {errors.exitTime && <span className="error-text">{errors.exitTime}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="expectedReturnTime" className="form-label required">
                    Expected Return Time
                  </label>
                  <input
                    type="datetime-local"
                    id="expectedReturnTime"
                    name="expectedReturnTime"
                    value={formData.expectedReturnTime}
                    onChange={handleInputChange}
                    className={`form-input ${errors.expectedReturnTime ? 'error' : ''}`}
                    min={formData.exitTime || new Date().toISOString().slice(0, 16)}
                  />
                  {errors.expectedReturnTime && <span className="error-text">{errors.expectedReturnTime}</span>}
                </div>
              </div>
            </div>

            <div className="form-section">
              <h3 className="section-title">Contact Information</h3>
              
              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="emergencyContactName" className="form-label required">
                    Emergency Contact Name
                  </label>
                  <input
                    type="text"
                    id="emergencyContactName"
                    name="emergencyContact.name"
                    value={formData.emergencyContact.name}
                    onChange={handleInputChange}
                    className={`form-input ${errors['emergencyContact.name'] ? 'error' : ''}`}
                    placeholder="Full name of emergency contact"
                  />
                  {errors['emergencyContact.name'] && <span className="error-text">{errors['emergencyContact.name']}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="emergencyContactPhone" className="form-label required">
                    Emergency Contact Phone
                  </label>
                  <input
                    type="tel"
                    id="emergencyContactPhone"
                    name="emergencyContact.phone"
                    value={formData.emergencyContact.phone}
                    onChange={handleInputChange}
                    className={`form-input ${errors['emergencyContact.phone'] ? 'error' : ''}`}
                    placeholder="Contact number (10 digits)"
                  />
                  {errors['emergencyContact.phone'] && <span className="error-text">{errors['emergencyContact.phone']}</span>}
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label htmlFor="emergencyContactRelation" className="form-label required">
                    Relation
                  </label>
                  <input
                    type="text"
                    id="emergencyContactRelation"
                    name="emergencyContact.relation"
                    value={formData.emergencyContact.relation}
                    onChange={handleInputChange}
                    className={`form-input ${errors['emergencyContact.relation'] ? 'error' : ''}`}
                    placeholder="e.g., Father, Mother, Guardian"
                  />
                  {errors['emergencyContact.relation'] && <span className="error-text">{errors['emergencyContact.relation']}</span>}
                </div>

                <div className="form-group">
                  <label htmlFor="category" className="form-label required">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleInputChange}
                    className={`form-input ${errors.category ? 'error' : ''}`}
                  >
                    <option value="personal">Personal</option>
                    <option value="medical">Medical</option>
                    <option value="family">Family</option>
                    <option value="academic">Academic</option>
                    <option value="emergency">Emergency</option>
                    <option value="other">Other</option>
                  </select>
                  {errors.category && <span className="error-text">{errors.category}</span>}
                </div>
              </div>

              <div className="form-group">
                <label htmlFor="additionalNotes" className="form-label">
                  Additional Notes (Optional)
                </label>
                <textarea
                  id="additionalNotes"
                  name="additionalNotes"
                  value={formData.additionalNotes}
                  onChange={handleInputChange}
                  className="form-textarea"
                  placeholder="Any additional information you'd like to provide"
                  rows="2"
                />
              </div>
            </div>

            <div className="form-actions">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="btn btn-outline"
              >
                Cancel
              </button>
              
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
                    <span>Creating Pass...</span>
                  </div>
                ) : (
                  <>
                    <span>Create Pass</span>
                    <div className="btn-icon">✓</div>
                  </>
                )}
              </motion.button>
            </div>
          </form>
        </motion.div>

        {/* Guidelines Sidebar */}
        <motion.div 
          className="guidelines-sidebar"
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <div className="guidelines-card">
            <h3>📋 Guidelines</h3>
            <ul className="guidelines-list">
              <li>Submit your request at least 30 minutes before exit time</li>
              <li>Provide accurate and detailed information</li>
              <li>Emergency contact should be reachable at all times</li>
              <li>Return on time to avoid penalties</li>
              <li>Carry your student ID along with the QR code</li>
            </ul>
          </div>

          <div className="approval-flow-card">
            <h3>🔄 Approval Process</h3>
            <div className="approval-steps">
              <div className="approval-step">
                <div className="step-number">1</div>
                <span>Mentor Review</span>
              </div>
              <div className="step-arrow">↓</div>
              <div className="approval-step">
                <div className="step-number">2</div>
                <span>HOD Approval</span>
              </div>
              <div className="step-arrow">↓</div>
              <div className="approval-step">
                <div className="step-number">3</div>
                <span>QR Code Generated</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CreatePass;