import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export function validateReleaseMetadata({
  tagName,
  packageVersion,
  lockfileVersion,
  lockRootVersion,
  changelog,
}) {
  const tagVersion = tagName?.startsWith('v') ? tagName.slice(1) : tagName;
  const errors = [];

  if (tagVersion !== packageVersion) {
    errors.push(
      `Tag version ${tagVersion} does not match package.json version ${packageVersion}`
    );
  }

  if (tagVersion !== lockfileVersion || tagVersion !== lockRootVersion) {
    errors.push(
      `Tag version ${tagVersion} does not match package-lock.json versions ${lockfileVersion}/${lockRootVersion}`
    );
  }

  const escapedVersion = tagVersion.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const changelogHeading = new RegExp(`^##\\s+v${escapedVersion}\\s*$`, 'm');
  if (!changelogHeading.test(changelog)) {
    errors.push(`No changelog section found for v${tagVersion}`);
  }

  return errors;
}

function validateCurrentRelease() {
  const packageMetadata = JSON.parse(readFileSync('package.json', 'utf8'));
  const lockMetadata = JSON.parse(readFileSync('package-lock.json', 'utf8'));
  const changelog = readFileSync('CHANGELOG.md', 'utf8');
  const errors = validateReleaseMetadata({
    tagName: process.env.GITHUB_REF_NAME,
    packageVersion: packageMetadata.version,
    lockfileVersion: lockMetadata.version,
    lockRootVersion: lockMetadata.packages[''].version,
    changelog,
  });

  if (errors.length) {
    errors.forEach((error) => console.error(`::error::${error}`));
    process.exitCode = 1;
    return;
  }

  console.log(`Release metadata matches ${process.env.GITHUB_REF_NAME}`);
}

const isMainModule =
  process.argv[1] &&
  fileURLToPath(import.meta.url) === resolve(process.argv[1]);
if (isMainModule) validateCurrentRelease();
