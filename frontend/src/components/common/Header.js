import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../contexts/AuthContext';

const Header = () => {
  const { user, logout, getUserInitials, getUserStatusInfo } = useAuth();
  const navigate = useNavigate();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const userStatusInfo = getUserStatusInfo();

  return (
    <motion.header 
      className="app-header"
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <div className="header-container">
        {/* Logo and Brand */}
        <div className="header-brand">
          <Link to="/dashboard" className="brand-link">
            <div className="brand-icon">🎓</div>
            <div className="brand-text">
              <h1>College Gate Pass</h1>
              <span>Management System</span>
            </div>
          </Link>
        </div>

        {/* Navigation Links */}
        <nav className="header-nav">
          <Link to="/dashboard" className="nav-link">
            <span className="nav-icon">🏠</span>
            Dashboard
          </Link>
          
          {user?.role === 'student' && (
            <>
              <Link to="/passes" className="nav-link">
                <span className="nav-icon">📋</span>
                My Passes
              </Link>
              <Link to="/passes/create" className="nav-link">
                <span className="nav-icon">➕</span>
                Create Pass
              </Link>
            </>
          )}
          
          {(user?.role === 'mentor' || user?.role === 'hod') && (
            <Link to="/approvals" className="nav-link">
              <span className="nav-icon">✅</span>
              Approvals
            </Link>
          )}
          
          {user?.role === 'security' && (
            <Link to="/scanner" className="nav-link">
              <span className="nav-icon">📱</span>
              QR Scanner
            </Link>
          )}
          
          {(user?.role === 'hod' || user?.role === 'mentor') && (
            <Link to="/statistics" className="nav-link">
              <span className="nav-icon">📊</span>
              Statistics
            </Link>
          )}
        </nav>

        {/* User Profile Menu */}
        <div className="header-user">
          <Link to="/notifications" className="notification-btn">
            <span className="notification-icon">🔔</span>
            <span className="sr-only">Notifications</span>
          </Link>
          
          <div className="user-profile-menu">
            <button
              className="profile-toggle"
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              aria-expanded={isProfileMenuOpen}
              aria-haspopup="true"
            >
              <div className="user-avatar">
                {getUserInitials()}
              </div>
              <div className="user-info">
                <span className="user-name">{user?.name}</span>
                <span className={`user-role ${userStatusInfo?.color}`}>
                  {userStatusInfo?.emoji} {userStatusInfo?.label}
                </span>
              </div>
              <div className="dropdown-arrow">
                {isProfileMenuOpen ? '▲' : '▼'}
              </div>
            </button>

            <AnimatePresence>
              {isProfileMenuOpen && (
                <motion.div
                  className="profile-dropdown"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <div className="dropdown-header">
                    <div className="user-avatar-large">
                      {getUserInitials()}
                    </div>
                    <div className="user-details">
                      <h3>{user?.name}</h3>
                      <p>{user?.email}</p>
                      <span className={`role-badge ${userStatusInfo?.color}`}>
                        {userStatusInfo?.emoji} {userStatusInfo?.label}
                      </span>
                    </div>
                  </div>
                  
                  <div className="dropdown-divider"></div>
                  
                  <div className="dropdown-menu">
                    <Link 
                      to="/profile" 
                      className="dropdown-item"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <span className="item-icon">👤</span>
                      Profile Settings
                    </Link>
                    
                    <Link 
                      to="/notifications" 
                      className="dropdown-item"
                      onClick={() => setIsProfileMenuOpen(false)}
                    >
                      <span className="item-icon">🔔</span>
                      Notifications
                    </Link>
                    
                    <div className="dropdown-divider"></div>
                    
                    <button 
                      className="dropdown-item logout-btn"
                      onClick={handleLogout}
                    >
                      <span className="item-icon">🚪</span>
                      Logout
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.header>
  );
};

export default Header;