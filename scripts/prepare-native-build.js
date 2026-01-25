#!/usr/bin/env node
/**
 * 네이티브 빌드 준비 스크립트
 *
 * 사용법: node scripts/prepare-native-build.js [version]
 * 예시: node scripts/prepare-native-build.js 1.2.0
 *
 * 또는 대화형: node scripts/prepare-native-build.js
 *
 * 이 스크립트는:
 * 1. package.json의 version과 runtimeVersion 업데이트
 * 2. Expo.plist의 runtimeVersion 업데이트
 * 3. pod install 실행
 * 4. Xcode Archive 체크리스트 출력
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const readline = require('readline');

const PACKAGE_JSON_PATH = path.join(__dirname, '..', 'package.json');
const EXPO_PLIST_PATH = path.join(__dirname, '..', 'ios', 'app', 'Supporting', 'Expo.plist');
const IOS_DIR = path.join(__dirname, '..', 'ios');

// 색상 출력
const colors = {
  reset: '\x1b[0m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
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

  const channelMatch = expoPlist.match(/<key>expo-channel-name<\/key>\s*<string>([^<]*)<\/string>/);
  const channel = channelMatch ? channelMatch[1] : 'not set';

  return {
    version: packageJson.version,
    runtimeVersion: packageJson.config?.runtimeVersion || 'not set',
    expoPlistVersion,
    channel,
  };
}

function validateVersion(version) {
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
  log('\n========================================', 'magenta');
  log('   RunTaeho 네이티브 빌드 준비 스크립트', 'magenta');
  log('========================================\n', 'magenta');

  // 현재 버전 표시
  const current = getCurrentVersions();
  log('현재 버전 상태:', 'yellow');
  log(`  package.json version:        ${current.version}`);
  log(`  package.json runtimeVersion: ${current.runtimeVersion}`);
  log(`  Expo.plist runtimeVersion:   ${current.expoPlistVersion}`);
  log(`  Expo.plist channel:          ${current.channel}`);
  log('');

  // 인자에서 버전 가져오기
  let newVersion = process.argv[2];

  // 대화형 입력
  if (!newVersion) {
    log('새 버전을 입력하세요.', 'cyan');
    log('(이 버전이 version과 runtimeVersion 모두에 적용됩니다)', 'blue');
    newVersion = await prompt(`\n새 버전 (현재: ${current.version}): `);
    if (!newVersion) {
      log('\n버전이 입력되지 않았습니다. 종료합니다.', 'yellow');
      process.exit(0);
    }
  }

  if (!validateVersion(newVersion)) {
    log(`\n❌ 잘못된 버전 형식: ${newVersion}`, 'red');
    log('   올바른 형식: x.y.z 또는 x.y (예: 1.2.0, 1.2)', 'red');
    process.exit(1);
  }

  log('\n----------------------------------------', 'blue');
  log('변경 예정:', 'blue');
  log(`  package.json version:        ${current.version} → ${newVersion}`);
  log(`  package.json runtimeVersion: ${current.runtimeVersion} → ${newVersion}`);
  log(`  Expo.plist runtimeVersion:   ${current.expoPlistVersion} → ${newVersion}`);
  log('----------------------------------------\n', 'blue');

  const confirm = await prompt('계속 진행하시겠습니까? (y/N): ');
  if (confirm.toLowerCase() !== 'y') {
    log('\n취소되었습니다.', 'yellow');
    process.exit(0);
  }

  try {
    // 1. package.json 업데이트
    log('\n[1/4] package.json 업데이트 중...', 'cyan');
    const packageJson = readPackageJson();
    packageJson.version = newVersion;
    if (!packageJson.config) {
      packageJson.config = {};
    }
    packageJson.config.runtimeVersion = newVersion;
    writePackageJson(packageJson);
    log(`  ✅ version: ${newVersion}`, 'green');
    log(`  ✅ runtimeVersion: ${newVersion}`, 'green');

    // 2. Expo.plist 업데이트
    log('\n[2/4] Expo.plist 업데이트 중...', 'cyan');
    let expoPlist = readExpoPlist();
    expoPlist = updateExpoPlistVersion(expoPlist, newVersion);
    writeExpoPlist(expoPlist);
    log(`  ✅ EXUpdatesRuntimeVersion: ${newVersion}`, 'green');

    // 3. Pod Install
    log('\n[3/4] Pod Install 실행 중...', 'cyan');
    log('  (시간이 걸릴 수 있습니다...)\n', 'blue');

    execSync('pod install', {
      stdio: 'inherit',
      cwd: IOS_DIR,
    });

    log('\n  ✅ Pod Install 완료', 'green');

    // 4. 체크리스트 출력
    log('\n[4/4] Xcode Archive 체크리스트', 'cyan');
    log('\n========================================', 'green');
    log('✅ 네이티브 빌드 준비 완료!', 'green');
    log('========================================', 'green');

    log('\n📋 Xcode Archive 전 체크리스트:', 'yellow');
    log('');
    log('  1. Xcode에서 프로젝트 열기:');
    log('     open ios/app.xcworkspace', 'blue');
    log('');
    log('  2. Scheme 확인: "app" (Release)', 'reset');
    log('');
    log('  3. 빌드 번호 확인/증가:', 'reset');
    log('     Project → app → General → Build', 'blue');
    log('');
    log('  4. Archive 실행:', 'reset');
    log('     Product → Archive', 'blue');
    log('');
    log('  5. App Store Connect 업로드:', 'reset');
    log('     Organizer → Distribute App', 'blue');
    log('');
    log('========================================', 'yellow');
    log(`버전: ${newVersion}`, 'yellow');
    log(`runtimeVersion: ${newVersion}`, 'yellow');
    log('========================================\n', 'yellow');

  } catch (error) {
    log(`\n❌ 오류 발생: ${error.message}`, 'red');
    process.exit(1);
  }
}

main();
