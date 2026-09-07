import { defineConfig } from '@playwright/test';

export default defineConfig({
	use: {
		baseURL: 'http://localhost:4173',
		launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH }
	},
	webServer: { command: 'npm run build && npm run preview', port: 4173, timeout: 180_000 },
	testMatch: '**/*.e2e.{ts,js}'
});
