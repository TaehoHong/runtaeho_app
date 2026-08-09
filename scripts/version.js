#!/usr/bin/env node
/**
 * 버전 단일 진입점.
 *
 * 이 프로젝트는 CNG(expo prebuild)를 쓰지 않고 ios/, android/ 네이티브 디렉터리를
 * 직접 관리하므로 app.config.js의 version 값이 네이티브에 반영되지 않는다.
 * 따라서 아래 5개 파일을 항상 함께 맞춰야 한다.
 *
 *   package.json                              version, config.runtimeVersion
 *   ios/app.xcodeproj/project.pbxproj         MARKETING_VERSION, CURRENT_PROJECT_VERSION
 *   ios/app/Supporting/Expo.plist             EXUpdatesRuntimeVersion
 *   android/app/build.gradle                  versionName, versionCode
 *   android/app/src/main/AndroidManifest.xml  expo.modules.updates.EXPO_RUNTIME_VERSION
 *
 * version        스토어에 표시되는 앱 버전. OTA로도 올릴 수 있다.
 * runtimeVersion 네이티브 호환 경계. 설치된 빌드의 런타임과 OTA 퍼블리시 런타임이
 *                다르면 업데이트가 전달되지 않는다. 네이티브 릴리스에서만 올린다.
 *
 * Usage:
 *   node scripts/version.js status
 *   node scripts/version.js set <x.y.z>
 *   node scripts/version.js sync-runtime
 *   node scripts/version.js bump-build [all|ios|android]
 *   node scripts/version.js check-ota
 */

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
const FILES = {
  pkg: path.join(ROOT, 'package.json'),
  pbxproj: path.join(ROOT, 'ios/app.xcodeproj/project.pbxproj'),
  expoPlist: path.join(ROOT, 'ios/app/Supporting/Expo.plist'),
  gradle: path.join(ROOT, 'android/app/build.gradle'),
  manifest: path.join(ROOT, 'android/app/src/main/AndroidManifest.xml'),
};

const SEMVER = /^\d+\.\d+\.\d+$/;

const read = (key) => fs.readFileSync(FILES[key], 'utf8');
const write = (key, next) => fs.writeFileSync(FILES[key], next);

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
  const pkg = JSON.parse(read('pkg'));
  const pbxproj = read('pbxproj');
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
    pkgVersion: pkg.version,
    pkgRuntime: pkg.config && pkg.config.runtimeVersion,
    iosMarketing: [...new Set(marketing)],
    iosBuild: [...new Set(projectVersion)],
    iosRuntime: plistRuntime ? plistRuntime[1] : null,
    androidVersionName: (gradle.match(/versionName "([^"]*)"/) || [])[1] || null,
    androidVersionCode: (gradle.match(/versionCode (\d+)/) || [])[1] || null,
    androidRuntime: manifestRuntime ? manifestRuntime[1] : null,
  };
}

// ---------------------------------------------------------------- 쓰기

function setVersion(version) {
  if (!SEMVER.test(version)) {
    throw new Error(`버전 형식이 잘못됐다: ${version} (x.y.z 형식이어야 한다)`);
  }

  const pkg = JSON.parse(read('pkg'));
  pkg.version = version;
  write('pkg', `${JSON.stringify(pkg, null, 2)}\n`);

  write(
    'pbxproj',
    replaceAll(
      read('pbxproj'),
      /MARKETING_VERSION = [^;]+;/g,
      () => `MARKETING_VERSION = ${version};`,
      'pbxproj MARKETING_VERSION'
    )
  );

  write(
    'gradle',
    replaceAll(
      read('gradle'),
      /versionName "[^"]*"/,
      () => `versionName "${version}"`,
      'build.gradle versionName'
    )
  );

  console.log(`version -> ${version} (package.json, pbxproj, build.gradle)`);
}

/**
 * runtimeVersion을 현재 version과 일치시키고 네이티브 두 곳에 반영한다.
 * 네이티브 릴리스(스토어 배포) 직전에만 실행해야 한다.
 */
