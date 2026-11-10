#!/usr/bin/env node
/* global __dirname */
/**
 * 버전 단일 진입점.
 *
 * 이 프로젝트는 CNG(expo prebuild)를 쓰지 않고 ios/, android/ 네이티브 디렉터리를
 * 직접 관리하므로 app.config.js의 version 값이 네이티브에 반영되지 않는다.
 * 선택한 플랫폼의 스토어 설정만 맞추며, OTA에서는 app-versions.json의 버전만 올린다.
 *
 *   scripts/app-versions.json                 플랫폼별 version, runtimeVersion
 *   ios/app.xcodeproj/project.pbxproj         MARKETING_VERSION, CURRENT_PROJECT_VERSION
 *   watchos/RunTaehoWatch.xcodeproj/project.pbxproj  companion version/build
 *   ios/app/Supporting/Expo.plist             EXUpdatesRuntimeVersion
 *   android/app/build.gradle                  versionName, versionCode
 *   android/app/src/main/AndroidManifest.xml  expo.modules.updates.EXPO_RUNTIME_VERSION
 *
 * version        앱에 표시되는 버전. OTA는 선택 플랫폼의 patch만 올린다.
 * runtimeVersion 네이티브 호환 경계. 설치된 빌드의 런타임과 OTA 퍼블리시 런타임이
 *                다르면 업데이트가 전달되지 않는다. 네이티브 릴리스에서만 올린다.
 *
 * Usage:
 *   node scripts/version.js status
 *   node scripts/version.js set <x.y.z> [all|ios|android]
 *   node scripts/version.js bump-ota [all|ios|android]
 *   node scripts/version.js sync-runtime [all|ios|android]
 *   node scripts/version.js bump-build [all|ios|android]
 *   node scripts/version.js check-ota
 *   node scripts/version.js get <ios|android> <version|runtimeVersion|nativeVersion>
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = {
  versions: path.join(ROOT, 'scripts/app-versions.json'),
  pbxproj: path.join(ROOT, 'ios/app.xcodeproj/project.pbxproj'),
  watchPbxproj: path.join(ROOT, 'watchos/RunTaehoWatch.xcodeproj/project.pbxproj'),
  expoPlist: path.join(ROOT, 'ios/app/Supporting/Expo.plist'),
  gradle: path.join(ROOT, 'android/app/build.gradle'),
  manifest: path.join(ROOT, 'android/app/src/main/AndroidManifest.xml'),
};

const IOS_PROJECTS = ['pbxproj', 'watchPbxproj'];

const SEMVER = /^\d+\.\d+\.\d+$/;

const read = (key) => fs.readFileSync(FILES[key], 'utf8');
const write = (key, next) => fs.writeFileSync(FILES[key], next);

function selectedPlatforms(target = 'all') {
  if (!['all', 'ios', 'android'].includes(target)) {
    throw new Error(`지원하지 않는 플랫폼: ${target}`);
  }
  return target === 'all' ? ['ios', 'android'] : [target];
}

/** 정규식 치환 결과가 0건이면 파일 구조가 바뀐 것이므로 조용히 넘어가지 않는다. */
function replaceAll(source, pattern, replacer, label) {
  let count = 0;
  const next = source.replace(pattern, (...args) => {
    count += 1;
    return replacer(...args);
  });
  if (count === 0) {
    throw new Error(`${label}: 치환 대상을 찾지 못했다. 파일 형식이 바뀌었는지 확인이 필요하다.`);
  }
  return next;
}

// ---------------------------------------------------------------- 읽기

