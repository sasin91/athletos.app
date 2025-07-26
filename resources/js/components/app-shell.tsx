import { SidebarProvider } from '@/components/ui/sidebar';
import { ToastProvider } from '@/components/ui/Toast';
import { TooltipProvider } from '@/components/ui/tooltip';
import InstallPrompt from '@/components/PWA/InstallPrompt';
import UpdateNotification from '@/components/PWA/UpdateNotification';
import AppFooter from '@/components/app-footer';
import { SharedData } from '@/types';
import { usePage } from '@inertiajs/react';

interface AppShellProps {
    children: React.ReactNode;
    variant?: 'header' | 'sidebar';
}

export function AppShell({ children, variant = 'header' }: AppShellProps) {
    const isOpen = usePage<SharedData>().props.sidebarOpen;

    const content = (
        <ToastProvider>
            <TooltipProvider>
                <div className="min-h-screen flex flex-col bg-gray-50 dark:bg-gray-900 text-gray-800 dark:text-gray-200 antialiased">
                    <div className="flex-1">
                        {children}
                    </div>
                    <AppFooter />
                </div>
                <InstallPrompt />
                <UpdateNotification />
            </TooltipProvider>
        </ToastProvider>
    );

    if (variant === 'header') {
        return content;
    }

    return <SidebarProvider defaultOpen={isOpen}>{content}</SidebarProvider>;
}
