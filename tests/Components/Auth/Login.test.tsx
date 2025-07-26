import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Login from '@/Pages/Auth/Login';

// Mock Inertia hooks
const mockPost = vi.fn();
const mockUseForm = {
  data: { email: '', password: '', remember: false },
  setData: vi.fn(),
  post: mockPost,
  processing: false,
  errors: {},
  reset: vi.fn(),
};

vi.mock('@inertiajs/react', () => ({
  Head: ({ title }: { title: string }) => <title>{title}</title>,
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
  useForm: () => mockUseForm,
}));

describe('Login Component', () => {
  const defaultProps = {
    canResetPassword: true,
    status: undefined,
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login form correctly', () => {
    render(<Login {...defaultProps} />);
    
    expect(screen.getByText('Login')).toBeInTheDocument();
    expect(screen.getByText('Sign in to your account')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByLabelText('Remember me')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Sign In' })).toBeInTheDocument();
  });

  it('displays forgot password link when canResetPassword is true', () => {
    render(<Login {...defaultProps} />);
    
    expect(screen.getByText('Forgot password?')).toBeInTheDocument();
  });

  it('does not display forgot password link when canResetPassword is false', () => {
    render(<Login {...defaultProps} canResetPassword={false} />);
    
    expect(screen.queryByText('Forgot password?')).not.toBeInTheDocument();
  });

  it('displays status message when provided', () => {
    render(<Login {...defaultProps} status="Password reset successful" />);
    
    expect(screen.getByText('Password reset successful')).toBeInTheDocument();
  });

  it('calls setData when email input changes', async () => {
    const user = userEvent.setup();
    render(<Login {...defaultProps} />);
    
    const emailInput = screen.getByLabelText('Email');
    await user.type(emailInput, 'test@example.com');
    
    expect(mockUseForm.setData).toHaveBeenCalledWith('email', 'test@example.com');
  });

  it('calls setData when password input changes', async () => {
    const user = userEvent.setup();
    render(<Login {...defaultProps} />);
    
    const passwordInput = screen.getByLabelText('Password');
    await user.type(passwordInput, 'password123');
    
    expect(mockUseForm.setData).toHaveBeenCalledWith('password', 'password123');
  });

  it('calls setData when remember checkbox changes', async () => {
    const user = userEvent.setup();
    render(<Login {...defaultProps} />);
    
    const rememberCheckbox = screen.getByLabelText('Remember me');
    await user.click(rememberCheckbox);
    
    expect(mockUseForm.setData).toHaveBeenCalledWith('remember', true);
  });

  it('submits form when login button is clicked', async () => {
    const user = userEvent.setup();
    render(<Login {...defaultProps} />);
    
    const submitButton = screen.getByRole('button', { name: 'Sign In' });
    await user.click(submitButton);
    
    expect(mockPost).toHaveBeenCalledWith(route('login'), {
      onFinish: expect.any(Function),
    });
  });

  it('displays register link', () => {
    render(<Login {...defaultProps} />);
    
    expect(screen.getByText("Don't have an account?")).toBeInTheDocument();
    expect(screen.getByText('Sign up')).toBeInTheDocument();
  });
});