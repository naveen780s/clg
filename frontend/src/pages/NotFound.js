import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const NotFound = () => {
  return (
    <div className="error-page">
      <div className="error-container">
        <motion.div 
          className="error-content"
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8 }}
        >
          {/* Doodle 404 Illustration */}
          <div className="error-illustration">
            <div className="doodle-404">
              <div className="number-4 left">4</div>
              <div className="number-0">
                <div className="zero-outer"></div>
                <div className="zero-inner"></div>
                <div className="doodle-face">
                  <div className="eye left-eye"></div>
                  <div className="eye right-eye"></div>
                  <div className="mouth"></div>
                </div>
              </div>
              <div className="number-4 right">4</div>
            </div>
            
            <div className="floating-elements">
              <div className="element question">?</div>
              <div className="element star">⭐</div>
              <div className="element arrow">→</div>
            </div>
          </div>

          <motion.div 
            className="error-text"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <h1 className="error-title">Oops! Page Not Found</h1>
            <p className="error-message">
              The page you're looking for seems to have wandered off. 
              Don't worry, even the best explorers get lost sometimes!
            </p>
          </motion.div>

          <motion.div 
            className="error-actions"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <Link to="/" className="btn btn-primary">
              <span>Go Home</span>
              <div className="btn-icon">🏠</div>
            </Link>
            
            <button 
              onClick={() => window.history.back()} 
              className="btn btn-outline"
            >
              <span>Go Back</span>
              <div className="btn-icon">←</div>
            </button>
          </motion.div>

          <motion.div 
            className="helpful-links"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <h3>Looking for something specific?</h3>
            <div className="links-grid">
              <Link to="/login" className="help-link">
                <div className="link-icon">🔑</div>
                <span>Login</span>
              </Link>
              
              <Link to="/register" className="help-link">
                <div className="link-icon">📝</div>
                <span>Register</span>
              </Link>
              
              <Link to="/dashboard" className="help-link">
                <div className="link-icon">📊</div>
                <span>Dashboard</span>
              </Link>
              
              <a href="mailto:support@college.edu" className="help-link">
                <div className="link-icon">📧</div>
                <span>Support</span>
              </a>
            </div>
          </motion.div>
        </motion.div>

        {/* Doodle Background Elements */}
        <div className="doodle-bg-elements">
          <div className="bg-shape shape-1"></div>
          <div className="bg-shape shape-2"></div>
          <div className="bg-shape shape-3"></div>
          <div className="bg-dots"></div>
        </div>
      </div>
    </div>
  );
};

export default NotFound;