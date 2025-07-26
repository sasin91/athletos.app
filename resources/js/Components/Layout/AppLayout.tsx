import { useState, useEffect } from 'react';
import { Link, usePage } from '@inertiajs/react';
import { routes } from '@/lib/wayfinder';
import { cn } from '@/lib/utils';
import InstallPrompt from '@/Components/PWA/InstallPrompt';
import UpdateNotification from '@/Components/PWA/UpdateNotification';
import { ToastProvider } from '@/Components/UI/Toast';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

interface User {
  id: number;
  name: string;
  email: string;
  initials: string;
}

interface AppLayoutProps {
  children: React.ReactNode;
}

export default function AppLayout({ children }: AppLayoutProps) {
  const { auth, flash } = usePage().props as any;
  const user: User = auth.user;
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [theme, setTheme] = useState('system');
  const [showSuccessMessage, setShowSuccessMessage] = useState(!!flash.message);

  useEffect(() => {
    const savedTheme = localStorage.getItem('appearance') || 'system';
    setTheme(savedTheme);
  }, []);

  const toggleTheme = () => {
    let newTheme: string;
    if (theme === 'light') {
      newTheme = 'dark';
    } else if (theme === 'dark') {
      newTheme = 'system';
    } else {
      newTheme = 'light';
    }
    
    setTheme(newTheme);
    setAppearance(newTheme);
  };

  const setAppearance = (appearance: string) => {
    const setDark = () => document.documentElement.classList.add('dark');
    const setLight = () => document.documentElement.classList.remove('dark');
    
    if (appearance === 'system') {
      localStorage.removeItem('appearance');
      const media = window.matchMedia('(prefers-color-scheme: dark)');
      media.matches ? setDark() : setLight();
    } else if (appearance === 'dark') {
      localStorage.setItem('appearance', 'dark');
      setDark();
    } else if (appearance === 'light') {
      localStorage.setItem('appearance', 'light');
      setLight();
    }
  };

  const handleLogout = () => {
    routes.auth.logout();
  };

  const handleChatOpen = () => {
    routes.chat();
  };

  const currentPath = usePage().url;

  return (
    <ToastProvider>
      <TooltipProvider>
        <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 antialiased">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm z-20 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between h-16 px-4">
          {/* Left side: Logo and navigation */}
          <div className="flex items-center space-x-8">
            <div className="font-semibold text-xl text-blue-600 dark:text-blue-400">
              Athletos
            </div>

            {/* Navigation Links */}
            <nav className="hidden md:flex items-center space-x-6">
              <Link
                href="/dashboard"
                className={cn(
                  "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium",
                  currentPath.startsWith('/dashboard') && "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                )}
              >
                Dashboard
              </Link>

              {user && (
                <Link
                  href="/trainings"
                  className={cn(
                    "text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 px-3 py-2 rounded-md text-sm font-medium",
                    currentPath.startsWith('/trainings') && "text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20"
                  )}
                >
                  Trainings
                </Link>
              )}
            </nav>
          </div>

          {/* Center: Theme Toggle */}
          <div className="flex items-center space-x-4">
            <button
              onClick={toggleTheme}
              className="p-2 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-110 active:scale-95"
              title={theme === 'light' ? 'Light Mode' : theme === 'dark' ? 'Dark Mode' : 'System Mode'}
            >
              {theme === 'light' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              )}
              {theme === 'dark' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
                </svg>
              )}
              {theme === 'system' && (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              )}
            </button>
          </div>

          {/* Right side: Chat & Profile */}
          <div className="flex items-center space-x-4">
            {/* AI Chat Button */}
            <Tooltip>
              <TooltipTrigger asChild>
                <button
                  onClick={handleChatOpen}
                  className="p-2 text-gray-500 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 transform hover:scale-110 active:scale-95 relative"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                  <span className="absolute -top-1 -right-1 h-3 w-3 bg-blue-500 rounded-full animate-pulse"></span>
                </button>
              </TooltipTrigger>
              <TooltipContent>
                Chat with AI Training Coach
              </TooltipContent>
            </Tooltip>

            {/* Profile */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center focus:outline-none transition-all duration-200 transform hover:scale-105 active:scale-95">
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="bg-gray-200 text-black dark:bg-gray-700 dark:text-white">
                    {user?.name ? user.name.split(' ').map(n => n[0]).join('').toUpperCase() : '--'}
                  </AvatarFallback>
                </Avatar>
                <span className="ml-2 hidden md:block">
                  {user?.name}
                </span>
                <svg className="h-5 w-5 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                </svg>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-48" align="end">
                <DropdownMenuItem asChild>
                  <Link href="/settings/profile" className="flex items-center">
                    <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleLogout}>
                  <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                  </svg>
                  Logout
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>

      {/* Success Message */}
      {showSuccessMessage && flash.message && (
        <div className="mb-6 bg-green-50 dark:bg-green-900 border-l-4 border-green-500 p-4 rounded-md">
          <div className="flex items-center">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-green-500 dark:text-green-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <p className="text-sm text-green-700 dark:text-green-200">{flash.message}</p>
            </div>
            <div className="ml-auto pl-3">
              <button
                onClick={() => setShowSuccessMessage(false)}
                className="-mx-1.5 -my-1.5 bg-green-50 dark:bg-green-900 text-green-500 dark:text-green-400 rounded-lg focus:ring-2 focus:ring-green-600 p-1.5 hover:bg-green-200 dark:hover:bg-green-800 inline-flex h-8 w-8"
              >
                <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto bg-gray-100 dark:bg-gray-900">
        {children}
      </main>

      {/* Footer */}
      <footer className="w-full border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-4 mt-auto">
        <div className="max-w-2xl mx-auto flex flex-col sm:flex-row justify-center sm:justify-between items-center px-4 text-sm text-gray-500 dark:text-gray-400">
          <div className="mb-2 sm:mb-0">&copy; {new Date().getFullYear()} Athletos. All rights reserved.</div>
          <div className="space-x-4">
            <Link href="/terms" className="hover:underline">Terms of Service</Link>
            <Link href="/privacy" className="hover:underline">Privacy Policy</Link>
            <Link href="/about" className="hover:underline">About</Link>
          </div>
        </div>
      </footer>

          {/* PWA Components */}
          <InstallPrompt />
          <UpdateNotification />
        </div>
      </TooltipProvider>
    </ToastProvider>
  );
}