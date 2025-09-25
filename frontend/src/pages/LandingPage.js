import React from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';

const LandingPage = () => {
  return (
    <div className="landing-page">
      {/* Hero Section */}
      <motion.section 
        className="hero-section"
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8 }}
      >
        <div className="container">
          <div className="hero-content">
            <motion.div 
              className="hero-text"
              initial={{ opacity: 0, x: -50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="hero-title">
                College Gate Pass
                <span className="doodle-underline">Management</span>
              </h1>
              <p className="hero-subtitle">
                Streamline your college exit and entry process with our digital gate pass system. 
                Easy, secure, and efficient for students, mentors, and security staff.
              </p>
              <div className="hero-buttons">
                <Link to="/register" className="btn btn-primary btn-lg">
                  <span>Get Started</span>
                  <div className="doodle-arrow">→</div>
                </Link>
                <Link to="/login" className="btn btn-outline btn-lg">
                  <span>Sign In</span>
                </Link>
              </div>
            </motion.div>
            
            <motion.div 
              className="hero-illustration"
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
            >
              <div className="doodle-gate">
                <div className="gate-post left"></div>
                <div className="gate-post right"></div>
                <div className="gate-top"></div>
                <div className="gate-person">
                  <div className="person-head"></div>
                  <div className="person-body"></div>
                  <div className="person-arms"></div>
                  <div className="person-legs"></div>
                </div>
                <div className="floating-icons">
                  <div className="icon qr-icon">📱</div>
                  <div className="icon check-icon">✓</div>
                  <div className="icon clock-icon">🕐</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Features Section */}
      <motion.section 
        className="features-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="container">
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            Why Choose Our Gate Pass System?
          </motion.h2>
          
          <div className="features-grid">
            <motion.div 
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="feature-icon">📝</div>
              <h3>Easy Application</h3>
              <p>Submit gate pass requests with just a few clicks. Simple form with all necessary details.</p>
            </motion.div>

            <motion.div 
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="feature-icon">⚡</div>
              <h3>Quick Approvals</h3>
              <p>Real-time notifications and instant approvals from mentors and HODs.</p>
            </motion.div>

            <motion.div 
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="feature-icon">📱</div>
              <h3>QR Code Verification</h3>
              <p>Secure QR codes for quick verification at the gate. No paper, no hassle.</p>
            </motion.div>

            <motion.div 
              className="feature-card"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="feature-icon">📊</div>
              <h3>Track Everything</h3>
              <p>Complete history and status tracking for all your gate pass requests.</p>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* How It Works Section */}
      <motion.section 
        className="how-it-works-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="container">
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            How It Works
          </motion.h2>
          
          <div className="steps-container">
            <motion.div 
              className="step"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              <div className="step-number">1</div>
              <div className="step-content">
                <h3>Submit Request</h3>
                <p>Fill out the gate pass form with your details and reason for leaving.</p>
              </div>
            </motion.div>

            <div className="step-arrow">→</div>

            <motion.div 
              className="step"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <div className="step-number">2</div>
              <div className="step-content">
                <h3>Get Approval</h3>
                <p>Your mentor and HOD will review and approve your request.</p>
              </div>
            </motion.div>

            <div className="step-arrow">→</div>

            <motion.div 
              className="step"
              initial={{ opacity: 0, x: -50 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
            >
              <div className="step-number">3</div>
              <div className="step-content">
                <h3>Scan & Go</h3>
                <p>Show your QR code at the gate for quick verification and exit.</p>
              </div>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* User Types Section */}
      <motion.section 
        className="user-types-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="container">
          <motion.h2 
            className="section-title"
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            viewport={{ once: true }}
          >
            For Everyone in the College
          </motion.h2>
          
          <div className="user-types-grid">
            <motion.div 
              className="user-type-card"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="user-type-icon">👨‍🎓</div>
              <h3>Students</h3>
              <ul>
                <li>Create gate pass requests</li>
                <li>Track approval status</li>
                <li>Download QR codes</li>
                <li>View pass history</li>
              </ul>
            </motion.div>

            <motion.div 
              className="user-type-card"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="user-type-icon">👨‍🏫</div>
              <h3>Mentors</h3>
              <ul>
                <li>Review student requests</li>
                <li>Approve or reject passes</li>
                <li>Add approval comments</li>
                <li>Monitor student activity</li>
              </ul>
            </motion.div>

            <motion.div 
              className="user-type-card"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.3 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="user-type-icon">🏛️</div>
              <h3>HODs</h3>
              <ul>
                <li>Final approval authority</li>
                <li>Department-wide overview</li>
                <li>Statistical reports</li>
                <li>Policy enforcement</li>
              </ul>
            </motion.div>

            <motion.div 
              className="user-type-card"
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.6, delay: 0.4 }}
              viewport={{ once: true }}
              whileHover={{ scale: 1.05 }}
            >
              <div className="user-type-icon">🛡️</div>
              <h3>Security</h3>
              <ul>
                <li>Scan QR codes</li>
                <li>Verify student identity</li>
                <li>Check-in/out tracking</li>
                <li>Real-time validation</li>
              </ul>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* CTA Section */}
      <motion.section 
        className="cta-section"
        initial={{ opacity: 0 }}
        whileInView={{ opacity: 1 }}
        transition={{ duration: 0.8 }}
        viewport={{ once: true }}
      >
        <div className="container">
          <div className="cta-content">
            <motion.h2 
              className="cta-title"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              viewport={{ once: true }}
            >
              Ready to Get Started?
            </motion.h2>
            <motion.p 
              className="cta-subtitle"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              viewport={{ once: true }}
            >
              Join hundreds of students already using our gate pass system
            </motion.p>
            <motion.div 
              className="cta-buttons"
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              viewport={{ once: true }}
            >
              <Link to="/register" className="btn btn-primary btn-lg">
                Register Now
              </Link>
              <Link to="/login" className="btn btn-outline btn-lg">
                Login
              </Link>
            </motion.div>
          </div>
        </div>
      </motion.section>

      {/* Footer */}
      <footer className="landing-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>College Gate Pass</h4>
              <p>Making campus life easier, one pass at a time.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/login">Login</Link></li>
                <li><Link to="/register">Register</Link></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Support</h4>
              <ul>
                <li><a href="mailto:support@college.edu">Email Support</a></li>
                <li><a href="tel:+1234567890">Phone Support</a></li>
              </ul>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2024 College Gate Pass Management System. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;