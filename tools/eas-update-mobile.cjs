#!/usr/bin/env node

const { spawnSync } = require('node:child_process');

const [, , branch, environment, ...messageParts] = process.argv;
const message = messageParts.join(' ').trim();

if (!branch || !environment || !message) {
  console.error(
    'Usage: node ./tools/eas-update-mobile.cjs <branch> <environment> <message>'
  );
  process.exit(1);
}

for (const platform of ['ios', 'android']) {
  console.log(`Publishing ${platform} OTA update to ${branch}...`);

  const result = spawnSync(
    'npx',
    [
      'eas',
      'update',
      '--branch',
      branch,
      '--environment',
      environment,
      '--platform',
      platform,
      '--message',
      message,
    ],
    { stdio: 'inherit' }
  );

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}
