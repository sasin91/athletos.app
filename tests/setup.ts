import '@testing-library/jest-dom';

// Mock Inertia.js
global.route = vi.fn((name: string, params?: any) => {
  if (params) {
    return `/${name}/${typeof params === 'object' ? Object.values(params).join('/') : params}`;
  }
  return `/${name}`;
});

// Mock window.matchMedia for theme detection
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock EventSource for chat testing
global.EventSource = vi.fn().mockImplementation(() => ({
  close: vi.fn(),
  addEventListener: vi.fn(),
  removeEventListener: vi.fn(),
}));