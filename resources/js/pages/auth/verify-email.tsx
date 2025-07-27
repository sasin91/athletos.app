import { FormEventHandler } from 'react';
import { Head, Link, useForm } from '@inertiajs/react';
import AuthLayout from '@/layouts/auth-layout';
import { Button } from '@/components/ui/button';

export default function VerifyEmail({ status }: { status?: string }) {
    const { post, processing } = useForm({});

    const submit: FormEventHandler = (e) => {
        e.preventDefault();
        post(route('verification.send'));
    };

    return (
        <AuthLayout 
            title="Verify Your Email" 
            description="Thanks for signing up! Before getting started, could you verify your email address by clicking on the link we just emailed to you?"
        >
            <Head title="Email Verification" />

            <div className="space-y-6">
                {status === 'verification-link-sent' && (
                    <div className="rounded-md bg-green-50 p-4 text-sm text-green-600">
                        A new verification link has been sent to the email address you provided during registration.
                    </div>
                )}

                <form onSubmit={submit} className="space-y-4">
                    <Button type="submit" disabled={processing} className="w-full">
                        Resend Verification Email
                    </Button>
                </form>

                <div className="text-center">
                    <Link
                        href={route('logout')}
                        method="post"
                        as="button"
                        className="text-sm text-muted-foreground hover:text-foreground underline"
                    >
                        Log Out
                    </Link>
                </div>
            </div>
        </AuthLayout>
    );
}