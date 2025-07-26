import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import SettingsLayout from '@/Components/Settings/SettingsLayout';
import { route } from '@/lib/wayfinder';

interface ProfileData {
  name: string;
  email: string;
}

interface Props {
  user: {
    id: number;
    name: string;
    email: string;
  };
}

export default function Profile({ user }: Props) {
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  
  const { data, setData, put, processing, errors, reset } = useForm<ProfileData>({
    name: user.name,
    email: user.email,
  });

  const { delete: deleteAccount, processing: deleteProcessing } = useForm();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    put(route['settings.profile.update']().url, {
      onSuccess: () => {
        // Form will be reset automatically on successful update
      },
    });
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      deleteAccount(route['settings.profile.destroy']().url);
    }
  };

  return (
    <SettingsLayout>
      <Head title="Profile Settings - Athletos" />
      
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Profile Information</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Update your name and email address
            </p>
          </div>

          {/* Profile Form */}
          <form className="max-w-md mb-10" onSubmit={submit}>
            <div className="mb-4">
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Name
              </label>
              <input
                type="text"
                id="name"
                name="name"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            <div className="mb-6">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email
              </label>
              <input
                type="email"
                id="email"
                name="email"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            <div>
              <button
                type="submit"
                disabled={processing}
                className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-blue-700 focus:bg-blue-700 active:bg-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 transition ease-in-out duration-150"
              >
                {processing ? 'Saving...' : 'Save'}
              </button>
            </div>
          </form>

          {/* Delete Account Section */}
          <div className="border-t border-gray-200 dark:border-gray-700 pt-6 mt-6">
            <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200 mb-1">
              Delete Account
            </h3>
            <p className="text-gray-600 dark:text-gray-400 mb-4">
              Delete your account and all of its resources. This action cannot be undone.
            </p>
            <button
              type="button"
              onClick={handleDeleteAccount}
              disabled={deleteProcessing}
              className="inline-flex items-center px-4 py-2 bg-red-600 border border-transparent rounded-md font-semibold text-xs text-white uppercase tracking-widest hover:bg-red-700 focus:bg-red-700 active:bg-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 disabled:opacity-50 transition ease-in-out duration-150"
            >
              {deleteProcessing ? 'Deleting...' : 'Delete Account'}
            </button>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}