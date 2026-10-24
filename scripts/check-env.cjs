/* global __dirname */
const path = require('node:path');

function validate(env, expectedMode) {
  const required = ['EXPO_PUBLIC_API_BASE_URL', 'EXPO_PUBLIC_S3_BUCKET_URL',
    'EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID', 'EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID'];
  for (const key of required) {
    if (!env[key]?.trim()) throw new Error(`필수 배포 환경변수 누락: ${key}`);
  }
  for (const key of required.slice(0, 2)) {
    const url = new URL(env[key]);
    if (url.protocol !== 'https:' || ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname)) {
      throw new Error(`배포용 HTTPS 주소가 필요하다: ${key}`);
    }
  }
  if (!['production', 'development'].includes(env.EXPO_PUBLIC_ENV)) {
    throw new Error('배포 앱 모드는 production 또는 development여야 한다.');
  }
  if (expectedMode && env.EXPO_PUBLIC_ENV !== expectedMode) {
    throw new Error(`배포 대상과 EXPO_PUBLIC_ENV가 다르다 (필요한 모드: ${expectedMode}).`);
  }
}

if (require.main === module) {
  try {
    if (process.argv[2] === 'local') {
      process.env.NODE_ENV = 'production';
      require('@expo/env').load(path.join(__dirname, '..'), { silent: true });
    }
    validate(process.env, process.argv[3] || 'production');
    console.log('필수 배포 환경변수 확인됨 (값은 출력하지 않음)');
  } catch (error) {
    console.error(error.code === 'ERR_INVALID_URL' ? '배포 URL 형식을 확인한다.' : error.message);
    process.exitCode = 1;
  }
}
module.exports = { validate };
