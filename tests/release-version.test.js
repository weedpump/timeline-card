import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  extractReleaseNotes,
  validateReleaseMetadata,
} from '../scripts/validate-release-version.mjs';

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

  it.each(['vbanana', 'vv1.2.3', '1.2.3'])(
    'rejects malformed release tag %s',
    (tagName) => {
      expect(
        validateReleaseMetadata({
          tagName,
          packageVersion: '1.2.3',
          lockfileVersion: '1.2.3',
          lockRootVersion: '1.2.3',
          changelog: '## v1.2.3\n\nRelease notes',
        })
      ).toContain(`Release tag ${tagName} must match v<SemVer>`);
    }
  );

  it('rejects malformed package and lockfile versions', () => {
    expect(
      validateReleaseMetadata({
        tagName: 'v1.2.3',
        packageVersion: 'v1.2.3',
        lockfileVersion: 'banana',
        lockRootVersion: '01.2.3',
        changelog: '## v1.2.3\n\nRelease notes',
      })
    ).toEqual(
      expect.arrayContaining([
        'package.json version v1.2.3 must be valid SemVer without a v prefix',
        'package-lock.json version banana must be valid SemVer without a v prefix',
        'package-lock.json root version 01.2.3 must be valid SemVer without a v prefix',
      ])
    );
  });

  it('extracts the exact tag section instead of a regex-like heading', () => {
    const notes = extractReleaseNotes(
      '## v1x11x2\n\nWrong notes\n\n## v1.11.2\n\nCorrect notes\n\n## v1.11.1\n\nOlder notes\n',
      'v1.11.2'
    );

    expect(notes).toBe('Correct notes\n');
  });

  it('rejects duplicate and whitespace-only release-note sections', () => {
    expect(() =>
      extractReleaseNotes(
        '## v1.11.2\n \n\t\n## v1.11.2\n\nActual notes\n',
        'v1.11.2'
      )
    ).toThrow('Changelog must contain exactly one section for v1.11.2');

    expect(() => extractReleaseNotes('## v1.11.2\n \n\t\n', 'v1.11.2')).toThrow(
      'Release notes section for v1.11.2 is empty'
    );
  });
});
