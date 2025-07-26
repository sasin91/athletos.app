import { Head } from '@inertiajs/react';
import { useState, useEffect } from 'react';
import SettingsLayout from '@/components/Settings/SettingsLayout';

type Theme = 'light' | 'dark' | 'system';

export default function Appearance() {
  const [currentTheme, setCurrentTheme] = useState<Theme>('system');

  useEffect(() => {
    // Get the current theme from localStorage or default to system
    const savedTheme = localStorage.getItem('theme') as Theme || 'system';
    setCurrentTheme(savedTheme);
  }, []);

  const setAppearance = (theme: Theme) => {
    setCurrentTheme(theme);

    if (theme === 'system') {
      localStorage.removeItem('theme');
      // Apply system preference
      if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } else {
      localStorage.setItem('theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    }
  };

  const themeOptions = [
    { value: 'light' as Theme, label: 'Light', description: 'Always use light mode' },
    { value: 'dark' as Theme, label: 'Dark', description: 'Always use dark mode' },
    { value: 'system' as Theme, label: 'System', description: 'Follow system preference' },
  ];

  return (
    <SettingsLayout>
      <Head title="Appearance Settings - Athletos" />

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden mb-6">
        <div className="p-6">
          <div className="mb-6">
            <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">Appearance</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
              Update the appearance settings for your account
            </p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Theme
              </label>
              <div className="space-y-3">
                {themeOptions.map((option) => (
                  <label
                    key={option.value}
                    className={`relative flex items-center p-4 rounded-lg border-2 cursor-pointer transition-colors ${currentTheme === option.value
                        ? 'border-blue-600 bg-blue-50 dark:bg-blue-900/20'
                        : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 dark:hover:border-blue-600'
                      }`}
                  >
                    <input
                      type="radio"
                      name="theme"
                      value={option.value}
                      checked={currentTheme === option.value}
                      onChange={() => setAppearance(option.value)}
                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 dark:border-gray-600"
                    />
                    <div className="ml-4">
                      <div className="text-base font-medium text-gray-900 dark:text-gray-100">
                        {option.label}
                      </div>
                      <div className="text-sm text-gray-600 dark:text-gray-400">
                        {option.description}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm text-blue-800 dark:text-blue-200">
                <strong>Note:</strong> Theme changes are applied immediately and saved to your browser.
                The system option will automatically switch between light and dark modes based on your device settings.
              </p>
            </div>
          </div>
        </div>
      </div>
    </SettingsLayout>
  );
}