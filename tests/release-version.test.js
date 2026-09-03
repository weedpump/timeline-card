import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { validateReleaseMetadata } from '../scripts/validate-release-version.mjs';

const packageMetadata = JSON.parse(
  readFileSync(new URL('../package.json', import.meta.url), 'utf8')
);
const lockMetadata = JSON.parse(
  readFileSync(new URL('../package-lock.json', import.meta.url), 'utf8')
);
const changelog = readFileSync(
  new URL('../CHANGELOG.md', import.meta.url),
  'utf8'
);

describe('release version metadata', () => {
  it('keeps package, lockfile, and latest changelog versions aligned', () => {
    const latestChangelogVersion = changelog.match(/^## v([^\s]+)$/m)?.[1];

    expect(latestChangelogVersion).toBeDefined();
    expect(packageMetadata.version).toBe(latestChangelogVersion);
    expect(lockMetadata.version).toBe(latestChangelogVersion);
    expect(lockMetadata.packages[''].version).toBe(latestChangelogVersion);
  });

  it('accepts matching release metadata', () => {
    expect(
      validateReleaseMetadata({
        tagName: 'v1.11.2',
        packageVersion: '1.11.2',
        lockfileVersion: '1.11.2',
        lockRootVersion: '1.11.2',
        changelog: '## v1.11.2\n\nRelease notes',
      })
    ).toEqual([]);
  });

  it('rejects mismatched tags and missing changelog sections', () => {
    expect(
      validateReleaseMetadata({
        tagName: 'v1.11.3',
        packageVersion: '1.11.2',
        lockfileVersion: '1.11.2',
        lockRootVersion: '1.11.2',
        changelog: '## v1.11.2\n\nRelease notes',
      })
    ).toEqual([
      'Tag version 1.11.3 does not match package.json version 1.11.2',
      'Tag version 1.11.3 does not match package-lock.json versions 1.11.2/1.11.2',
      'No changelog section found for v1.11.3',
    ]);
  });
});
