const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
const execute = args[0] === '--execute';
if (execute) args.shift();
const [branch, environment, platform, message] = args;
const uploadOnly = platform === '--upload-only';
if ({ production: 'production', staging: 'preview' }[branch] !== environment ||
    (!uploadOnly && !['all', 'ios', 'android'].includes(platform)) || !message) {
  throw new Error('잘못된 OTA 배포 인자');
}
// env:exec는 셸 문자열을 받는다. 메시지는 명령으로 해석되지 않도록 인용한다.
const quote = (value) => `'${value.replace(/'/g, "'\\''")}'`;
function runCommand(command, args, env = process.env) {
  const result = spawnSync(command, args, { env, stdio: 'inherit' });
  if (result.error) console.error(result.error.message);
  return result.status ?? 1;
}
const run = (args, env) => runCommand('npx', args, env);
const appMode = branch === 'production' ? 'production' : 'development';
if (!execute) {
  const env = { ...process.env, EXPO_NO_DOTENV: '1' };
  for (const key of Object.keys(env)) {
    if (key.startsWith('EXPO_PUBLIC_')) delete env[key];
  }
  const command = `export EXPO_PUBLIC_ENV="\${EXPO_PUBLIC_ENV:-${appMode}}"; node scripts/check-env.cjs remote ${appMode} && ` +
    ['node', 'scripts/app-profile.cjs', 'run', appMode, 'node', 'scripts/publish-ota.cjs', '--execute',
      branch, environment, platform, message].map(quote).join(' ');
  process.exitCode = run(['eas', 'env:exec', environment, command, '--non-interactive'], env);
} else {
  if (!process.env.SENTRY_AUTH_TOKEN?.trim()) {
    throw new Error('OTA 게시 전에 SENTRY_AUTH_TOKEN을 배포 환경에 설정한다.');
  }
  if (!uploadOnly) {
    const versionFiles = ['package.json', 'package-lock.json'];
    if (runCommand('node', ['scripts/version.js', 'check-ota', platform]) !== 0) process.exit(1);
    if (runCommand('git', ['diff', '--quiet', 'HEAD', '--', ...versionFiles]) !== 0) {
      throw new Error('OTA 버전 파일을 먼저 커밋한다.');
    }
    if (runCommand('node', ['scripts/version.js', 'bump-ota']) !== 0) process.exit(1);
    const version = JSON.parse(fs.readFileSync('package.json', 'utf8')).version;
    // EAS requireCommit을 유지하고 다른 staged 파일은 버전 커밋에 포함하지 않는다.
    if (runCommand('git', ['commit', '--only', '-m', `chore: bump OTA app version to ${version}`, '--', ...versionFiles]) !== 0) {
      throw new Error('OTA 버전 커밋에 실패했다. 변경된 버전 파일을 확인한다.');
    }
  }
  fs.mkdirSync('build', { recursive: true });
  // Legacy EAS export treats "all" as including web, so publish mobile targets explicitly.
  const platforms = platform === 'all' ? ['ios', 'android'] : [platform];
  for (const target of platforms) {
    const output = uploadOnly ? path.resolve(message) : fs.mkdtempSync(path.resolve('build/ota-'));
    const published = uploadOnly ? 0 : run(['--no-install', 'eas', 'update', '--branch', branch, '--environment', environment,
      '--platform', target, '--message', message, '--input-dir', output, '--emit-metadata', '--non-interactive']);
    if (published !== 0) {
      process.exitCode = published;
      break;
    }
    let uploaded = 1;
    try {
      const files = fs.readdirSync(output, { recursive: true });
      const bundles = files.filter(file => /\.(js|hbc)$/.test(file));
      if (!bundles.length || bundles.some(file => !files.includes(`${file}.map`))) {
        throw new Error('게시 산출물의 번들별 소스맵이 누락되었다.');
      }
      for (const file of bundles) {
        const map = JSON.parse(fs.readFileSync(path.join(output, `${file}.map`), 'utf8'));
        if (!map.debugId && !map.debug_id) throw new Error('소스맵의 Sentry Debug ID가 누락되었다.');
      }
      uploaded = run(['--no-install', 'sentry-expo-upload-sourcemaps', output]);
    } catch (error) {
      console.error(error.message);
    }
    if (uploaded !== 0) {
      console.error(uploadOnly
        ? 'Sentry 소스맵 업로드 재시도에 실패했다. 산출물과 인증 설정을 확인한다:'
        : 'OTA 게시는 성공했지만 Sentry 소스맵 업로드는 실패했다. 같은 산출물로 업로드만 재시도한다:');
      console.error(`node scripts/publish-ota.cjs ${branch} ${environment} --upload-only ${quote(output)}`);
    }
    process.exitCode = uploaded;
    if (uploaded !== 0) break;
  }
}
