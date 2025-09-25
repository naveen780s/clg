import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from '../../contexts/AuthContext';
import { ThemeProvider } from '../../contexts/ThemeContext';
import CreatePass from '../../pages/passes/CreatePass';
import '@testing-library/jest-dom';

// Mock axios
jest.mock('axios');

// Mock react-router-dom
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
  },
}));

// Mock AuthContext
const mockAuthContext = {
  user: {
    id: '1',
    role: 'student',
    firstName: 'Test',
    lastName: 'Student',
    email: 'student@test.com'
  },
  token: 'mock-token'
};

jest.mock('../../contexts/AuthContext', () => ({
  useAuth: () => mockAuthContext,
  AuthProvider: ({ children }) => <div>{children}</div>
}));

// Test wrapper component
const TestWrapper = ({ children }) => (
  <BrowserRouter>
    <ThemeProvider>
      <AuthProvider>
        {children}
      </AuthProvider>
    </ThemeProvider>
  </BrowserRouter>
);

describe('CreatePass Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders create pass form correctly', () => {
    render(
      <TestWrapper>
        <CreatePass />
      </TestWrapper>
    );

    expect(screen.getByRole('heading', { name: /create gate pass/i })).toBeInTheDocument();
    expect(screen.getByLabelText(/reason/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/destination/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/exit time/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/return time/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /create pass/i })).toBeInTheDocument();
  });

  test('displays validation errors for empty required fields', async () => {
    render(
      <TestWrapper>
        <CreatePass />
      </TestWrapper>
    );

    const submitButton = screen.getByRole('button', { name: /create pass/i });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/reason is required/i)).toBeInTheDocument();
    });
    
    expect(screen.getByText(/destination is required/i)).toBeInTheDocument();
    expect(screen.getByText(/exit time is required/i)).toBeInTheDocument();
    expect(screen.getByText(/return time is required/i)).toBeInTheDocument();
  });

  test('validates minimum reason length', async () => {
    render(
      <TestWrapper>
        <CreatePass />
      </TestWrapper>
    );

    const reasonField = screen.getByLabelText(/reason/i);
    const submitButton = screen.getByRole('button', { name: /create pass/i });

    fireEvent.change(reasonField, { target: { value: 'Short' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/reason must be at least 10 characters/i)).toBeInTheDocument();
    });
  });

  test('validates exit time is in the future', async () => {
    render(
      <TestWrapper>
        <CreatePass />
      </TestWrapper>
    );

    const exitTimeField = screen.getByLabelText(/exit time/i);
    const submitButton = screen.getByRole('button', { name: /create pass/i });

    // Set exit time to past date
    const pastDate = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago
    const pastDateString = pastDate.toISOString().slice(0, 16);

    fireEvent.change(exitTimeField, { target: { value: pastDateString } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/exit time must be in the future/i)).toBeInTheDocument();
    });
  });

  test('validates return time is after exit time', async () => {
    render(
      <TestWrapper>
        <CreatePass />
      </TestWrapper>
    );

    const exitTimeField = screen.getByLabelText(/exit time/i);
    const returnTimeField = screen.getByLabelText(/return time/i);
    const submitButton = screen.getByRole('button', { name: /create pass/i });

    const futureDate = new Date(Date.now() + 2 * 60 * 60 * 1000); // 2 hours from now
    const earlierDate = new Date(Date.now() + 1 * 60 * 60 * 1000); // 1 hour from now

    fireEvent.change(exitTimeField, { 
      target: { value: futureDate.toISOString().slice(0, 16) } 
    });
    fireEvent.change(returnTimeField, { 
      target: { value: earlierDate.toISOString().slice(0, 16) } 
    });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/return time must be after exit time/i)).toBeInTheDocument();
    });
  });

  test('shows loading state during form submission', async () => {
    const axios = require('axios');
    axios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

    render(
      <TestWrapper>
        <CreatePass />
      </TestWrapper>
    );

    const reasonField = screen.getByLabelText(/reason/i);
    const destinationField = screen.getByLabelText(/destination/i);
    const exitTimeField = screen.getByLabelText(/exit time/i);
    const returnTimeField = screen.getByLabelText(/return time/i);
    const submitButton = screen.getByRole('button', { name: /create pass/i });

    const exitDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const returnDate = new Date(Date.now() + 4 * 60 * 60 * 1000);

    fireEvent.change(reasonField, { target: { value: 'Medical appointment with doctor' } });
    fireEvent.change(destinationField, { target: { value: 'City Hospital' } });
    fireEvent.change(exitTimeField, { target: { value: exitDate.toISOString().slice(0, 16) } });
    fireEvent.change(returnTimeField, { target: { value: returnDate.toISOString().slice(0, 16) } });
    fireEvent.click(submitButton);

    expect(screen.getByText(/creating pass/i)).toBeInTheDocument();
    expect(submitButton).toBeDisabled();
  });

  test('handles successful pass creation', async () => {
    const axios = require('axios');
    const toast = require('react-hot-toast');
    
    const mockResponse = {
      data: {
        success: true,
        gatePass: {
          _id: 'pass123',
          reason: 'Medical appointment',
          status: 'pending'
        }
      }
    };
    axios.post.mockResolvedValueOnce(mockResponse);

    render(
      <TestWrapper>
        <CreatePass />
      </TestWrapper>
    );

    const reasonField = screen.getByLabelText(/reason/i);
    const destinationField = screen.getByLabelText(/destination/i);
    const exitTimeField = screen.getByLabelText(/exit time/i);
    const returnTimeField = screen.getByLabelText(/return time/i);
    const submitButton = screen.getByRole('button', { name: /create pass/i });

    const exitDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const returnDate = new Date(Date.now() + 4 * 60 * 60 * 1000);

    fireEvent.change(reasonField, { target: { value: 'Medical appointment with doctor' } });
    fireEvent.change(destinationField, { target: { value: 'City Hospital' } });
    fireEvent.change(exitTimeField, { target: { value: exitDate.toISOString().slice(0, 16) } });
    fireEvent.change(returnTimeField, { target: { value: returnDate.toISOString().slice(0, 16) } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.toast.success).toHaveBeenCalledWith('Gate pass created successfully!');
    });
    
    expect(mockNavigate).toHaveBeenCalledWith('/passes');
  });

  test('handles creation failure', async () => {
    const axios = require('axios');
    const toast = require('react-hot-toast');
    
    axios.post.mockRejectedValueOnce({
      response: {
        data: {
          message: 'Failed to create gate pass'
        }
      }
    });

    render(
      <TestWrapper>
        <CreatePass />
      </TestWrapper>
    );

    const reasonField = screen.getByLabelText(/reason/i);
    const destinationField = screen.getByLabelText(/destination/i);
    const exitTimeField = screen.getByLabelText(/exit time/i);
    const returnTimeField = screen.getByLabelText(/return time/i);
    const submitButton = screen.getByRole('button', { name: /create pass/i });

    const exitDate = new Date(Date.now() + 2 * 60 * 60 * 1000);
    const returnDate = new Date(Date.now() + 4 * 60 * 60 * 1000);

    fireEvent.change(reasonField, { target: { value: 'Medical appointment with doctor' } });
    fireEvent.change(destinationField, { target: { value: 'City Hospital' } });
    fireEvent.change(exitTimeField, { target: { value: exitDate.toISOString().slice(0, 16) } });
    fireEvent.change(returnTimeField, { target: { value: returnDate.toISOString().slice(0, 16) } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(toast.toast.error).toHaveBeenCalledWith('Failed to create gate pass');
    });
  });

  test('includes optional emergency contact field', () => {
    render(
      <TestWrapper>
        <CreatePass />
      </TestWrapper>
    );

    const emergencyContactField = screen.getByLabelText(/emergency contact/i);
    expect(emergencyContactField).toBeInTheDocument();

    fireEvent.change(emergencyContactField, { target: { value: '+1234567890' } });
    expect(emergencyContactField.value).toBe('+1234567890');
  });

  test('validates emergency contact phone number format', async () => {
    render(
      <TestWrapper>
        <CreatePass />
      </TestWrapper>
    );

    const emergencyContactField = screen.getByLabelText(/emergency contact/i);
    const submitButton = screen.getByRole('button', { name: /create pass/i });

    fireEvent.change(emergencyContactField, { target: { value: 'invalid-phone' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/invalid phone number format/i)).toBeInTheDocument();
    });
  });

  test('allows user to cancel and navigate back', () => {
    render(
      <TestWrapper>
        <CreatePass />
      </TestWrapper>
    );

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    fireEvent.click(cancelButton);

    expect(mockNavigate).toHaveBeenCalledWith('/passes');
  });
});