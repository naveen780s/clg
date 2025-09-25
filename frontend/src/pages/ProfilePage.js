import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useAuth } from '../contexts/AuthContext';
import authService from '../services/authService';
import Loader from '../components/common/Loader';

const ProfilePage = () => {
  const { user, updateUser } = useAuth();
  
  const [profileData, setProfileData] = useState({
    name: '',
    email: '',
    regNumber: '',
    year: '',
    department: '',
    contactNumber: '',
    emergencyContact: '',
    address: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    if (user) {
      setProfileData({
        name: user.name || '',
        email: user.email || '',
        regNumber: user.regNumber || '',
        year: user.year || '',
        department: user.department || '',
        contactNumber: user.contactNumber || '',
        emergencyContact: user.emergencyContact || '',
        address: user.address || ''
      });
    }
  }, [user]);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    try {
      const updatedUser = await authService.updateProfile(profileData);
      updateUser(updatedUser);
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to update profile' });
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' });
      setLoading(false);
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setMessage({ type: 'error', text: 'Password must be at least 6 characters long' });
      setLoading(false);
      return;
    }

    try {
      await authService.changePassword({
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      setPasswordData({
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      });
      
      setMessage({ type: 'success', text: 'Password changed successfully!' });
    } catch (error) {
      setMessage({ type: 'error', text: error.message || 'Failed to change password' });
    } finally {
      setLoading(false);
    }
  };

  const getRoleDisplay = (role) => {
    const roleMap = {
      student: '🎓 Student',
      mentor: '👨‍🏫 Mentor',
      hod: '👨‍💼 Head of Department',
      security: '🛡️ Security Officer'
    };
    return roleMap[role] || role;
  };

  if (loading && !user) {
    return <Loader message="Loading profile..." />;
  }

  return (
    <div className="profile-page">
      <div className="page-container">
        {/* Header */}
        <motion.div 
          className="page-header"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <div className="header-content">
            <h1 className="page-title">
              My Profile 👤
            </h1>
            <p className="page-subtitle">
              Manage your account settings and preferences
            </p>
          </div>
          
          <div className="profile-avatar">
            <div className="avatar-circle">
              {user?.name?.charAt(0)}
            </div>
            <div className="avatar-info">
              <h3>{user?.name}</h3>
              <p>{getRoleDisplay(user?.role)}</p>
            </div>
          </div>
        </motion.div>

        {/* Message Display */}
        {message.text && (
          <motion.div 
            className={`message-alert ${message.type}`}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4 }}
          >
            <div className="alert-content">
              <span className="alert-icon">
                {message.type === 'success' ? '✅' : '❌'}
              </span>
              {message.text}
            </div>
          </motion.div>
        )}

        {/* Tab Navigation */}
        <motion.div 
          className="profile-tabs"
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <button
            onClick={() => setActiveTab('profile')}
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <span className="tab-icon">📝</span>
            Profile Information
          </button>
          <button
            onClick={() => setActiveTab('security')}
            className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          >
            <span className="tab-icon">🔒</span>
            Security Settings
          </button>
          <button
            onClick={() => setActiveTab('preferences')}
            className={`tab-btn ${activeTab === 'preferences' ? 'active' : ''}`}
          >
            <span className="tab-icon">⚙️</span>
            Preferences
          </button>
        </motion.div>

        <div className="profile-content">
          {/* Profile Information Tab */}
          {activeTab === 'profile' && (
            <motion.div 
              className="profile-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="section-header">
                <h2 className="section-title">Profile Information</h2>
                <p className="section-description">
                  Update your personal details and contact information
                </p>
              </div>

              <form onSubmit={handleProfileUpdate} className="profile-form">
                <div className="form-grid">
                  <div className="form-group">
                    <label htmlFor="name">Full Name</label>
                    <input
                      type="text"
                      id="name"
                      value={profileData.name}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        name: e.target.value
                      }))}
                      className="form-input"
                      required
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="email">Email Address</label>
                    <input
                      type="email"
                      id="email"
                      value={profileData.email}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        email: e.target.value
                      }))}
                      className="form-input"
                      required
                    />
                  </div>

                  {user?.role === 'student' && (
                    <>
                      <div className="form-group">
                        <label htmlFor="regNumber">Registration Number</label>
                        <input
                          type="text"
                          id="regNumber"
                          value={profileData.regNumber}
                          onChange={(e) => setProfileData(prev => ({
                            ...prev,
                            regNumber: e.target.value
                          }))}
                          className="form-input"
                          required
                        />
                      </div>

                      <div className="form-group">
                        <label htmlFor="year">Academic Year</label>
                        <select
                          id="year"
                          value={profileData.year}
                          onChange={(e) => setProfileData(prev => ({
                            ...prev,
                            year: e.target.value
                          }))}
                          className="form-select"
                          required
                        >
                          <option value="">Select Year</option>
                          <option value="1st">1st Year</option>
                          <option value="2nd">2nd Year</option>
                          <option value="3rd">3rd Year</option>
                          <option value="4th">4th Year</option>
                        </select>
                      </div>
                    </>
                  )}

                  <div className="form-group">
                    <label htmlFor="department">Department</label>
                    <select
                      id="department"
                      value={profileData.department}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        department: e.target.value
                      }))}
                      className="form-select"
                      required
                    >
                      <option value="">Select Department</option>
                      <option value="Computer Science">Computer Science</option>
                      <option value="Electronics">Electronics</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Civil">Civil</option>
                      <option value="Chemical">Chemical</option>
                      <option value="Electrical">Electrical</option>
                    </select>
                  </div>

                  <div className="form-group">
                    <label htmlFor="contactNumber">Contact Number</label>
                    <input
                      type="tel"
                      id="contactNumber"
                      value={profileData.contactNumber}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        contactNumber: e.target.value
                      }))}
                      className="form-input"
                      placeholder="e.g., +91 9876543210"
                    />
                  </div>

                  <div className="form-group">
                    <label htmlFor="emergencyContact">Emergency Contact</label>
                    <input
                      type="tel"
                      id="emergencyContact"
                      value={profileData.emergencyContact}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        emergencyContact: e.target.value
                      }))}
                      className="form-input"
                      placeholder="e.g., +91 9876543210"
                    />
                  </div>

                  <div className="form-group full-width">
                    <label htmlFor="address">Address</label>
                    <textarea
                      id="address"
                      value={profileData.address}
                      onChange={(e) => setProfileData(prev => ({
                        ...prev,
                        address: e.target.value
                      }))}
                      className="form-textarea"
                      rows="3"
                      placeholder="Enter your complete address"
                    />
                  </div>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary btn-large"
                  >
                    {loading ? 'Updating...' : 'Update Profile'}
                  </button>
                </div>
              </form>
            </motion.div>
          )}

          {/* Security Settings Tab */}
          {activeTab === 'security' && (
            <motion.div 
              className="profile-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="section-header">
                <h2 className="section-title">Security Settings</h2>
                <p className="section-description">
                  Manage your password and security preferences
                </p>
              </div>

              <form onSubmit={handlePasswordChange} className="security-form">
                <div className="form-group">
                  <label htmlFor="currentPassword">Current Password</label>
                  <input
                    type="password"
                    id="currentPassword"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      currentPassword: e.target.value
                    }))}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    type="password"
                    id="newPassword"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      newPassword: e.target.value
                    }))}
                    className="form-input"
                    minLength="6"
                    required
                  />
                  <small className="form-hint">
                    Password must be at least 6 characters long
                  </small>
                </div>

                <div className="form-group">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    type="password"
                    id="confirmPassword"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData(prev => ({
                      ...prev,
                      confirmPassword: e.target.value
                    }))}
                    className="form-input"
                    required
                  />
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-danger btn-large"
                  >
                    {loading ? 'Changing...' : 'Change Password'}
                  </button>
                </div>
              </form>

              <div className="security-info">
                <h3>Security Tips</h3>
                <ul className="security-tips">
                  <li>🔒 Use a strong, unique password</li>
                  <li>🔄 Change your password regularly</li>
                  <li>🚫 Never share your login credentials</li>
                  <li>📱 Log out from shared devices</li>
                </ul>
              </div>
            </motion.div>
          )}

          {/* Preferences Tab */}
          {activeTab === 'preferences' && (
            <motion.div 
              className="profile-section"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
            >
              <div className="section-header">
                <h2 className="section-title">Preferences</h2>
                <p className="section-description">
                  Customize your app experience and notification settings
                </p>
              </div>

              <div className="preferences-grid">
                <div className="preference-category">
                  <h4>🔔 Notifications</h4>
                  
                  <div className="preference-item">
                    <div className="preference-content">
                      <h5>Pass Status Updates</h5>
                      <p>Get notified when your pass status changes</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="preference-item">
                    <div className="preference-content">
                      <h5>Reminder Notifications</h5>
                      <p>Receive reminders about checkout and return times</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>

                  <div className="preference-item">
                    <div className="preference-content">
                      <h5>Email Notifications</h5>
                      <p>Receive important updates via email</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="preference-category">
                  <h4>🎨 Display</h4>
                  
                  <div className="preference-item">
                    <div className="preference-content">
                      <h5>Theme Mode</h5>
                      <p>Choose your preferred color scheme</p>
                    </div>
                    <select className="preference-select">
                      <option value="light">Light Mode</option>
                      <option value="dark">Dark Mode</option>
                      <option value="auto">System Default</option>
                    </select>
                  </div>

                  <div className="preference-item">
                    <div className="preference-content">
                      <h5>Animation Effects</h5>
                      <p>Enable or disable UI animations</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>

                <div className="preference-category">
                  <h4>🔐 Privacy</h4>
                  
                  <div className="preference-item">
                    <div className="preference-content">
                      <h5>Profile Visibility</h5>
                      <p>Control who can see your profile information</p>
                    </div>
                    <select className="preference-select">
                      <option value="everyone">Everyone</option>
                      <option value="department">Department Only</option>
                      <option value="private">Private</option>
                    </select>
                  </div>

                  <div className="preference-item">
                    <div className="preference-content">
                      <h5>Activity Tracking</h5>
                      <p>Allow the system to track your activity for analytics</p>
                    </div>
                    <label className="toggle-switch">
                      <input type="checkbox" defaultChecked />
                      <span className="toggle-slider"></span>
                    </label>
                  </div>
                </div>
              </div>

              <div className="preferences-actions">
                <button className="btn btn-primary">
                  Save Preferences
                </button>
                <button className="btn btn-outline">
                  Reset to Default
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;