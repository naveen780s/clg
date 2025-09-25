import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { AuthProvider, useAuth } from '../../contexts/AuthContext';
import '@testing-library/jest-dom';

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock axios
jest.mock('axios', () => ({
  create: jest.fn(() => ({
    post: jest.fn(),
    get: jest.fn(),
    interceptors: {
      request: { use: jest.fn() },
      response: { use: jest.fn() }
    }
  })),
  post: jest.fn(),
  get: jest.fn()
}));

// Test component to use AuthContext
const TestComponent = () => {
  const { user, login, logout, loading, error } = useAuth();

  return (
    <div>
      <div data-testid="loading">{loading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="user">{user ? user.email : 'No User'}</div>
      <div data-testid="error">{error || 'No Error'}</div>
      <button 
        onClick={() => login('test@example.com', 'password')}
        data-testid="login-button"
      >
        Login
      </button>
      <button onClick={logout} data-testid="logout-button">
        Logout
      </button>
    </div>
  );
};

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorageMock.getItem.mockReturnValue(null);
  });

  test('provides initial auth state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');
  });

  test('loads user from localStorage on mount', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'student'
    };
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'mock-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
  });

  test('handles successful login', async () => {
    const axios = require('axios');
    const mockResponse = {
      data: {
        success: true,
        token: 'new-token',
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'student'
        }
      }
    };
    
    axios.post.mockResolvedValueOnce(mockResponse);

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByTestId('login-button');
    fireEvent.click(loginButton);

    // Should show loading state
    expect(screen.getByTestId('loading')).toHaveTextContent('Loading');

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    expect(localStorageMock.setItem).toHaveBeenCalledWith('token', 'new-token');
    expect(localStorageMock.setItem).toHaveBeenCalledWith(
      'user',
      JSON.stringify(mockResponse.data.user)
    );
  });

  test('handles login failure', async () => {
    const axios = require('axios');
    const errorMessage = 'Invalid credentials';
    
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          message: errorMessage
        }
      }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByTestId('login-button');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent(errorMessage);
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
  });

  test('handles network error during login', async () => {
    const axios = require('axios');
    
    axios.post.mockRejectedValueOnce(new Error('Network Error'));

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByTestId('login-button');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Network error occurred');
    });

    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading');
  });

  test('handles logout', () => {
    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'student'
    };
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'mock-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // User should be loaded initially
    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');

    const logoutButton = screen.getByTestId('logout-button');
    fireEvent.click(logoutButton);

    expect(screen.getByTestId('user')).toHaveTextContent('No User');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('token');
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('user');
  });

  test('clears error state on new login attempt', async () => {
    const axios = require('axios');
    
    // First login fails
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Invalid credentials'
        }
      }
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    const loginButton = screen.getByTestId('login-button');
    fireEvent.click(loginButton);

    await waitFor(() => {
      expect(screen.getByTestId('error')).toHaveTextContent('Invalid credentials');
    });

    // Second login succeeds
    const mockResponse = {
      data: {
        success: true,
        token: 'new-token',
        user: {
          id: '1',
          email: 'test@example.com',
          role: 'student'
        }
      }
    };
    
    axios.post.mockResolvedValueOnce(mockResponse);
    fireEvent.click(loginButton);

    // Error should be cleared during loading
    expect(screen.getByTestId('error')).toHaveTextContent('No Error');

    await waitFor(() => {
      expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    });
  });

  test('handles malformed user data in localStorage', () => {
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'mock-token';
      if (key === 'user') return 'invalid-json';
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    );

    // Should handle gracefully and not crash
    expect(screen.getByTestId('user')).toHaveTextContent('No User');
  });

  test('provides consistent auth state across multiple consumers', () => {
    const SecondTestComponent = () => {
      const { user } = useAuth();
      return <div data-testid="second-user">{user ? user.email : 'No User'}</div>;
    };

    const mockUser = {
      id: '1',
      email: 'test@example.com',
      role: 'student'
    };
    
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'token') return 'mock-token';
      if (key === 'user') return JSON.stringify(mockUser);
      return null;
    });

    render(
      <AuthProvider>
        <TestComponent />
        <SecondTestComponent />
      </AuthProvider>
    );

    expect(screen.getByTestId('user')).toHaveTextContent('test@example.com');
    expect(screen.getByTestId('second-user')).toHaveTextContent('test@example.com');
  });
});