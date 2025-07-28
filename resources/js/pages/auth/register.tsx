import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';
import AuthLayout from '@/layouts/auth-layout';
import { route } from '@/lib/wayfinder';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface RegisterData {
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}

export default function Register() {
  const { data, setData, post, processing, errors, reset } = useForm<RegisterData>({
    name: '',
    email: '',
    password: '',
    password_confirmation: '',
  });

  const submit: FormEventHandler = (e) => {
    e.preventDefault();

    post(route.register().url, {
      onFinish: () => reset('password', 'password_confirmation'),
    });
  };

  return (
    <AuthLayout title="Register">
      <Head title="Register" />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="p-6">
          <div className="text-center mb-6">
            <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Register</h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Enter your details below to create your account
            </p>
          </div>

          <form onSubmit={submit}>
            {/* Full Name Input */}
            <div className="mb-4">
              <Label htmlFor="name" className="mb-2">
                Full Name
              </Label>
              <Input
                id="name"
                type="text"
                name="name"
                value={data.name}
                autoComplete="name"
                placeholder="Full Name"
                onChange={(e) => setData('name', e.target.value)}
                required
              />
              {errors.name && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
              )}
            </div>

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
                autoComplete="new-password"
                placeholder="••••••••"
                onChange={(e) => setData('password', e.target.value)}
                required
              />
              {errors.password && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password}</p>
              )}
            </div>

            {/* Confirm Password Input */}
            <div className="mb-4">
              <Label htmlFor="password_confirmation" className="mb-2">
                Confirm Password
              </Label>
              <Input
                id="password_confirmation"
                type="password"
                name="password_confirmation"
                value={data.password_confirmation}
                autoComplete="new-password"
                placeholder="••••••••"
                onChange={(e) => setData('password_confirmation', e.target.value)}
                required
              />
              {errors.password_confirmation && (
                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.password_confirmation}</p>
              )}
            </div>

            {/* Register Button */}
            <Button
              type="submit"
              disabled={processing}
              className="w-full"
            >
              {processing ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>

          {/* Login Link */}
          <div className="text-center mt-6">
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Already have an account?{' '}
              <Link
                href={route.login().url}
                className="text-blue-600 dark:text-blue-400 hover:underline font-medium"
              >
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </AuthLayout>
  );
}