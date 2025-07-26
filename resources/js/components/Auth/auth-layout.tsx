import { useEffect } from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
  title?: string;
}

export default function AuthLayout({ children, title = 'Auth' }: AuthLayoutProps) {
  useEffect(() => {
    // Apply theme on mount
    const applyTheme = () => {
      const userPref = localStorage.getItem('theme');
      const systemPref = window.matchMedia('(prefers-color-scheme: dark)').matches;
      
      if (userPref === 'dark' || (userPref === null && systemPref)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };

    applyTheme();

    // Listen for system theme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (!localStorage.getItem('theme')) {
        applyTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  useEffect(() => {
    document.title = `${title} - Athletos`;
  }, [title]);

  return (
    <div className="min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 antialiased">
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          {children}
        </div>
      </main>
    </div>
  );
}