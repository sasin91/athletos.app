import { Head, useForm } from '@inertiajs/react';
import SettingsLayout from '@/layouts/settings-layout';
import { route } from '@/lib/wayfinder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

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
              <Label htmlFor="current_password" className="mb-2">
                Current Password
              </Label>
              <Input
                type="password"
                id="current_password"
                name="current_password"
                value={data.current_password}
                onChange={(e) => setData('current_password', e.target.value)}
                required
              />
              {errors.current_password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.current_password}</p>
              )}
            </div>

            <div className="mb-4">
              <Label htmlFor="password" className="mb-2">
                New Password
              </Label>
              <Input
                type="password"
                id="password"
                name="password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
                required
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
              )}
            </div>

            <div className="mb-6">
              <Label htmlFor="password_confirmation" className="mb-2">
                Confirm Password
              </Label>
              <Input
                type="password"
                id="password_confirmation"
                name="password_confirmation"
                value={data.password_confirmation}
                onChange={(e) => setData('password_confirmation', e.target.value)}
                required
              />
              {errors.password_confirmation && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password_confirmation}</p>
              )}
            </div>

            <div>
              <Button
                type="submit"
                disabled={processing}
              >
                {processing ? 'Updating...' : 'Update Password'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </SettingsLayout>
  );
}