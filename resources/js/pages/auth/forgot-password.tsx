import { FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthLayout from '@/layouts/auth-layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import password from '@/routes/password';
import { login } from '@/routes';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(password.email.url());
    };

    return (
        <AuthLayout 
            title="Forgot Password" 
            description="Enter your email address and we'll send you a password reset link."
        >
            <Head title="Forgot Password" />

            <div className="space-y-6">
                {status && (
                    <div className="rounded-md bg-green-50 p-4 text-sm text-green-600">
                        {status}
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input
                            id="email"
                            type="email"
                            name="email"
                            value={data.email}
                            className="mt-1 block w-full"
                            autoFocus
                            onChange={(e) => setData('email', e.target.value)}
                        />
                        {errors.email && <div className="text-sm text-red-600">{errors.email}</div>}
                    </div>

                    <Button type="submit" disabled={processing} className="w-full">
                        Email Password Reset Link
                    </Button>
                </form>

                <div className="text-center">
                    <Link
                        href={login.url()}
                        className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                        Back to login
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
}