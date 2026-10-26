const { spawnSync } = require('node:child_process');
const [branch, environment, platform, message] = process.argv.slice(2);
if ({ production: 'production', staging: 'preview' }[branch] !== environment ||
    !['all', 'ios', 'android'].includes(platform) || !message) {
  throw new Error('잘못된 OTA 배포 인자');
}
// env:exec는 셸 문자열을 받는다. 메시지는 명령으로 해석되지 않도록 인용한다.
const quote = (value) => `'${value.replace(/'/g, "'\\''")}'`;
const env = { ...process.env, EXPO_NO_DOTENV: '1' };
for (const key of Object.keys(env)) {
  if (key.startsWith('EXPO_PUBLIC_')) delete env[key];
}
const appMode = branch === 'production' ? 'production' : 'development';
const command = `export EXPO_PUBLIC_ENV="\${EXPO_PUBLIC_ENV:-${appMode}}"; node scripts/check-env.cjs remote ${appMode} && ` +
  ['node', 'scripts/app-profile.cjs', 'run', appMode, 'npx', 'eas', 'update', '--branch', branch, '--environment', environment,
    '--platform', platform, '--message', message, '--non-interactive'].map(quote).join(' ');
const result = spawnSync('npx', ['eas', 'env:exec', environment, command, '--non-interactive'], { env, stdio: 'inherit' });
if (result.error) console.error(result.error.message);
process.exitCode = result.status ?? 1;
