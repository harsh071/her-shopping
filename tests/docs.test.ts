import { expect, test } from 'vitest';

import { CAPABILITIES } from '@/lib/capabilities/registry';

/** Keeps the README's tool table honest about what the site actually exposes. */
test('every capability is documented in the README', async () => {
  const readme = await import('node:fs/promises').then((fs) =>
    fs.readFile('README.md', 'utf8'),
  );
  for (const capability of CAPABILITIES) {
    expect(readme, `README is missing ${capability.name}`).toContain(
      `\`${capability.name}\``,
    );
  }
});
