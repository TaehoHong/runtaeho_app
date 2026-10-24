#!/usr/bin/env node
/* global __dirname */

const { spawnSync } = require('node:child_process');
const path = require('node:path');

const [, , branch, environment, ...messageParts] = process.argv;
const message = messageParts.join(' ').trim();

if (!branch || !environment || !message) {
  console.error(
    'Usage: node ./tools/eas-update-mobile.cjs <branch> <environment> <message>'
  );
  process.exit(1);
}

if ({ production: 'production', staging: 'preview' }[branch] !== environment) {
  console.error('지원하지 않는 OTA 브랜치/환경 조합');
  process.exit(1);
}

const result = spawnSync('bash', [
  path.join(__dirname, '../scripts/deploy-ota.sh'), '-b', branch, '-m', message,
], { stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exit(result.status ?? 1);