function syncRuntime() {
  const pkg = JSON.parse(read('pkg'));
  const runtime = pkg.version;

  pkg.config = { ...(pkg.config || {}), runtimeVersion: runtime };
  write('pkg', `${JSON.stringify(pkg, null, 2)}\n`);

  write(
    'expoPlist',
    replaceAll(
      read('expoPlist'),
      /(<key>EXUpdatesRuntimeVersion<\/key>\s*<string>)[^<]*(<\/string>)/,
      (_match, open, close) => `${open}${runtime}${close}`,
      'Expo.plist EXUpdatesRuntimeVersion'
    )
  );

  write(
    'manifest',
    replaceAll(
      read('manifest'),
      /(expo\.modules\.updates\.EXPO_RUNTIME_VERSION"\s+android:value=")[^"]*(")/,
      (_match, open, close) => `${open}${runtime}${close}`,
      'AndroidManifest EXPO_RUNTIME_VERSION'
    )
  );

  console.log(`runtimeVersion -> ${runtime} (package.json, Expo.plist, AndroidManifest)`);
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
    write(
      'pbxproj',
      replaceAll(
        read('pbxproj'),
        /CURRENT_PROJECT_VERSION = [^;]+;/g,
        () => `CURRENT_PROJECT_VERSION = ${nextIos};`,
        'pbxproj CURRENT_PROJECT_VERSION'
      )
    );
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

function status() {
  const s = readState();
  const rows = [
    ['package.json  version', s.pkgVersion],
    ['package.json  runtimeVersion', s.pkgRuntime],
    ['iOS  MARKETING_VERSION', s.iosMarketing.join(', ')],
    ['iOS  CURRENT_PROJECT_VERSION', s.iosBuild.join(', ')],
    ['iOS  Expo.plist runtime', s.iosRuntime],
    ['Android  versionName', s.androidVersionName],
    ['Android  versionCode', s.androidVersionCode],
    ['Android  manifest runtime', s.androidRuntime],
  ];
  const width = Math.max(...rows.map(([label]) => label.length));
  rows.forEach(([label, value]) => console.log(`${label.padEnd(width)}  ${value}`));

  console.log('');
  const versionOk =
    s.pkgVersion === s.androidVersionName &&
    s.iosMarketing.length === 1 &&
    s.iosMarketing[0] === s.pkgVersion;
  const runtimeOk = s.pkgRuntime === s.iosRuntime && s.pkgRuntime === s.androidRuntime;

  console.log(`version 정합   ${versionOk ? 'OK' : 'MISMATCH'}`);
  console.log(`runtime 정합   ${runtimeOk ? 'OK' : 'MISMATCH'}`);
  if (!runtimeOk) {
    console.log('');
    console.log('runtime이 어긋나면 해당 플랫폼은 OTA 업데이트를 받지 못한다.');
    console.log('스토어 배포 전이라면 `node scripts/version.js sync-runtime`으로 맞춘다.');
  }
  return versionOk && runtimeOk ? 0 : 1;
}

/**
 * OTA 게이트. 설치된 네이티브 빌드가 바라보는 런타임과 퍼블리시될 런타임이
 * 같은지 확인한다. 어긋난 채로 퍼블리시하면 업데이트가 조용히 유실된다.
 */
function checkOta() {
  const s = readState();
  const problems = [];

  if (s.pkgRuntime !== s.iosRuntime) {
    problems.push(
      `iOS: Expo.plist=${s.iosRuntime} ≠ package.json runtimeVersion=${s.pkgRuntime}`
    );
  }
  if (s.pkgRuntime !== s.androidRuntime) {
    problems.push(
      `Android: AndroidManifest=${s.androidRuntime} ≠ package.json runtimeVersion=${s.pkgRuntime}`
    );
  }

  if (problems.length > 0) {
    console.error('OTA 런타임 불일치:');
    problems.forEach((p) => console.error(`  - ${p}`));
    console.error('');
    console.error('퍼블리시되는 런타임은 package.json의 config.runtimeVersion이다.');
    console.error('네이티브 쪽 값과 다르면 그 플랫폼은 업데이트를 받지 못한다.');
    console.error('설치된 빌드에 맞춰 package.json을 되돌리거나, 다음 스토어 배포에서');
    console.error('sync-runtime으로 네이티브를 맞춘 뒤 퍼블리시한다.');
    return 1;
  }

  console.log(`OTA 런타임 정합 OK (runtimeVersion=${s.pkgRuntime})`);
  return 0;
}

// ---------------------------------------------------------------- 진입점

function main() {
  const [command, arg] = process.argv.slice(2);

  switch (command) {
    case 'status':
      return status();
    case 'set':
      if (!arg) throw new Error('사용법: node scripts/version.js set <x.y.z>');
      setVersion(arg);
      return 0;
    case 'sync-runtime':
      syncRuntime();
      return 0;
    case 'bump-build':
      bumpBuild(arg);
      return 0;
    case 'check-ota':
      return checkOta();
    default:
      console.error('사용법: node scripts/version.js <status|set|sync-runtime|bump-build|check-ota>');
      return 1;
  }
}

try {
  process.exit(main());
} catch (error) {
  console.error(`오류: ${error.message}`);
  process.exit(1);
}
