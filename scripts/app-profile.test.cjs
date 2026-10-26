/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

test('local and tester builds share the dev identity, never the production OAuth client or channel', () => {
  const { getProfile, profileEnvironment } = require('./app-profile.cjs');
  const local = getProfile('local');
  const development = getProfile('development');
  assert.equal(local.applicationId, 'com.runtaeho.runtaeho.dev');
  assert.equal(development.applicationId, 'com.runtaeho.runtaeho.dev');
  assert.equal(development.channel, 'staging');
  assert.equal(getProfile('production').applicationId, 'com.runtaeho.runtaeho');
  assert.equal(getProfile('production').channel, 'production');
  const env = profileEnvironment('development', { EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'stale-production-client' });
  assert.equal(env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
    '322350985432-8ncbik7vqu55b9k0elq2rnrf7utl42ka.apps.googleusercontent.com');
  assert.equal(env.NODE_ENV, 'production');
  assert.equal(env.EXPO_PUBLIC_ENV, 'development');
  assert.equal(env.EXPO_PUBLIC_ENABLE_DEBUG, 'false');
  assert.equal(profileEnvironment('local', {}).NODE_ENV, 'development');
  assert.equal(profileEnvironment('local', { EXPO_PUBLIC_ENABLE_LOGGING: 'false' }).EXPO_PUBLIC_ENABLE_LOGGING, 'false');
});

test('unknown profiles fail before a command can target an unintended app', () => {
  const { getProfile } = require('./app-profile.cjs');
  assert.throws(() => getProfile('preview'), /프로파일/);
  assert.throws(() => getProfile('constructor'), /프로파일/);
});

test('tester release loads development server config independently of NODE_ENV without editing env files', (t) => {
  const { loadProfileEnvironment } = require('./app-profile.cjs');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'runtaeho-profile-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const development = 'EXPO_PUBLIC_API_BASE_URL=https://development.example.invalid/api\n';
  fs.writeFileSync(path.join(root, '.env.development'), development);
  fs.writeFileSync(path.join(root, '.env.production'), 'EXPO_PUBLIC_API_BASE_URL=https://production.example.invalid/api\n');
  assert.equal(loadProfileEnvironment('development', {}, root).EXPO_PUBLIC_API_BASE_URL,
    'https://development.example.invalid/api');
  assert.equal(loadProfileEnvironment('production', {}, root).EXPO_PUBLIC_API_BASE_URL,
    'https://production.example.invalid/api');
  assert.equal(fs.readFileSync(path.join(root, '.env.development'), 'utf8'), development);
});

test('local Expo config disables OTA and uses the development Google callback', () => {
  const result = spawnSync('node', ['-e', `
    const {exp} = require('@expo/config').getConfig(process.cwd());
    console.log(JSON.stringify({id:exp.ios.bundleIdentifier, androidId:exp.android.package,
      ota:exp.updates.enabled, client:exp.extra.googleIosClientId,
      scheme:exp.plugins.find(p=>Array.isArray(p)&&p[0]==='@react-native-google-signin/google-signin')[1].iosUrlScheme}));
  `], { cwd: path.join(__dirname, '..'), encoding: 'utf8', env: {
    ...process.env, EXPO_NO_DOTENV: '1', EXPO_PUBLIC_ENV: 'local', EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'stale-production-client',
  } });
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    id: 'com.runtaeho.runtaeho.dev', androidId: 'com.runtaeho.runtaeho.dev', ota: false,
    client: '322350985432-8ncbik7vqu55b9k0elq2rnrf7utl42ka.apps.googleusercontent.com',
    scheme: 'com.googleusercontent.apps.322350985432-8ncbik7vqu55b9k0elq2rnrf7utl42ka',
  });
});

test('profile shell output preserves literal values without exposing non-public credentials', (t) => {
  const marker = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'runtaeho-shell-')), 'injected');
  t.after(() => fs.rmSync(path.dirname(marker), { recursive: true, force: true }));
  const value = `https://example.invalid/' $(touch ${marker})`;
  const result = spawnSync('node', ['scripts/app-profile.cjs', 'shell', 'development'], {
    cwd: path.join(__dirname, '..'), encoding: 'utf8', env: {
      ...process.env, EXPO_NO_DOTENV: '1', EXPO_PUBLIC_API_BASE_URL: value, SENTRY_AUTH_TOKEN: 'private-test-only-token',
    },
  });
  assert.equal(result.status, 0, result.stderr);
  assert.ok(!result.stdout.includes('private-test-only-token'));
  const shell = spawnSync('bash', ['-c', result.stdout + '\nprintf "%s" "$EXPO_PUBLIC_API_BASE_URL"'], { encoding: 'utf8' });
  assert.equal(shell.status, 0, shell.stderr);
  assert.equal(shell.stdout, value);
  assert.equal(fs.existsSync(marker), false);
});
