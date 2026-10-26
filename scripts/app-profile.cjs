/* global __dirname */
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const profiles = require('./app-profiles.json');

function getProfile(name) {
  if (!Object.hasOwn(profiles, name)) throw new Error('지원하지 않는 앱 프로파일 (local | development | production)');
  return profiles[name];
}

function profileEnvironment(name, env) {
  const profile = getProfile(name);
  return {
    ...env,
    NODE_ENV: name === 'local' ? 'development' : 'production',
    EXPO_NO_DOTENV: '1',
    EXPO_PUBLIC_ENV: name,
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: profile.iosClientId,
    EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID: profile.androidClientId,
    EXPO_PUBLIC_ENABLE_DEBUG: name === 'local' ? (env.EXPO_PUBLIC_ENABLE_DEBUG ?? 'true') : 'false',
    EXPO_PUBLIC_ENABLE_LOGGING: name === 'local' ? (env.EXPO_PUBLIC_ENABLE_LOGGING ?? 'true') : 'false',
    RUNTAEHO_OTA_CHANNEL: profile.channel,
  };
}

function loadProfileEnvironment(name, env = process.env, root = path.join(__dirname, '..')) {
  getProfile(name);
  if (env.EXPO_NO_DOTENV === '1') return profileEnvironment(name, env);
  const { env: values } = require('@expo/env').parseProjectEnv(root, {
    mode: name === 'production' ? 'production' : 'development', systemEnv: env,
  });
  return profileEnvironment(name, { ...values, ...env });
}

if (require.main === module) {
  try {
    const [command, name, executable, ...args] = process.argv.slice(2);
    const profile = getProfile(name);
    if (command === 'get') {
      if (!Object.hasOwn(profile, executable)) throw new Error('알 수 없는 프로파일 속성');
      console.log(profile[executable]);
    } else {
      const env = loadProfileEnvironment(name);
      if (command === 'shell') {
        const publicKeys = Object.keys(env).filter(key => /^EXPO_PUBLIC_[A-Z0-9_]+$/.test(key) ||
          ['NODE_ENV', 'EXPO_NO_DOTENV', 'RUNTAEHO_OTA_CHANNEL'].includes(key));
        for (const key of publicKeys) {
          console.log(`export ${key}='${env[key].replace(/'/g, "'\\''")}'`);
        }
      } else if (command === 'run' && executable) {
        const result = spawnSync(executable, args, { env, stdio: 'inherit' });
        if (result.error) throw result.error;
        process.exitCode = result.status ?? 1;
      } else throw new Error('사용법: app-profile.cjs get|shell|run <profile> [속성|명령]');
    }
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}

module.exports = { getProfile, profileEnvironment, loadProfileEnvironment };
