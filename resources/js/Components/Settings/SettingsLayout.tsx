import { Link, usePage } from '@inertiajs/react';
import AppLayout from '@/Components/Layout/AppLayout';
import { route } from '@/lib/wayfinder';

interface SettingsLayoutProps {
  children: React.ReactNode;
}

interface SettingsNavItem {
  label: string;
  href: string;
  routePattern: string;
}

export default function SettingsLayout({ children }: SettingsLayoutProps) {
  const { auth } = usePage().props as any;
  
  const navItems: SettingsNavItem[] = [
    {
      label: 'Profile',
      href: route['settings.profile.edit']().url,
      routePattern: 'settings.profile.*'
    },
    ...(auth.user?.athlete ? [{
      label: 'Athlete Profile',
      href: route['settings.athlete-profile.edit']().url,
      routePattern: 'settings.athlete-profile.*'
    }] : []),
    {
      label: 'Password',
      href: route['settings.password.edit']().url,
      routePattern: 'settings.password.*'
    },
    {
      label: 'Appearance',
      href: route['settings.appearance.edit']().url,
      routePattern: 'settings.appearance.*'
    }
  ];

  const isActiveRoute = (routePattern: string) => {
    // For now, use basic URL matching since we don't have route().current()
    const currentPath = window.location.pathname;
    const basePath = routePattern.replace('.*', '').replace('.', '/');
    return currentPath.includes(basePath);
  };

  return (
    <AppLayout>
      {/* Breadcrumbs */}
      <div className="mb-6 flex items-center text-sm">
        <Link
          href={route.dashboard().url}
          className="text-blue-600 dark:text-blue-400 hover:underline"
        >
          Dashboard
        </Link>
        <svg className="h-4 w-4 mx-2 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5l7 7-7 7" />
        </svg>
        <span className="text-gray-500 dark:text-gray-400">Settings</span>
      </div>

      {/* Page Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-800 dark:text-gray-100">Settings</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">Manage your account settings and preferences</p>
      </div>

      <div className="p-6">
        <div className="flex flex-col md:flex-row gap-6">
          {/* Sidebar Navigation */}
          <div className="w-full md:w-64 shrink-0 border-r border-gray-200 dark:border-gray-700 pr-4">
            <nav className="bg-gray-50 dark:bg-gray-800 rounded-lg overflow-hidden">
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {navItems.map((item) => (
                  <li key={item.routePattern}>
                    <Link
                      href={item.href}
                      className={`block px-4 py-3 ${
                        isActiveRoute(item.routePattern)
                          ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-gray-100 font-medium'
                          : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-600'
                      }`}
                    >
                      {item.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          </div>

          {/* Content */}
          <div className="flex-1">
            {children}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}