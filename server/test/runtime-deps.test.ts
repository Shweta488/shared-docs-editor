import { spawnSync } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

// Vercel's function runtime can't require() an ES module from a CommonJS package.
// Local Node (and tsx, which Vitest uses) can, so a bad dependency only fails after
// deploy. sanitize-html 2.18 did exactly that. This loads every package the server
// imports in plain Node with that feature turned off, to catch it before pushing.
// Client-only packages (React, TipTap) are bundled by Vite and never run on Vercel.

const root = fileURLToPath(new URL('../..', import.meta.url));

function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) return sourceFiles(path);
    return path.endsWith('.ts') ? [path] : [];
  });
}

// Bare specifiers from `import ... from 'x'` and `import('x')`, skipping relative,
// node: built-ins, and type-only imports.
function serverPackages(): string[] {
  const found = new Set<string>();
  const pattern = /(?:^import(?!\s+type)[^'"]*from\s*|import\()\s*['"]([^'"./][^'"]*)['"]/gm;
  for (const file of [...sourceFiles(join(root, 'server/src')), ...sourceFiles(join(root, 'api'))]) {
    for (const match of readFileSync(file, 'utf8').matchAll(pattern)) {
      const spec = match[1]!;
      if (!spec.startsWith('node:')) found.add(spec);
    }
  }
  return [...found].sort();
}

describe('server packages load without require(esm)', () => {
  const packages = serverPackages();

  it('finds the server imports', () => {
    expect(packages).toEqual(expect.arrayContaining(['express', 'sanitize-html', 'zod']));
  });

  it.each(packages)('%s', (name) => {
    const result = spawnSync(
      process.execPath,
      ['--no-experimental-require-module', '--input-type=module', '-e', `await import(${JSON.stringify(name)});`],
      { encoding: 'utf8', cwd: root },
    );
    expect(result.stderr).not.toMatch(/ERR_REQUIRE_ESM/);
    expect(result.status).toBe(0);
  });
});
