import React from 'react';
import { AnimatePresence } from 'framer-motion';
import { Toaster } from 'react-hot-toast';
import AppRoutes from './components/AppRoutes';

function App() {
  return (
    <div className="App">
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'var(--background)',
            color: 'var(--ink-black)',
            border: '2px solid var(--primary)',
            borderRadius: '12px',
            boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
            fontFamily: 'var(--font-family)',
            fontSize: '14px',
            padding: '12px 16px'
          },
          success: {
            style: {
              background: 'var(--success-light)',
              border: '2px solid var(--success)',
              color: 'var(--success-dark)'
            },
            iconTheme: {
              primary: 'var(--success)',
              secondary: 'white',
            },
          },
          error: {
            style: {
              background: 'var(--error-light)',
              border: '2px solid var(--error)',
              color: 'var(--error-dark)'
            },
            iconTheme: {
              primary: 'var(--error)',
              secondary: 'white',
            },
          },
          loading: {
            style: {
              background: 'var(--info-light)',
              border: '2px solid var(--info)',
              color: 'var(--info-dark)'
            },
          },
        }}
      />
      <AnimatePresence mode="wait">
        <AppRoutes />
      </AnimatePresence>
    </div>
  );
}

export default App;