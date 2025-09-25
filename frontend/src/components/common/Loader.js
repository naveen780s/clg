import React from 'react';
import { motion } from 'framer-motion';

const Loader = ({ size = 'medium', message = 'Loading...' }) => {
  const sizeClasses = {
    small: 'loader-small',
    medium: 'loader-medium',
    large: 'loader-large',
  };

  return (
    <div className={`loader-container ${sizeClasses[size]}`}>
      <motion.div 
        className="loader-wrapper"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        {/* Doodle-style animated loader */}
        <div className="doodle-loader">
          <motion.div 
            className="loader-circle"
            animate={{ 
              rotate: 360,
              scale: [1, 1.1, 1],
            }}
            transition={{
              rotate: {
                duration: 2,
                repeat: Infinity,
                ease: 'linear',
              },
              scale: {
                duration: 1,
                repeat: Infinity,
                ease: 'easeInOut',
              },
            }}
          >
            <div className="circle-dots">
              <div className="dot dot-1"></div>
              <div className="dot dot-2"></div>
              <div className="dot dot-3"></div>
              <div className="dot dot-4"></div>
            </div>
          </motion.div>
          
          <motion.div 
            className="loader-text"
            animate={{ opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          >
            {message}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
};

export default Loader;