#!/usr/bin/env node
/**
 * sync-runtime-version.js
 *
 * Syncs the app version to runtimeVersion in package.json.
 * Use this script when you need to create a new native build
 * (e.g., when adding native modules or upgrading Expo SDK).
 *
 * Usage: npm run version:sync-runtime
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const currentVersion = packageJson.version;
  const currentRuntimeVersion = packageJson.config?.runtimeVersion;

  console.log('\n--- Runtime Version Sync ---\n');
  console.log(`Current app version:     ${currentVersion}`);
  console.log(`Current runtimeVersion:  ${currentRuntimeVersion}`);

  if (currentVersion === currentRuntimeVersion) {
    console.log('\n[INFO] Versions are already in sync. No changes needed.\n');
    process.exit(0);
  }

  // Update runtimeVersion to match version
  if (!packageJson.config) {
    packageJson.config = {};
  }
  packageJson.config.runtimeVersion = currentVersion;

  // Write back to package.json
  fs.writeFileSync(
    packageJsonPath,
    JSON.stringify(packageJson, null, 2) + '\n',
    'utf8'
  );

  console.log(`\n[SUCCESS] runtimeVersion updated: ${currentRuntimeVersion} -> ${currentVersion}`);
  console.log('\n[IMPORTANT] This change requires a new native build!');
  console.log('  1. Commit this change');
  console.log('  2. Run: npm run build:prod:all');
  console.log('  3. Submit to stores: npm run submit:all\n');

} catch (error) {
  console.error('[ERROR] Failed to sync runtime version:', error.message);
  process.exit(1);
}
