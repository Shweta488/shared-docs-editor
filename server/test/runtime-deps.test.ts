import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// Vercel's function runtime can't require() an ES module from a CommonJS package.
// Local Node (and tsx, which Vitest uses) can, so a bad dependency only fails after
// deploy. sanitize-html 2.18 did exactly that. This loads every runtime dependency in
// plain Node with that feature turned off, to catch it before pushing.

const pkg = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8')) as {
  dependencies: Record<string, string>;
};

describe('runtime dependencies load without require(esm)', () => {
  it.each(Object.keys(pkg.dependencies))('%s', (name) => {
    const result = spawnSync(
      process.execPath,
      ['--no-experimental-require-module', '--input-type=module', '-e', `await import(${JSON.stringify(name)});`],
      { encoding: 'utf8' },
    );
    expect(result.stderr).not.toMatch(/ERR_REQUIRE_ESM/);
    expect(result.status).toBe(0);
  });
});
