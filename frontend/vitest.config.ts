import { defineConfig, mergeConfig } from 'vitest/config'
import viteConfig from './vite.config'

// Builds on the app's own Vite config so tests compile exactly as the app does.
// No `globals: true`: tests import `describe`/`it`/`expect` from 'vitest', which keeps the
// type checker honest without adding test globals to the app's tsconfig.
export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      environment: 'jsdom',
      setupFiles: ['./src/test/setup.ts'],
      include: ['src/**/*.test.{ts,tsx}'],
      // Leftover mock state is how one test quietly passes because of another.
      restoreMocks: true,
    },
  }),
)
