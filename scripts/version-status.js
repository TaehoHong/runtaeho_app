#!/usr/bin/env node
/**
 * version-status.js
 *
 * Displays the current version status of the app,
 * including version, runtimeVersion, and OTA update capability.
 *
 * Usage: npm run version:status
 */

const fs = require('fs');
const path = require('path');

const packageJsonPath = path.join(__dirname, '..', 'package.json');

try {
  // Read package.json
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));

  const version = packageJson.version;
  const runtimeVersion = packageJson.config?.runtimeVersion || 'Not set';

  console.log('\n========================================');
  console.log('         RunTaeho Version Status');
  console.log('========================================\n');

  console.log(`  App Version (version):        ${version}`);
  console.log(`  Runtime Version:              ${runtimeVersion}`);
  console.log('');

  // Analyze version relationship
  const versionMatch = version === runtimeVersion;

  if (versionMatch) {
    console.log('  Status: [SYNCED]');
    console.log('  - Versions are in sync');
    console.log('  - No pending OTA updates');
    console.log('  - Ready for new native build if needed');
  } else {
    console.log('  Status: [OTA READY]');
    console.log('  - App version is ahead of runtime version');
    console.log('  - Changes can be deployed via OTA update');
    console.log('  - Store app users will receive OTA updates');
  }

  console.log('\n----------------------------------------');
  console.log('  Quick Commands:');
  console.log('----------------------------------------');
  console.log('  OTA update (JS only):');
  console.log('    npm run update:prod -- "Your message"');
  console.log('');
  console.log('  Version bump + OTA:');
  console.log('    npm run release:ota -- "Your message"');
  console.log('');
  console.log('  Native release (sync + build):');
  console.log('    npm run release:native');
  console.log('');
  console.log('  Sync runtime version manually:');
  console.log('    npm run version:sync-runtime');
  console.log('========================================\n');

  // Version breakdown
  const [major, minor, patch] = version.split('.').map(Number);
  const [rtMajor, rtMinor, rtPatch] = runtimeVersion.split('.').map(Number);

  console.log('  Version Breakdown:');
  console.log(`    Major: ${major} (runtime: ${rtMajor})`);
  console.log(`    Minor: ${minor} (runtime: ${rtMinor})`);
  console.log(`    Patch: ${patch} (runtime: ${rtPatch})\n`);

  // OTA compatibility info
  if (!versionMatch) {
    const otaUpdates = [];
    if (patch > rtPatch) otaUpdates.push(`${patch - rtPatch} patch update(s)`);
    if (minor > rtMinor) otaUpdates.push(`${minor - rtMinor} minor update(s)`);
    if (major > rtMajor) otaUpdates.push(`${major - rtMajor} major update(s)`);

    console.log(`  OTA Updates Available: ${otaUpdates.join(', ')}`);
    console.log(`  Target Runtime: ${runtimeVersion}\n`);
  }

} catch (error) {
  console.error('[ERROR] Failed to read version info:', error.message);
  process.exit(1);
}
