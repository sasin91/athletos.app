import { render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi } from 'vitest';
import Profile from '@/pages/Settings/Profile';

// Mock Inertia hooks
const mockPut = vi.fn();
const mockDelete = vi.fn();
const mockUseForm = {
  data: { name: 'John Doe', email: 'john@example.com' },
  setData: vi.fn(),
  put: mockPut,
  processing: false,
  errors: {},
  reset: vi.fn(),
};

const mockDeleteForm = {
  delete: mockDelete,
  processing: false,
};

vi.mock('@inertiajs/react', () => ({
  Head: ({ title }: { title: string }) => <title>{title}</title>,
  Link: ({ href, children, className }: any) => (
    <a href={href} className={className}>{children}</a>
  ),
  useForm: vi.fn()
    .mockReturnValueOnce(mockUseForm)
    .mockReturnValue(mockDeleteForm),
  usePage: () => ({
    props: {
      auth: {
        user: { athlete: true }
      }
    }
  }),
}));

// Mock SettingsLayout
vi.mock('@/components/Settings/SettingsLayout', () => ({
  default: ({ children }: { children: React.ReactNode }) => <div data-testid="settings-layout">{children}</div>,
}));

describe('Profile Settings Component', () => {
  const defaultProps = {
    user: {
      id: 1,
      name: 'John Doe',
      email: 'john@example.com',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    // Reset the mock implementations for each test
    vi.mocked(vi.mock('@inertiajs/react').useForm)
      .mockReturnValueOnce(mockUseForm)
      .mockReturnValue(mockDeleteForm);
  });

  it('renders profile form correctly', () => {
    render(<Profile {...defaultProps} />);

    expect(screen.getByText('Profile Information')).toBeInTheDocument();
    expect(screen.getByText('Update your name and email address')).toBeInTheDocument();
    expect(screen.getByLabelText('Name')).toBeInTheDocument();
    expect(screen.getByLabelText('Email')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save' })).toBeInTheDocument();
  });

  it('displays user data in form fields', () => {
    render(<Profile {...defaultProps} />);

    const nameInput = screen.getByLabelText('Name') as HTMLInputElement;
    const emailInput = screen.getByLabelText('Email') as HTMLInputElement;

    expect(nameInput.value).toBe('John Doe');
    expect(emailInput.value).toBe('john@example.com');
  });

  it('renders delete account section', () => {
    render(<Profile {...defaultProps} />);

    expect(screen.getByText('Delete Account')).toBeInTheDocument();
    expect(screen.getByText('Delete your account and all of its resources. This action cannot be undone.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Delete Account' })).toBeInTheDocument();
  });

  it('calls setData when name input changes', async () => {
    const user = userEvent.setup();
    render(<Profile {...defaultProps} />);

    const nameInput = screen.getByLabelText('Name');
    await user.clear(nameInput);
    await user.type(nameInput, 'Jane Doe');

    expect(mockUseForm.setData).toHaveBeenCalledWith('name', 'Jane Doe');
  });

  it('calls setData when email input changes', async () => {
    const user = userEvent.setup();
    render(<Profile {...defaultProps} />);

    const emailInput = screen.getByLabelText('Email');
    await user.clear(emailInput);
    await user.type(emailInput, 'jane@example.com');

    expect(mockUseForm.setData).toHaveBeenCalledWith('email', 'jane@example.com');
  });

  it('submits form when save button is clicked', async () => {
    const user = userEvent.setup();
    render(<Profile {...defaultProps} />);

    const saveButton = screen.getByRole('button', { name: 'Save' });
    await user.click(saveButton);

    expect(mockPut).toHaveBeenCalledWith(route('settings.profile.update'), {
      onSuccess: expect.any(Function),
    });
  });

  it('shows confirmation dialog when delete account is clicked', async () => {
    const user = userEvent.setup();

    // Mock window.confirm
    const mockConfirm = vi.fn().mockReturnValue(true);
    vi.stubGlobal('confirm', mockConfirm);

    render(<Profile {...defaultProps} />);

    const deleteButton = screen.getByRole('button', { name: 'Delete Account' });
    await user.click(deleteButton);

    expect(mockConfirm).toHaveBeenCalledWith(
      'Are you sure you want to delete your account? This action cannot be undone.'
    );
    expect(mockDelete).toHaveBeenCalledWith(route('settings.profile.destroy'));

    vi.unstubAllGlobals();
  });
});