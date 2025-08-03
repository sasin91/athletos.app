import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import AuthLayout from '@/layouts/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { login, register } from '@/routes';
import password from '@/routes/password';

type LoginData = {
  email: string;
  password: string;
  remember: boolean;
}

interface Props {
  status?: string;
  canResetPassword: boolean;
}

export default function Login({ status, canResetPassword }: Props) {
  const { data, setData, post, processing, errors, reset } = useForm<LoginData>({
    email: '',
    password: '',
    remember: false,
  });

  const submit: FormEventHandler = (e) => {
    e.preventDefault();

    post(login.url(), {
      onFinish: () => reset('password'),
    });
  };

  return (
    <AuthLayout title="Login" description='Please sign in to your account'>
      <Head title="Login" />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Login</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">Sign in to your account</p>
          </div>

          {status && (
            <div className="mb-4 font-medium text-sm text-green-600 dark:text-green-400">
              {status}
            </div>
          )}

          <form onSubmit={submit}>
            {/* Email Input */}
            <div className="mb-4">
              <Label htmlFor="email" className="mb-2">
                Email
              </Label>
              <Input
                id="email"
                type="email"
                name="email"
                value={data.email}
                autoComplete="username"
                placeholder="your@email.com"
                onChange={(e) => setData('email', e.target.value)}
                required
              />
              {errors.email && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.email}</p>
              )}
            </div>

            {/* Password Input */}
            <div className="mb-4">
              <Label htmlFor="password" className="mb-2">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                name="password"
                value={data.password}
                autoComplete="current-password"
                placeholder="••••••••"
                onChange={(e) => setData('password', e.target.value)}
                required
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
              )}
              {canResetPassword && (
                <Link
                  href={password.request.url()}
                  className="text-xs text-blue-600 dark:text-blue-400 hover:underline"
                >
                  Forgot password?
                </Link>
              )}
            </div>

            {/* Remember Me */}
            <div className="mb-6">
              <Label className="flex items-center space-x-2">
                <Checkbox
                  name="remember"
                  checked={data.remember}
                  onCheckedChange={(checked) => setData('remember', checked as boolean)}
                />
                <span className="text-sm">
                  Remember me
                </span>
              </Label>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={processing}
              className="w-full"
            >
              {processing ? 'Signing In...' : 'Sign In'}
            </Button>
          </form>

          {/* Register Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Don't have an account?{' '}
              <Link
                href={register.url()}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Sign up
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}