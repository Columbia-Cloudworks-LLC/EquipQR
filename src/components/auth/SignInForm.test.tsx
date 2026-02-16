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

// Helper to fill form fields quickly using fireEvent.change
const fillFormFast = (email = 'test@example.com', password = 'password123') => {
  fireEvent.change(screen.getByLabelText('Email'), { target: { value: email } });
  fireEvent.change(screen.getByLabelText('Password'), { target: { value: password } });
};

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

  it('should update form data when typing in inputs', () => {
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.change(passwordInput, { target: { value: 'password123' } });

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');
  });

  it('should call signIn with correct data on form submission', async () => {
    render(<SignInForm {...defaultProps} />);

    // Fill form using fast helper
    fillFormFast();
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockSetIsLoading).toHaveBeenCalledWith(true);
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
      expect(mockSetIsLoading).toHaveBeenCalledWith(false);
    });
  });

  it('should prevent form submission if fields are empty', () => {
    render(<SignInForm {...defaultProps} />);

    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(submitButton);

    // Form validation should prevent submission
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should validate email format and prevent submission with invalid email', () => {
    render(<SignInForm {...defaultProps} />);

    // Enter invalid email - native HTML5 validation will prevent submission
    fillFormFast('invalid-email', 'password123');
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(submitButton);
    
    // signIn should not be called due to HTML5 validation
    expect(mockSignIn).not.toHaveBeenCalled();
  });

  it('should handle sign-in errors', async () => {
    const mockError = new Error('Invalid credentials');
    mockSignIn.mockResolvedValue({ error: mockError });

    render(<SignInForm {...defaultProps} />);

    fillFormFast('test@example.com', 'wrongpassword');
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnError).toHaveBeenCalledWith('Invalid credentials');
    });

    expect(mockSetIsLoading).toHaveBeenCalledWith(true);
    expect(mockSetIsLoading).toHaveBeenCalledWith(false);
  });

  it('should disable submit button when loading', () => {
    render(<SignInForm {...defaultProps} isLoading={true} />);

    // When loading, the button's accessible name includes the loading spinner's aria-label
    // So it becomes "Loading Sign In" instead of just "Sign In"
    const submitButton = screen.getByRole('button', { name: /Sign In/i });
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
    // Keep userEvent for keyboard testing but with delay: null
    const user = userEvent.setup({ delay: null });
    render(<SignInForm {...defaultProps} />);

    fillFormFast();
    
    // Focus on password field and press Enter to submit
    const passwordInput = screen.getByLabelText('Password');
    passwordInput.focus();
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
    });
  });

  it('should prevent multiple rapid submissions', async () => {
    // Use a controlled promise instead of setTimeout for faster tests
    let resolveSignIn!: (value: { error: null }) => void;
    mockSignIn.mockImplementation(() => 
      new Promise(resolve => {
        resolveSignIn = resolve;
      })
    );
    
    // Create a wrapper that manages loading state internally to test the actual guard behavior
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

    fillFormFast();
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    
    // Button should be enabled initially
    expect(submitButton).not.toBeDisabled();
    
    // Fire the first click - this should trigger the submission and set loading state
    fireEvent.click(submitButton);
    
    // Wait for React to process the state update and re-render with disabled button
    await waitFor(() => {
      expect(submitButton).toBeDisabled();
    });
    
    // Now that loading is active, fire additional clicks
    // These should be blocked by the isLoading guard in handleSubmit
    fireEvent.click(submitButton);
    fireEvent.click(submitButton);
    
    // Verify signIn was called only once (first click) before the guard was active
    expect(mockSignIn).toHaveBeenCalledTimes(1);
    
    // Resolve the promise to clean up
    resolveSignIn({ error: null });
    
    // Wait for submission to complete and button to re-enable
    await waitFor(() => {
      expect(submitButton).not.toBeDisabled();
    });
    
    // Final verification: signIn was still only called once despite multiple clicks
    expect(mockSignIn).toHaveBeenCalledTimes(1);
    expect(mockSignIn).toHaveBeenCalledWith('test@example.com', 'password123');
  });

  it('should handle form reset correctly', () => {
    render(<SignInForm {...defaultProps} />);

    const emailInput = screen.getByLabelText('Email');
    const passwordInput = screen.getByLabelText('Password');

    fillFormFast();

    expect(emailInput).toHaveValue('test@example.com');
    expect(passwordInput).toHaveValue('password123');

    // Clear inputs using fireEvent
    fireEvent.change(emailInput, { target: { value: '' } });
    fireEvent.change(passwordInput, { target: { value: '' } });

    expect(emailInput).toHaveValue('');
    expect(passwordInput).toHaveValue('');
  });
});
