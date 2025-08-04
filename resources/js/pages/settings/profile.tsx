import { Head, useForm } from '@inertiajs/react';
import { useState } from 'react';
import SettingsLayout from '@/layouts/settings-layout';
import settings from '@/routes/settings';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
    put(settings.profile.update.url(), {
      onSuccess: () => {
        // Form will be reset automatically on successful update
      },
    });
  };

  const handleDeleteAccount = () => {
    if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
      deleteAccount(settings.profile.destroy.url());
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
              <Label htmlFor="name" className="mb-2">
                Name
              </Label>
              <Input
                type="text"
                id="name"
                name="name"
                value={data.name}
                onChange={(e) => setData('name', e.target.value)}
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

            <div className="mb-6">
              <Label htmlFor="email" className="mb-2">
                Email
              </Label>
              <Input
                type="email"
                id="email"
                name="email"
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            <div>
              <Button
                type="submit"
                disabled={processing}
              >
                {processing ? 'Saving...' : 'Save'}
              </Button>
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
            <Button
              type="button"
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteProcessing}
            >
              {deleteProcessing ? 'Deleting...' : 'Delete Account'}
            </Button>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}