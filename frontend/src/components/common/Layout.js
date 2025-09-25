import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import Header from './Header';

const Layout = ({ children }) => {
  const { isAuthenticated } = useAuth();

  return (
    <div className="app-layout">
      {isAuthenticated && <Header />}
      <main className={`app-main ${isAuthenticated ? 'with-header' : ''}`}>
        {children}
      </main>
    </div>
  );
};

export default Layout;