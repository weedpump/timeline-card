import { readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const SEMVER_SOURCE =
  '(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)\\.(?:0|[1-9]\\d*)' +
  '(?:-(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*)' +
  '(?:\\.(?:0|[1-9]\\d*|\\d*[A-Za-z-][0-9A-Za-z-]*))*)?' +
  '(?:\\+[0-9A-Za-z-]+(?:\\.[0-9A-Za-z-]+)*)?';
const SEMVER_PATTERN = new RegExp(`^${SEMVER_SOURCE}$`);
const RELEASE_TAG_PATTERN = new RegExp(`^v${SEMVER_SOURCE}$`);
const PROJECT_ROOT = new URL('../', import.meta.url);

export function extractReleaseNotes(changelog, tagName) {
  const lines = changelog.split('\n');
  const matchingSections = [];

  lines.forEach((line, index) => {
    const heading = line.match(/^##\s+(\S+)\s*$/);
    if (heading?.[1] === tagName) matchingSections.push(index);
  });

  if (matchingSections.length === 0) {
    throw new Error(`No changelog section found for ${tagName}`);
  }
  if (matchingSections.length !== 1) {
    throw new Error(
      `Changelog must contain exactly one section for ${tagName}`
    );
  }

  const startIndex = matchingSections[0] + 1;
  const relativeEndIndex = lines
    .slice(startIndex)
    .findIndex((line) => /^##\s+/.test(line));
  const endIndex =
    relativeEndIndex === -1 ? lines.length : startIndex + relativeEndIndex;
  const notes = lines.slice(startIndex, endIndex).join('\n').trim();

  if (!notes) {
    throw new Error(`Release notes section for ${tagName} is empty`);
  }

  return `${notes}\n`;
}

export function validateReleaseMetadata({
  tagName,
  packageVersion,
  lockfileVersion,
  lockRootVersion,
  changelog,
}) {
  const errors = [];
  const tagIsValid =
    typeof tagName === 'string' && RELEASE_TAG_PATTERN.test(tagName);
  const tagVersion =
    typeof tagName === 'string' && tagName.startsWith('v')
      ? tagName.slice(1)
      : tagName;

  if (!tagIsValid) {
    errors.push(`Release tag ${tagName} must match v<SemVer>`);
  }

  [
    ['package.json version', packageVersion],
    ['package-lock.json version', lockfileVersion],
    ['package-lock.json root version', lockRootVersion],
  ].forEach(([label, version]) => {
    if (typeof version !== 'string' || !SEMVER_PATTERN.test(version)) {
      errors.push(
        `${label} ${version} must be valid SemVer without a v prefix`
      );
    }
  });

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

  try {
    extractReleaseNotes(changelog, tagName);
  } catch (error) {
    errors.push(error.message);
  }

  return errors;
}

function validateCurrentRelease() {
  const packageMetadata = JSON.parse(
    readFileSync(new URL('package.json', PROJECT_ROOT), 'utf8')
  );
  const lockMetadata = JSON.parse(
    readFileSync(new URL('package-lock.json', PROJECT_ROOT), 'utf8')
  );
  const changelog = readFileSync(new URL('CHANGELOG.md', PROJECT_ROOT), 'utf8');
  const tagName = process.env.GITHUB_REF_NAME;
  const errors = validateReleaseMetadata({
    tagName,
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

  const outputOptionIndex = process.argv.indexOf('--write-release-notes');
  if (outputOptionIndex !== -1) {
    const outputPath = process.argv[outputOptionIndex + 1];
    if (!outputPath) {
      console.error('::error::--write-release-notes requires a file path');
      process.exitCode = 1;
      return;
    }
    writeFileSync(
      resolve(outputPath),
      extractReleaseNotes(changelog, tagName),
      'utf8'
    );
  }

  console.log(`Release metadata matches ${tagName}`);
}

const scriptPath = fileURLToPath(import.meta.url);
const isMainModule =
  process.argv[1] && realpathSync(scriptPath) === realpathSync(process.argv[1]);
if (isMainModule) validateCurrentRelease();
