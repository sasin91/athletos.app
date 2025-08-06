import { Link } from "@inertiajs/react";

export default function AppFooter() {
    return (
        <footer className="w-full border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 py-4 mt-auto">
            <div className="max-w-2xl mx-auto flex flex-col sm:flex-row justify-center sm:justify-between items-center px-4 text-sm text-gray-500 dark:text-gray-400">
                <div className="mb-2 sm:mb-0">&copy; {new Date().getFullYear()} Athletos. All rights reserved.</div>
                <div className="space-x-4">
                    <Link href="/terms" prefetch className="hover:underline">Terms of Service</Link>
                    <Link href="/privacy" prefetch className="hover:underline">Privacy Policy</Link>
                    <Link href="/about" prefetch className="hover:underline">About</Link>
                </div>
            </div>
        </footer>
    )
}