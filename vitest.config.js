import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests in tests/ create their own jsdom windows via `new JSDOM(...)`,
    // so we use the node environment to avoid conflicting outer jsdom patching.
    environment: 'node',
    globals: true,
  },
});
