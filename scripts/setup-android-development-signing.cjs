/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { randomBytes, X509Certificate } = require('node:crypto');
const { execFileSync } = require('node:child_process');

const directory = path.join(__dirname, '../credentials');
const propertiesPath = path.join(directory, 'android-development.properties');
const keystorePath = path.join(directory, 'android-development.jks');
try {
  if (fs.existsSync(propertiesPath) !== fs.existsSync(keystorePath)) {
    throw new Error('개발 서명키와 설정 파일 중 하나가 없다. 기존 키를 교체하지 않고 복구해야 한다.');
  }
  if (!fs.existsSync(propertiesPath)) {
    fs.mkdirSync(directory, { recursive: true, mode: 0o700 });
    const password = randomBytes(32).toString('base64url');
    execFileSync('keytool', ['-genkeypair', '-keystore', keystorePath, '-storetype', 'JKS',
      '-alias', 'runtaeho-development', '-keyalg', 'RSA', '-keysize', '2048', '-validity', '10000',
      '-dname', 'CN=RunTaeho Development,O=RunTaeho,C=KR',
      '-storepass:env', 'RUNTAEHO_DEV_SIGNING_PASSWORD', '-keypass:env', 'RUNTAEHO_DEV_SIGNING_PASSWORD'],
    { env: { ...process.env, RUNTAEHO_DEV_SIGNING_PASSWORD: password }, stdio: 'pipe' });
    fs.chmodSync(keystorePath, 0o600);
    fs.writeFileSync(propertiesPath,
      `storeFile=android-development.jks\nstorePassword=${password}\nkeyAlias=runtaeho-development\nkeyPassword=${password}\n`,
      { mode: 0o600, flag: 'wx' });
  }
  const properties = Object.fromEntries(fs.readFileSync(propertiesPath, 'utf8').trim().split('\n').map(line => {
    const separator = line.indexOf('=');
    return [line.slice(0, separator), line.slice(separator + 1)];
  }));
  const certificate = execFileSync('keytool', ['-exportcert', '-rfc', '-keystore', keystorePath,
    '-alias', properties.keyAlias, '-storepass:env', 'RUNTAEHO_DEV_SIGNING_PASSWORD'],
  { env: { ...process.env, RUNTAEHO_DEV_SIGNING_PASSWORD: properties.storePassword }, stdio: ['ignore', 'pipe', 'pipe'] });
  console.log('개발용 keystore 준비됨 (credentials/에 보관, Git 제외).');
  console.log(`SHA-1: ${new X509Certificate(certificate).fingerprint}`);
} catch (error) {
  console.error(error.stderr ? '개발 서명키 생성/확인 실패. keytool과 기존 키 설정을 확인한다.' : error.message);
  process.exitCode = 1;
}
