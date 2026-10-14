import '@testing-library/jest-dom/vitest';
import { cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';

// Testing Library only unmounts between tests on its own when the test globals are
// switched on, and here they are not (see vitest.config.ts).
afterEach(() => {
  cleanup();
  localStorage.clear();
  document.cookie = 'csrftoken=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
});
