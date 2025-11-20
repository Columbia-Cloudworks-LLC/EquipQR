import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import userEvent from '@testing-library/user-event';
import SignInForm from './SignInForm';

// Mock useAuth hook - moved before vi.mock to avoid hoisting issues
const mockSignIn = vi.fn();

vi.mock('@/hooks/useAuth', () => ({
  useAuth: () => ({
    signIn: mockSignIn,
  }),
}));

describe('SignInForm', () => {
  const mockOnError = vi.fn();
  const mockSetIsLoading = vi.fn();

  const defaultProps = {
    onError: mockOnError,
    isLoading: false,
    setIsLoading: mockSetIsLoading,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockSignIn.mockResolvedValue({ error: null });
  });

  it('should render all form fields', () => {
    render(<SignInForm {...defaultProps} />);

    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('should have correct input types', () => {
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    expect(emailInput).toHaveAttribute('type', 'email');
    expect(passwordInput).toHaveAttribute('type', 'password');
  });

  it('should require email and password fields', () => {
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    expect(emailInput).toHaveAttribute('required');
    expect(passwordInput).toHaveAttribute('required');
  });

  it('should update form data when typing in inputs', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('should call signIn with correct data on form submission', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.click(submitButton);

    expect(mockSetIsLoading).toHaveBeenCalledWith(true);
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    expect(mockSetIsLoading).toHaveBeenCalledWith(false);
  });

  it('should prevent form submission if fields are empty', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await user.click(submitButton);

    // Form validation should prevent submission
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should validate email format and prevent submission with invalid email', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    // Enter invalid email - native HTML5 validation will prevent submission
    await user.type(emailInput, 'invalid-email');
    await user.type(passwordInput, 'password123');
    
    // Try to submit - should be blocked by native validation
    // The form won't submit with invalid email format
    fireEvent.click(submitButton);
    
    // signIn should not be called due to HTML5 validation
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should handle sign-in errors', async () => {
    const mockError = new Error('Invalid credentials');
    mockSignIn.mockResolvedValue({ error: mockError });

    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'wrongpassword');
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Invalid credentials');
    });

    expect(mockSetIsLoading).toHaveBeenCalledWith(true);
    expect(mockSetIsLoading).toHaveBeenCalledWith(false);
  });

  it('should disable submit button when loading', () => {
    render(<SignInForm {...defaultProps} isLoading={true} />);

    const submitButton = screen.getByRole('button');
    expect(submitButton).toBeDisabled();
  });

  it('should show loading spinner when loading', () => {
    render(<SignInForm {...defaultProps} isLoading={true} />);

    const spinner = screen.getByRole('status', { hidden: true });
    expect(spinner).toBeInTheDocument();
  });

  it('should not show loading spinner when not loading', () => {
    render(<SignInForm {...defaultProps} isLoading={false} />);

    const spinner = screen.queryByRole('status', { hidden: true });
    expect(spinner).not.toBeInTheDocument();
  });

  it('should handle form submission with Enter key', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    await user.keyboard('{Enter}');

    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('should handle multiple rapid submissions', async () => {
    const user = userEvent.setup();
    
    // Mock signIn with delay to simulate real network conditions
    mockSignIn.mockImplementation(() => 
      new Promise(resolve => 
        setTimeout(() => resolve({ error: null }), 50)
      )
    );
    
    // Create a wrapper that manages loading state internally
    const TestWrapper = () => {
      const [localIsLoading, setLocalIsLoading] = React.useState(false);
      return (
        <SignInForm 
          onError={mockOnError}
          isLoading={localIsLoading}
          setIsLoading={setLocalIsLoading}
        />
      );
    };
    
    render(<TestWrapper />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: 'Sign In' });

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');
    
    // Fire first click and immediately fire additional rapid clicks
    await user.click(submitButton);
    
    // Fire additional rapid clicks while first submission is processing
    user.click(submitButton); // Don't await - fire immediately
    user.click(submitButton); // Don't await - fire immediately
    
    // Wait for the button to be disabled (loading state active)
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });

    // Should only be called once due to loading state protection
    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledTimes(1);
    });
  });

  it('should handle form reset correctly', async () => {
    const user = userEvent.setup();
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    await user.type(emailInput, 'test@example.com');
    await user.type(passwordInput, 'password123');

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');

    // Clear inputs manually (simulating form reset)
    await user.clear(emailInput);
    await user.clear(passwordInput);

    expect(emailInput).toHaveValue('');
    expect(passwordInput).toHaveValue('');
  });
});