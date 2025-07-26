import { Head, useForm } from '@inertiajs/react';
import SettingsLayout from '@/Components/Settings/SettingsLayout';
import { route } from '@/lib/wayfinder';

interface PasswordData {
  current_password: string;
  password: string;
  password_confirmation: string;
}

interface Props {
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export default function Password({ user }: Props) {
  const { data, setData, put, processing, errors, reset } = useForm<PasswordData>({
    current_password: '',
    password: '',
    password_confirmation: '',
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    put(route['settings.password.update']().url, {
      onSuccess: () => {
        reset();
      },
    });
  };

  return (
    <SettingsLayout>
      <Head title="Password Settings - Athletos" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Update Password</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Ensure your account is using a long, random password to stay secure
            </p>
          </div>

          <form className="max-w-md" onSubmit={submit}>
            <div className="mb-4">
              <label htmlFor="current_password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Current Password
              </label>
              <input
                type="password"
                id="current_password"
                name="current_password"
                value={data.current_password}
                onChange={(e) => setData('current_password', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {errors.current_password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.current_password}</p>
              )}
            </div>

            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                New Password
              </label>
              <input
                type="password"
                id="password"
                name="password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
              )}
            </div>

            <div className="mb-6">
              <label htmlFor="password_confirmation" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                id="password_confirmation"
                name="password_confirmation"
                value={data.password_confirmation}
                onChange={(e) => setData('password_confirmation', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {errors.password_confirmation && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password_confirmation}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700 focus:bg-blue-700 active:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition ease-in-out duration-150"
              >
                {processing ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </SettingsLayout>
  );
}