function readState() {
  const versions = JSON.parse(read('versions'));
  const pbxproj = IOS_PROJECTS.map(read).join('\n');
  const gradle = read('gradle');

  const marketing = [...pbxproj.matchAll(/MARKETING_VERSION = ([^;]+);/g)].map((m) => m[1].trim());
  const projectVersion = [...pbxproj.matchAll(/CURRENT_PROJECT_VERSION = ([^;]+);/g)].map((m) =>
    m[1].trim()
  );
  const plistRuntime = read('expoPlist').match(
    /<key>EXUpdatesRuntimeVersion<\/key>\s*<string>([^<]*)<\/string>/
  );
  const manifestRuntime = read('manifest').match(
    /expo\.modules\.updates\.EXPO_RUNTIME_VERSION"\s+android:value="([^"]*)"/
  );

  return {
    versions,
    iosMarketing: [...new Set(marketing)],
    iosBuild: [...new Set(projectVersion)],
    iosRuntime: plistRuntime ? plistRuntime[1] : null,
    androidVersionName: (gradle.match(/versionName "([^"]*)"/) || [])[1] || null,
    androidVersionCode: (gradle.match(/versionCode (\d+)/) || [])[1] || null,
    androidRuntime: manifestRuntime ? manifestRuntime[1] : null,
  };
}

// ---------------------------------------------------------------- 쓰기

function bumpOta(target) {
  const platforms = selectedPlatforms(target);
  const versions = JSON.parse(read('versions'));
  for (const platform of platforms) {
    const current = versions[platform].version;
    if (!SEMVER.test(current)) throw new Error(`버전 형식이 잘못됐다: ${platform} ${current}`);
    const [major, minor, patch] = current.split('.').map(Number);
    versions[platform].version = `${major}.${minor}.${patch + 1}`;
    console.log(`OTA ${platform} version -> ${versions[platform].version} (runtime/native 유지)`);
  }
  write('versions', `${JSON.stringify(versions, null, 2)}\n`);
}

function setVersion(version, target) {
  const platforms = selectedPlatforms(target);
  if (!SEMVER.test(version)) {
    throw new Error(`버전 형식이 잘못됐다: ${version} (x.y.z 형식이어야 한다)`);
  }

  const versions = JSON.parse(read('versions'));
  for (const platform of platforms) versions[platform].version = version;

  if (platforms.includes('ios')) {
    for (const project of IOS_PROJECTS) {
      write(
        project,
        replaceAll(
          read(project),
          /MARKETING_VERSION = [^;]+;/g,
          () => `MARKETING_VERSION = ${version};`,
          `${project} MARKETING_VERSION`
        )
      );
    }
  }

  if (platforms.includes('android')) {
    write(
      'gradle',
      replaceAll(
        read('gradle'),
        /versionName "[^"]*"/,
        () => `versionName "${version}"`,
        'build.gradle versionName'
      )
    );
  }

  write('versions', `${JSON.stringify(versions, null, 2)}\n`);
  console.log(`version -> ${version} (${platforms.join(', ')})`);
}

/**
 * 선택한 플랫폼의 runtimeVersion을 그 플랫폼의 네이티브 버전과 맞춘다.
 * 네이티브 릴리스(스토어 배포) 직전에만 실행해야 한다.
 */
function syncRuntime(target) {
  const platforms = selectedPlatforms(target);
  const state = readState();
  for (const platform of platforms) {
    const runtime = platform === 'ios' ? state.iosMarketing[0] : state.androidVersionName;
    if (!SEMVER.test(runtime) || (platform === 'ios' && state.iosMarketing.length !== 1)) {
      throw new Error(`${platform}: 네이티브 버전을 먼저 맞춘다.`);
    }
    state.versions[platform].runtimeVersion = runtime;
    if (platform === 'ios') {
      write('expoPlist', replaceAll(read('expoPlist'),
        /(<key>EXUpdatesRuntimeVersion<\/key>\s*<string>)[^<]*(<\/string>)/,
        (_match, open, close) => `${open}${runtime}${close}`, 'Expo.plist EXUpdatesRuntimeVersion'));
    } else {
      write('manifest', replaceAll(read('manifest'),
        /(expo\.modules\.updates\.EXPO_RUNTIME_VERSION"\s+android:value=")[^"]*(")/,
        (_match, open, close) => `${open}${runtime}${close}`, 'AndroidManifest EXPO_RUNTIME_VERSION'));
    }
    console.log(`${platform} runtimeVersion -> ${runtime}`);
  }
  write('versions', `${JSON.stringify(state.versions, null, 2)}\n`);
}

/**
 * iOS 빌드번호와 Android versionCode를 단조 증가시킨다.
 * 스토어는 같은 앱 버전으로도 빌드번호만 더 크면 새 업로드를 받는다.
 * 한쪽 플랫폼만 재배포할 때 다른 쪽 번호까지 건드리지 않도록 대상을 받는다.
 */
function bumpBuild(target) {
  const scope = target || 'all';
  if (!['all', 'ios', 'android'].includes(scope)) {
    throw new Error(`대상이 잘못됐다: ${scope} (all | ios | android)`);
  }

  const state = readState();
  const messages = [];

  if (scope === 'all' || scope === 'ios') {
    const nextIos = Math.max(...state.iosBuild.map((v) => parseInt(v, 10) || 0)) + 1;
    for (const project of IOS_PROJECTS) {
      write(
        project,
        replaceAll(
          read(project),
          /CURRENT_PROJECT_VERSION = [^;]+;/g,
          () => `CURRENT_PROJECT_VERSION = ${nextIos};`,
          `${project} CURRENT_PROJECT_VERSION`
        )
      );
    }
    messages.push(`iOS ${state.iosBuild.join(',')} → ${nextIos}`);
  }

  if (scope === 'all' || scope === 'android') {
    const nextAndroid = parseInt(state.androidVersionCode, 10) + 1;
    if (!Number.isFinite(nextAndroid)) {
      throw new Error('build.gradle에서 versionCode를 읽지 못했다.');
    }
    write(
      'gradle',
      replaceAll(
        read('gradle'),
        /versionCode \d+/,
        () => `versionCode ${nextAndroid}`,
        'build.gradle versionCode'
      )
    );
    messages.push(`Android ${state.androidVersionCode} → ${nextAndroid}`);
  }

  console.log(`build number -> ${messages.join(' / ')}`);
}

// ---------------------------------------------------------------- 점검

function status(target) {
  const platforms = selectedPlatforms(target);
  const s = readState();
  const rows = [
    ['iOS  OTA version', s.versions.ios.version],
    ['iOS  OTA runtime', s.versions.ios.runtimeVersion],
    ['iOS  MARKETING_VERSION', s.iosMarketing.join(', ')],
    ['iOS  CURRENT_PROJECT_VERSION', s.iosBuild.join(', ')],
    ['iOS  Expo.plist runtime', s.iosRuntime],
    ['Android  OTA version', s.versions.android.version],
    ['Android  OTA runtime', s.versions.android.runtimeVersion],
    ['Android  versionName', s.androidVersionName],
    ['Android  versionCode', s.androidVersionCode],
    ['Android  manifest runtime', s.androidRuntime],
  ];
  const width = Math.max(...rows.map(([label]) => label.length));
  rows.forEach(([label, value]) => console.log(`${label.padEnd(width)}  ${value}`));

  console.log('');
  const versionOk = platforms.every(platform => {
    const version = s.versions[platform].version;
    const nativeVersion = platform === 'ios' ? s.iosMarketing[0] : s.androidVersionName;
    return SEMVER.test(version) && SEMVER.test(nativeVersion) &&
      (platform !== 'ios' || s.iosMarketing.length === 1) &&
      version.split('.').slice(0, 2).join('.') === nativeVersion.split('.').slice(0, 2).join('.') &&
      Number(version.split('.')[2]) >= Number(nativeVersion.split('.')[2]);
  });
  const runtimeOk = platforms.every(platform => s.versions[platform].runtimeVersion ===
    (platform === 'ios' ? s.iosRuntime : s.androidRuntime));

  console.log(`version 정합   ${versionOk ? 'OK' : 'MISMATCH'}`);
  console.log(`runtime 정합   ${runtimeOk ? 'OK' : 'MISMATCH'}`);
  if (!runtimeOk) {
    console.log('');
    console.log('runtime이 어긋나면 해당 플랫폼은 OTA 업데이트를 받지 못한다.');
    console.log('실제 배포 바이너리의 런타임과 플랫폼별 설정을 확인한다.');
  }
  return versionOk && runtimeOk ? 0 : 1;
}

/**
 * OTA 게이트. 선택한 플랫폼의 로컬 네이티브 설정과 퍼블리시 런타임을 비교한다.
 * 실제 설치된 스토어 바이너리의 런타임/네이티브 호환성은 별도로 확인해야 한다.
 */
function checkOta(target = 'all') {
  const platforms = selectedPlatforms(target);
  const s = readState();
  const problems = [];

  if (platforms.includes('ios') && s.versions.ios.runtimeVersion !== s.iosRuntime) {
    problems.push(
      `iOS: Expo.plist=${s.iosRuntime} ≠ OTA runtimeVersion=${s.versions.ios.runtimeVersion}`
    );
  }
  if (platforms.includes('android') && s.versions.android.runtimeVersion !== s.androidRuntime) {
    problems.push(
      `Android: AndroidManifest=${s.androidRuntime} ≠ OTA runtimeVersion=${s.versions.android.runtimeVersion}`
    );
  }

  if (problems.length > 0) {
    console.error('OTA 런타임 불일치:');
    problems.forEach((p) => console.error(`  - ${p}`));
    console.error('');
    console.error('퍼블리시되는 런타임은 scripts/app-versions.json의 플랫폼별 runtimeVersion이다.');
    console.error('네이티브 쪽 값과 다르면 그 플랫폼은 업데이트를 받지 못한다.');
    console.error('설치된 빌드에 맞춰 플랫폼별 설정을 복원하거나, 다음 스토어 배포에서');
    console.error('sync-runtime으로 네이티브를 맞춘 뒤 퍼블리시한다.');
    return 1;
  }

  console.log(`OTA 런타임 정합 OK (${platforms.map(platform => `${platform}=${s.versions[platform].runtimeVersion}`).join(', ')})`);
  return 0;
}

// ---------------------------------------------------------------- 진입점

function main() {
  const [command, arg, target] = process.argv.slice(2);

  switch (command) {
    case 'status':
      return status(arg);
    case 'set':
      if (!arg) throw new Error('사용법: node scripts/version.js set <x.y.z>');
      setVersion(arg, target);
      return 0;
    case 'bump-ota':
      bumpOta(arg);
      return 0;
    case 'sync-runtime':
      syncRuntime(arg);
      return 0;
    case 'bump-build':
      bumpBuild(arg);
      return 0;
    case 'check-ota':
      return checkOta(arg);
    case 'get': {
      if (!['ios', 'android'].includes(arg) || !['version', 'runtimeVersion', 'nativeVersion'].includes(target)) {
        throw new Error('사용법: node scripts/version.js get <ios|android> <version|runtimeVersion|nativeVersion>');
      }
      const state = readState();
      console.log(target === 'nativeVersion'
        ? (arg === 'ios' ? state.iosMarketing[0] : state.androidVersionName)
        : state.versions[arg][target]);
      return 0;
    }
    default:
      console.error('사용법: node scripts/version.js <status|set|bump-ota|sync-runtime|bump-build|check-ota|get>');
      return 1;
  }
}

try {
  process.exit(main());
} catch (error) {
  console.error(`오류: ${error.message}`);
  process.exit(1);
}
