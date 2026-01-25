#!/usr/bin/env node
/**
 * OTA 배포 스크립트
 *
 * 사용법: node scripts/deploy-ota.js [version] [message]
 * 예시: node scripts/deploy-ota.js 1.1.1 "버그 수정"
 *
 * 또는 대화형: node scripts/deploy-ota.js
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');
const EXPO_PLIST_PATH = path.join(__dirname, '..', 'ios', 'app', 'Supporting', 'Expo.plist');

// 색상 출력
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function readPackageJson() {
  return JSON.parse(fs.readFileSync(PACKAGE_JSON_PATH, 'utf8'));
}

function writePackageJson(data) {
  fs.writeFileSync(PACKAGE_JSON_PATH, JSON.stringify(data, null, 2) + '\n', 'utf8');
}

function readExpoPlist() {
  return fs.readFileSync(EXPO_PLIST_PATH, 'utf8');
}

function writeExpoPlist(content) {
  fs.writeFileSync(EXPO_PLIST_PATH, content, 'utf8');
}

function updateExpoPlistVersion(content, newVersion) {
  // EXUpdatesRuntimeVersion 값 업데이트
  return content.replace(
    /<key>EXUpdatesRuntimeVersion<\/key>\s*<string>[^<]*<\/string>/,
    `<key>EXUpdatesRuntimeVersion</key>\n    <string>${newVersion}</string>`
  );
}

function getCurrentVersions() {
  const packageJson = readPackageJson();
  const expoPlist = readExpoPlist();

  const runtimeVersionMatch = expoPlist.match(/<key>EXUpdatesRuntimeVersion<\/key>\s*<string>([^<]*)<\/string>/);
  const expoPlistVersion = runtimeVersionMatch ? runtimeVersionMatch[1] : 'unknown';

  return {
    version: packageJson.version,
    runtimeVersion: packageJson.config?.runtimeVersion || 'not set',
    expoPlistVersion,
  };
}

function validateVersion(version) {
  // 간단한 semver 형식 검증 (x.y.z 또는 x.y)
  return /^\d+\.\d+(\.\d+)?$/.test(version);
}

async function prompt(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

async function main() {
  log('\n========================================', 'cyan');
  log('       RunTaeho OTA 배포 스크립트', 'cyan');
  log('========================================\n', 'cyan');

  // 현재 버전 표시
  const current = getCurrentVersions();
  log('현재 버전 상태:', 'yellow');
  log(`  package.json version:      ${current.version}`);
  log(`  package.json runtimeVersion: ${current.runtimeVersion}`);
  log(`  Expo.plist runtimeVersion:   ${current.expoPlistVersion}`);
  log('');

  // 버전 불일치 경고
  if (current.runtimeVersion !== current.expoPlistVersion) {
    log('⚠️  경고: package.json과 Expo.plist의 runtimeVersion이 다릅니다!', 'yellow');
    log('');
  }

  // 인자에서 버전과 메시지 가져오기
  let newVersion = process.argv[2];
  let message = process.argv[3];

  // 대화형 입력
  if (!newVersion) {
    newVersion = await prompt(`새 버전 입력 (현재: ${current.version}): `);
    if (!newVersion) {
      newVersion = current.version;
    }
  }

  if (!validateVersion(newVersion)) {
    log(`\n❌ 잘못된 버전 형식: ${newVersion}`, 'red');
    log('   올바른 형식: x.y.z 또는 x.y (예: 1.1.1, 1.2)', 'red');
    process.exit(1);
  }

  if (!message) {
    message = await prompt('배포 메시지: ');
    if (!message) {
      message = `v${newVersion} 배포`;
    }
  }

  log('\n----------------------------------------', 'blue');
  log('배포 정보:', 'blue');
  log(`  새 버전: ${newVersion}`);
  log(`  메시지: ${message}`);
  log('----------------------------------------\n', 'blue');

  const confirm = await prompt('계속 진행하시겠습니까? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    log('\n취소되었습니다.', 'yellow');
    process.exit(0);
  }

  try {
    // 1. package.json 업데이트
    log('\n[1/3] package.json 업데이트 중...', 'cyan');
    const packageJson = readPackageJson();
    packageJson.version = newVersion;
    writePackageJson(packageJson);
    log(`  ✅ version: ${newVersion}`, 'green');

    // 2. Expo.plist는 runtimeVersion이므로 OTA에서는 변경하지 않음
    // runtimeVersion은 네이티브 빌드 시에만 변경
    log('\n[2/3] Expo.plist 확인...', 'cyan');
    log(`  ℹ️  runtimeVersion 유지: ${current.expoPlistVersion}`, 'blue');
    log('  (OTA는 기존 runtimeVersion에 배포됩니다)', 'blue');

    // 3. EAS Update 실행
    log('\n[3/3] EAS Update 실행 중...', 'cyan');
    log(`  명령어: eas update --branch production --message "${message}"`, 'blue');
    log('');

    execSync(`eas update --branch production --message "${message}"`, {
      stdio: 'inherit',
      cwd: path.join(__dirname, '..'),
    });

    log('\n========================================', 'green');
    log('✅ OTA 배포 완료!', 'green');
    log('========================================', 'green');
    log(`\n배포된 버전: ${newVersion}`);
    log(`대상 runtimeVersion: ${current.expoPlistVersion}`);
    log(`메시지: ${message}\n`);

  } catch (error) {
    log(`\n❌ 배포 실패: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
