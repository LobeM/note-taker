import { defineConfig } from 'vitest/config';

export default defineConfig({
  // Vite 8 resolves the `@/*` alias from tsconfig.json natively.
  resolve: { tsconfigPaths: true },
  // Explicit: Oxc isn't documented to follow tsconfig's `jsx: react-jsx`.
  oxc: { jsx: { runtime: 'automatic' } },
  test: {
    // lib/db.ts imports `bun:sqlite`, so the suite runs on Bun (`bun --bun vitest`).
    pool: 'forks',
    // Every test starts from each mock's original implementation, and vi.spyOn
    // targets (console.error, navigator.clipboard) are put back afterwards.
    mockReset: true,
    restoreMocks: true,
    env: { DATABASE_PATH: ':memory:' },
    projects: [
      { extends: true, test: { name: 'node', include: ['**/*.test.ts'], environment: 'node' } },
      {
        extends: true,
        test: {
          name: 'dom',
          include: ['**/*.test.tsx'],
          environment: 'happy-dom',
          setupFiles: ['test/setup-dom.ts'],
        },
      },
    ],
  },
});
