/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

function fixture(t) {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'runtaeho-deploy-'));
  const root = path.join(directory, 'runtaeho_app');
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  for (const dir of ['scripts', 'tools', 'bin', 'ios/app/Supporting', 'ios/app.xcodeproj', 'watchos/RunTaehoWatch.xcodeproj', 'android/app/src/main']) {
    fs.mkdirSync(path.join(root, dir), { recursive: true });
  }
  for (const dir of ['scripts', 'tools']) {
    for (const name of fs.readdirSync(path.join(__dirname, '..', dir))) {
      if (/\.(sh|js|cjs|json)$/.test(name)) fs.copyFileSync(path.join(__dirname, '..', dir, name), path.join(root, dir, name));
    }
  }
  fs.copyFileSync(path.join(__dirname, '../eas.json'), path.join(root, 'eas.json'));
  const pkg = JSON.parse(fs.readFileSync(path.join(__dirname, '../package.json')));
  fs.writeFileSync(path.join(root, 'package.json'), JSON.stringify({ version: '1.8.0', config: { runtimeVersion: '1.8.0' }, scripts: pkg.scripts }));
  fs.writeFileSync(path.join(root, 'ios/app/Supporting/Expo.plist'), '<key>EXUpdatesRuntimeVersion</key><string>1.8.0</string>');
  fs.writeFileSync(path.join(root, 'ios/app.xcodeproj/project.pbxproj'), 'MARKETING_VERSION = 1.8.0;\nCURRENT_PROJECT_VERSION = 1;');
  fs.writeFileSync(path.join(root, 'watchos/RunTaehoWatch.xcodeproj/project.pbxproj'), 'MARKETING_VERSION = 1.8.0;\nCURRENT_PROJECT_VERSION = 1;');
  fs.writeFileSync(path.join(root, 'android/app/build.gradle'), 'versionName "1.8.0"\nversionCode 68');
  fs.writeFileSync(path.join(root, 'android/app/src/main/AndroidManifest.xml'), 'expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="1.7.0"');
  fs.writeFileSync(path.join(root, 'bin/npx'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$CALL_LOG"\n', { mode: 0o755 });
  fs.writeFileSync(path.join(root, 'bin/git'), '#!/bin/sh\nif [ "$1" = rev-parse ]; then echo main; fi\n', { mode: 0o755 });
  const log = path.join(root, 'calls');
  const run = (command, args, env = {}) => spawnSync(command, args, { cwd: root, encoding: 'utf8', env: { ...process.env, PATH: `${root}/bin:${process.env.PATH}`, CALL_LOG: log, ...env } });
  return { root, run, calls: () => fs.existsSync(log) ? fs.readFileSync(log, 'utf8') : '' };
}

function nativeFixture(t) {
  const f = fixture(t);
  const unity = path.join(f.root, '../unity/RunTaehoUnity');
  for (const directory of ['Assets', 'Packages', 'ProjectSettings', 'Builds/iOS/Unity-iPhone.xcodeproj', 'Builds/Android/unityLibrary']) {
    fs.mkdirSync(path.join(unity, directory), { recursive: true });
  }
  const sourceHash = require('./check-unity.cjs').sourceHash(unity);
  for (const [platform, directory] of [['ios', 'iOS'], ['android', 'Android']]) {
    const output = path.join(unity, 'Builds', directory);
    fs.writeFileSync(path.join(output, '.runtaeho-export.json'), JSON.stringify({ platform, exportPath: output, sourceHash }));
  }
  fs.mkdirSync(path.join(f.root, 'ios/app.xcworkspace'));
  fs.writeFileSync(path.join(f.root, 'ios/app.xcworkspace/contents.xcworkspacedata'), `location = "absolute:${unity}/Builds/iOS/Unity-iPhone.xcodeproj">`);
  fs.writeFileSync(path.join(f.root, 'android/settings.gradle'), `project(':unityLibrary').projectDir = new File('${unity}/Builds/Android/unityLibrary')`);
  fs.copyFileSync(path.join(__dirname, 'ExportOptions.plist'), path.join(f.root, 'scripts/ExportOptions.plist'));
  fs.mkdirSync(path.join(f.root, 'credentials'));
  fs.writeFileSync(path.join(f.root, 'credentials/android-development.properties'), 'test signing configuration');
  fs.writeFileSync(path.join(f.root, 'credentials/asc.json'), JSON.stringify({ key_id: 'TESTKEY123', issuer_id: 'test-issuer', key: 'test-only-private-key' }));
  fs.writeFileSync(path.join(f.root, 'credentials/deployment.sh'), `export FIREBASE_PROJECT_ID=example-project
export FIREBASE_ANDROID_APP_ID=1:123456789:android:abcdef
export FIREBASE_TESTER_GROUPS=dev-testers
export ASC_API_KEY_PATH="$ROOT/credentials/asc.json"
export TESTFLIGHT_DEV_GROUPS=DevTesters
`);
  fs.writeFileSync(path.join(f.root, 'bin/firebase'), `#!/bin/sh
printf 'firebase %s\\n' "$*" >> "$CALL_LOG"
if [ "$1" = apps:list ]; then
  echo '{"result":[{"appId":"1:123456789:android:abcdef","packageName":"com.runtaeho.runtaeho.dev"}]}'
fi
`, { mode: 0o755 });
  fs.writeFileSync(path.join(f.root, 'bin/fastlane'), '#!/bin/sh\nprintf "fastlane %s\\n" "$*" >> "$CALL_LOG"\n', { mode: 0o755 });
  fs.writeFileSync(path.join(f.root, 'bin/xcodebuild'), `#!/bin/sh
printf 'xcodebuild %s\\n' "$*" >> "$CALL_LOG"
while [ "$#" -gt 0 ]; do
  if [ "$1" = -exportPath ]; then mkdir -p "$2"; touch "$2/app.ipa"; break; fi
  shift
done
`, { mode: 0o755 });
  fs.writeFileSync(path.join(f.root, 'android/gradlew'), `#!/bin/sh
printf 'gradle %s\\n' "$*" >> "$CALL_LOG"
mkdir -p app/build/outputs/apk/development/release app/build/outputs/bundle/productionRelease
touch app/build/outputs/apk/development/release/app-development-release.apk app/build/outputs/bundle/productionRelease/app-production-release.aab
`, { mode: 0o755 });
  fs.writeFileSync(path.join(f.root, 'bin/jarsigner'), '#!/bin/sh\necho "CN=Release Upload"\necho "jar verified."\n', { mode: 0o755 });
  const env = {
    EXPO_NO_DOTENV: '1', EXPO_PUBLIC_API_BASE_URL: 'https://example.invalid/api',
    EXPO_PUBLIC_S3_BUCKET_URL: 'https://example.invalid/assets', EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID: 'web-client',
    SENTRY_AUTH_TOKEN: 'test-only-token', ORG_GRADLE_PROJECT_RUNTAEHO_UPLOAD_STORE_FILE: '/test/upload.jks',
    ORG_GRADLE_PROJECT_RUNTAEHO_UPLOAD_STORE_PASSWORD: 'test-only-password',
    ORG_GRADLE_PROJECT_RUNTAEHO_UPLOAD_KEY_ALIAS: 'test-alias', ORG_GRADLE_PROJECT_RUNTAEHO_UPLOAD_KEY_PASSWORD: 'test-only-password',
  };
  return { ...f, env };
}

for (const scenario of [
  { profile: 'development', platform: 'android', build: /gradle :app:assembleDevelopmentRelease/, upload: /firebase appdistribution:distribute .*\.apk --project example-project --app 1:123456789:android:abcdef --groups dev-testers/ },
  { profile: 'development', platform: 'ios', build: /xcodebuild .* -scheme Development -configuration Development .* archive/, upload: /fastlane pilot upload .*--app_identifier com\.runtaeho\.runtaeho\.dev .*--groups DevTesters/ },
  { profile: 'production', platform: 'android', build: /gradle :app:bundleProductionRelease/, upload: /eas submit --platform android --path .*\.aab --profile production --non-interactive/ },
  { profile: 'production', platform: 'ios', build: /xcodebuild .* -scheme app -configuration Release .* archive/, upload: /eas submit --platform ios --path .*\.ipa --profile production --non-interactive/ },
]) {
  test(`${scenario.profile} ${scenario.platform} builds and uploads to its own distribution service`, (t) => {
    const f = nativeFixture(t);
    const args = ['scripts/deploy-store.sh', '--profile', scenario.profile, '--platform', scenario.platform];
    if (scenario.profile === 'production' && scenario.platform === 'ios') args.push('--submit-review');
    const result = f.run('bash', args, f.env);
    assert.equal(result.status, 0, result.stdout + result.stderr);
    assert.match(f.calls(), scenario.build);
    assert.match(f.calls(), scenario.upload);
    assert.doesNotMatch(result.stdout + result.stderr + f.calls(), /test-only-token|test-only-private-key|test-only-password/);
    assert.equal(fs.existsSync(path.join(f.root, 'build/deploy.lock')), false);
    if (scenario.profile === 'development') assert.doesNotMatch(f.calls(), /eas submit|deliver/);
    if (scenario.profile === 'production' && scenario.platform === 'ios') assert.match(f.calls(), /deliver .*--build_number 2 .*--submit_for_review --automatic_release false/);
  });
}

test('missing tester settings stops before the build number or a native build changes', (t) => {
  const f = nativeFixture(t);
  fs.writeFileSync(path.join(f.root, 'credentials/deployment.sh'), 'export FIREBASE_PROJECT_ID=example-project\n');
  const before = fs.readFileSync(path.join(f.root, 'android/app/build.gradle'), 'utf8');
  const result = f.run('bash', ['scripts/deploy-store.sh', '--profile', 'development', '--platform', 'android'], {
    ...f.env, FIREBASE_ANDROID_APP_ID: '', FIREBASE_TESTER_GROUPS: '',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /FIREBASE_ANDROID_APP_ID/);
  assert.equal(fs.readFileSync(path.join(f.root, 'android/app/build.gradle'), 'utf8'), before);
  assert.doesNotMatch(f.calls(), /gradle|appdistribution:distribute/);
});

test('another native deployment is rejected before changing versions', (t) => {
  const f = nativeFixture(t);
  fs.mkdirSync(path.join(f.root, 'build/deploy.lock'), { recursive: true });
  const before = fs.readFileSync(path.join(f.root, 'android/app/build.gradle'), 'utf8');
  const result = f.run('bash', ['scripts/deploy-store.sh', '--profile', 'development', '--platform', 'android'], f.env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /다른 배포/);
  assert.equal(fs.readFileSync(path.join(f.root, 'android/app/build.gradle'), 'utf8'), before);
  assert.equal(fs.existsSync(path.join(f.root, 'build/deploy.lock')), true);
});

test('a Firebase app from another target is rejected before a native build', (t) => {
  const f = nativeFixture(t);
  fs.appendFileSync(path.join(f.root, 'credentials/deployment.sh'), 'export FIREBASE_ANDROID_APP_ID=1:987654321:android:other\n');
  const before = fs.readFileSync(path.join(f.root, 'android/app/build.gradle'), 'utf8');
  const result = f.run('bash', ['scripts/deploy-store.sh', '--profile', 'development', '--platform', 'android'], f.env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /Firebase App ID/);
  assert.equal(fs.readFileSync(path.join(f.root, 'android/app/build.gradle'), 'utf8'), before);
  assert.doesNotMatch(f.calls(), /gradle|appdistribution:distribute/);
});

test('unavailable iOS platform stops before changing the build number', (t) => {
  const f = nativeFixture(t);
  fs.writeFileSync(path.join(f.root, 'bin/xcodebuild'), '#!/bin/sh\nexit 64\n', { mode: 0o755 });
  const before = fs.readFileSync(path.join(f.root, 'ios/app.xcodeproj/project.pbxproj'), 'utf8');
  const result = f.run('bash', ['scripts/deploy-store.sh', '--profile', 'development', '--platform', 'ios'], f.env);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /iOS 플랫폼/);
  assert.equal(fs.readFileSync(path.join(f.root, 'ios/app.xcodeproj/project.pbxproj'), 'utf8'), before);
  assert.doesNotMatch(f.calls(), /pilot upload/);
});

test('failed Apple processing wait never proceeds to review submission', (t) => {
  const f = nativeFixture(t);
  fs.writeFileSync(path.join(f.root, 'bin/fastlane'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$CALL_LOG"\nexit 1\n', { mode: 0o755 });
  const result = f.run('bash', ['scripts/submit-review.sh', '1.8.0', '72']);
  assert.notEqual(result.status, 0);
  assert.match(f.calls(), /wait_production_build version:1\.8\.0 build:72/);
  assert.doesNotMatch(f.calls(), /deliver/);
});

test('legacy OTA command refuses runtime mismatch before calling EAS', (t) => {
  const f = fixture(t);
  const result = f.run('npm', ['run', 'update:prod', '--', 'audit']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /런타임/);
  assert.equal(f.calls(), '');
});

test('OTA release alias never changes app version before validation', (t) => {
  const f = fixture(t);
  f.run('npm', ['run', 'release:ota', '--', '-m', 'audit']);
  assert.equal(JSON.parse(fs.readFileSync(path.join(f.root, 'package.json'))).version, '1.8.0');
});

test('iOS-only OTA validates only the selected platform', (t) => {
  const f = fixture(t);
  const result = f.run('node', ['scripts/version.js', 'check-ota', 'ios']);
  assert.equal(result.status, 0, result.stderr);
});

test('invalid OTA platform fails closed', (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'android/app/src/main/AndroidManifest.xml'), 'expo.modules.updates.EXPO_RUNTIME_VERSION" android:value="1.8.0"');
  assert.notEqual(f.run('node', ['scripts/version.js', 'check-ota', 'typo']).status, 0);
});

test('upload-only command leaves versions untouched and uses the explicit artifact', (t) => {
  const f = fixture(t);
  const before = fs.readFileSync(path.join(f.root, 'package.json'), 'utf8');
  const artifact = path.join(f.root, 'existing release.ipa');
  fs.writeFileSync(artifact, 'test artifact');
  const result = f.run('bash', ['scripts/submit-store.sh', '--platform', 'ios', '--path', artifact]);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(path.join(f.root, 'package.json'), 'utf8'), before);
  assert.match(f.calls(), /eas submit --platform ios --path .*existing release\.ipa --profile production --non-interactive/);
});

test('upload-only rejects a missing artifact before contacting EAS', (t) => {
  const f = fixture(t);
  assert.notEqual(f.run('bash', ['scripts/submit-store.sh', '--platform', 'android', '--path', 'missing.aab']).status, 0);
  assert.equal(f.calls(), '');
});

test('release retry rejects changed source, another platform, and another app profile', (t) => {
  const f = fixture(t);
  const git = (args) => {
    const result = spawnSync('/usr/bin/git', args, { cwd: f.root, encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr);
  };
  // 실제 Git으로 소스 변경 감지까지 검증한다.
  fs.unlinkSync(path.join(f.root, 'bin/git'));
  fs.writeFileSync(path.join(f.root, '.gitignore'), 'build/\n');
  git(['init', '-q']);
  git(['add', '.']);
  git(['-c', 'user.name=Deployment Test', '-c', 'user.email=deploy@example.invalid', 'commit', '-qm', 'fixture']);
  assert.equal(f.run('node', ['scripts/release-state.cjs', 'save', 'ios']).status, 0);
  assert.equal(f.run('node', ['scripts/release-state.cjs', 'check', 'ios']).status, 0);
  assert.notEqual(f.run('node', ['scripts/release-state.cjs', 'check', 'android']).status, 0);
  assert.notEqual(f.run('node', ['scripts/release-state.cjs', 'check', 'ios', 'development']).status, 0);
  fs.appendFileSync(path.join(f.root, 'package.json'), '\n');
  assert.notEqual(f.run('node', ['scripts/release-state.cjs', 'check', 'ios']).status, 0);
});

test('development app cannot be submitted through production review automation', (t) => {
  const f = fixture(t);
  const before = fs.readFileSync(path.join(f.root, 'package.json'), 'utf8');
  const result = f.run('bash', ['scripts/deploy-store.sh', '--profile', 'development', '--submit-review']);
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /개발 앱은 운영 심사에 제출하지 않는다/);
  assert.equal(fs.readFileSync(path.join(f.root, 'package.json'), 'utf8'), before);
  assert.equal(f.calls(), '');
});

test('local Android command builds the dev variant and only installs or launches on an emulator', (t) => {
  const f = fixture(t);
  fs.mkdirSync(path.join(f.root, 'platform-tools'));
  fs.writeFileSync(path.join(f.root, 'platform-tools/adb'), '#!/bin/sh\nprintf "adb %s\\n" "$*" >> "$CALL_LOG"\n', { mode: 0o755 });
  fs.writeFileSync(path.join(f.root, 'android/gradlew'), '#!/bin/sh\nprintf "gradle %s\\n" "$*" >> "$CALL_LOG"\n', { mode: 0o755 });
  const result = f.run('bash', ['scripts/run-local.sh', 'android'], { ANDROID_HOME: f.root, EXPO_NO_DOTENV: '1' });
  assert.equal(result.status, 0, result.stderr);
  assert.match(f.calls(), /gradle :app:assembleLocalDebug/);
  assert.match(f.calls(), /adb -e install -r .*app-local-debug\.apk/);
  assert.match(f.calls(), /adb -e shell am start .*runtaeho-dev:.* com\.runtaeho\.runtaeho\.dev/);
  assert.doesNotMatch(f.calls(), /^adb (?!-e )/m);
});

test('Unity gate detects changed and newly added inputs after export', (t) => {
  const { sourceHash, check } = require('./check-unity.cjs');
  const f = fixture(t);
  for (const name of ['Assets', 'Packages', 'ProjectSettings', 'Builds/iOS']) {
    fs.mkdirSync(path.join(f.root, name), { recursive: true });
  }
  fs.writeFileSync(path.join(f.root, 'Assets/character.cs'), 'original');
  const output = path.join(f.root, 'Builds/iOS');
  assert.throws(() => check(f.root, 'ios', output), /기록이 없다/);
  fs.writeFileSync(path.join(output, '.runtaeho-export.json'), JSON.stringify({
    platform: 'ios', exportPath: output, sourceHash: sourceHash(f.root),
  }));
  assert.doesNotThrow(() => check(f.root, 'ios', output));
  fs.writeFileSync(path.join(f.root, 'Assets/new.asset'), 'new asset');
  assert.throws(() => check(f.root, 'ios', output), /소스가 다르다/);
  fs.unlinkSync(path.join(f.root, 'Assets/new.asset'));
  fs.writeFileSync(path.join(f.root, 'Assets/character.cs'), 'modified');
  assert.throws(() => check(f.root, 'ios', output), /소스가 다르다/);
});

test('iOS links and embeds the Unity project product with an explicit target dependency', () => {
  const project = require('xcode').project(path.join(__dirname, '../ios/app.xcodeproj/project.pbxproj'));
  project.parseSync();
  const objects = project.hash.project.objects;
  const app = Object.values(objects.PBXNativeTarget).find(target => target.name === 'app');
  const embed = app.buildPhases.map(phase => objects.PBXCopyFilesBuildPhase[phase.value])
    .find(phase => phase && phase.name === '"Embed Frameworks"');
  const productId = embed.files.map(file => objects.PBXBuildFile[file.value].fileRef)
    .find(id => objects.PBXReferenceProxy[id]?.path === 'UnityFramework.framework');
  assert.ok(productId, 'Unity must embed the remote target product, not a file in the phone configuration directory');
  const remoteProduct = objects.PBXContainerItemProxy[objects.PBXReferenceProxy[productId].remoteRef];
  const linkedProducts = app.buildPhases.flatMap(phase => objects.PBXFrameworksBuildPhase[phase.value]?.files || [])
    .map(file => objects.PBXBuildFile[file.value].fileRef);
  assert.ok(linkedProducts.includes(productId));
  const dependencies = app.dependencies.map(dependency => objects.PBXTargetDependency[dependency.value])
    .map(dependency => objects.PBXContainerItemProxy[dependency.targetProxy]);
  assert.ok(dependencies.some(dependency => dependency.proxyType === 1 &&
    dependency.containerPortal === remoteProduct.containerPortal && dependency.remoteInfo === 'UnityFramework'));
});

test('Ads configuration updates the archived plist when the build-products app path is absent', {
  skip: process.platform !== 'darwin',
}, (t) => {
  const f = fixture(t);
  const project = require('xcode').project(path.join(__dirname, '../ios/app.xcodeproj/project.pbxproj'));
  project.parseSync();
  const phase = Object.values(project.hash.project.objects.PBXShellScriptBuildPhase)
    .find(item => item.name === '"[CP-User] [RNGoogleMobileAds] Configuration"');
  assert.ok(phase.inputPaths.includes('"$(TARGET_BUILD_DIR)/$(INFOPLIST_PATH)"'));
  const appId = 'ca-app-pub-3940256099942544~1458002511';
  fs.writeFileSync(path.join(f.root, 'app.json'), JSON.stringify({ 'react-native-google-mobile-ads': { ios_app_id: appId } }));
  const archive = path.join(f.root, 'archive/Applications');
  const plist = path.join(archive, 'Test.app/Info.plist');
  fs.mkdirSync(path.dirname(plist), { recursive: true });
  fs.writeFileSync(plist, '<?xml version="1.0"?><plist version="1.0"><dict/></plist>');
  const result = f.run('bash', ['-c', JSON.parse(phase.shellScript)], {
    PROJECT_DIR: path.join(f.root, 'ios'), TARGET_BUILD_DIR: archive,
    BUILT_PRODUCTS_DIR: path.join(f.root, 'build/Products/Development-iphoneos'),
    INFOPLIST_PATH: 'Test.app/Info.plist', DWARF_DSYM_FOLDER_PATH: path.join(f.root, 'archive/dSYMs'),
    DWARF_DSYM_FILE_NAME: 'Test.app.dSYM',
  });
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const value = spawnSync('/usr/libexec/PlistBuddy', ['-c', 'Print :GADApplicationIdentifier', plist], { encoding: 'utf8' });
  assert.equal(value.status, 0, value.stderr);
  assert.equal(value.stdout.trim(), appId);
});

test('embedded Watch metadata is available before scripts consume the phone plist', () => {
  const project = require('xcode').project(path.join(__dirname, '../ios/app.xcodeproj/project.pbxproj'));
  project.parseSync();
  const objects = project.hash.project.objects;
  const app = Object.values(objects.PBXNativeTarget).find(target => target.name === 'app');
  const watchIndex = app.buildPhases.findIndex(phase =>
    objects.PBXCopyFilesBuildPhase[phase.value]?.name === '"Embed Watch Content"');
  assert.ok(watchIndex >= 0);
  app.buildPhases.forEach((phase, index) => {
    const inputs = objects.PBXShellScriptBuildPhase[phase.value]?.inputPaths || [];
    if (inputs.includes('"$(TARGET_BUILD_DIR)/$(INFOPLIST_PATH)"')) assert.ok(index > watchIndex);
  });
});

test('Unity receipt accepts the same physical output directory and rejects another directory', (t) => {
  const { sourceHash, check } = require('./check-unity.cjs');
  const f = fixture(t);
  for (const directory of ['Assets', 'Packages', 'ProjectSettings', 'Builds/Android', 'Builds/other']) {
    fs.mkdirSync(path.join(f.root, directory), { recursive: true });
  }
  const output = path.join(f.root, 'Builds/Android');
  const alternate = path.join(f.root, 'Builds/android');
  if (!fs.existsSync(alternate)) fs.symlinkSync(output, alternate, 'dir');
  const receipt = JSON.stringify({ platform: 'android', exportPath: alternate, sourceHash: sourceHash(f.root) });
  fs.writeFileSync(path.join(output, '.runtaeho-export.json'), receipt);
  assert.doesNotThrow(() => check(f.root, 'android', output));
  const other = path.join(f.root, 'Builds/other');
  fs.writeFileSync(path.join(other, '.runtaeho-export.json'), receipt);
  assert.throws(() => check(f.root, 'android', other), /소스가 다르다/);
});

test('Addressables generated build state does not invalidate another platform but real settings do', (t) => {
  const { sourceHash, check } = require('./check-unity.cjs');
  const f = fixture(t);
  for (const directory of ['Assets/AddressableAssetsData/Android', 'Assets/AddressableAssetsData/iOS', 'Packages', 'ProjectSettings', 'Builds/iOS']) {
    fs.mkdirSync(path.join(f.root, directory), { recursive: true });
  }
  const state = path.join(f.root, 'Assets/AddressableAssetsData/Android/addressables_content_state.bin');
  const settings = path.join(f.root, 'Assets/AddressableAssetsData/AddressableAssetSettings.asset');
  fs.writeFileSync(state, 'old generated state');
  fs.writeFileSync(state + '.meta', 'generated asset id');
  fs.writeFileSync(settings, 'real source settings');
  const output = path.join(f.root, 'Builds/iOS');
  fs.writeFileSync(path.join(output, '.runtaeho-export.json'), JSON.stringify({ platform: 'ios', exportPath: output, sourceHash: sourceHash(f.root) }));
  fs.writeFileSync(state, 'new generated state');
  fs.writeFileSync(state + '.meta', 'new generated asset id');
  assert.doesNotThrow(() => check(f.root, 'ios', output));
  fs.writeFileSync(settings, 'changed real source settings');
  assert.throws(() => check(f.root, 'ios', output), /소스가 다르다/);
});

test('environment validation rejects missing values and localhost without exposing values', () => {
  const { validate } = require('./check-env.cjs');
  const env = {
    EXPO_PUBLIC_API_BASE_URL: 'https://example.invalid/api/v1',
    EXPO_PUBLIC_S3_BUCKET_URL: 'https://example.invalid/assets',
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios-client', EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID: 'web-client',
    EXPO_PUBLIC_ENV: 'production',
  };
  assert.doesNotThrow(() => validate(env));
  assert.throws(() => validate({ ...env, EXPO_PUBLIC_ENV: 'development' }, 'production'), /배포 대상/);
  assert.throws(() => validate({ ...env, EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID: '' }), /EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID/);
  assert.throws(() => validate({ ...env, EXPO_PUBLIC_API_BASE_URL: 'http://localhost/private-value' }), (error) => {
    assert.match(error.message, /HTTPS/);
    assert.ok(!error.message.includes('private-value'));
    return true;
  });
});

test('review submission pins the explicit build and keeps release manual', (t) => {
  const f = fixture(t);
  const keyPath = path.join(f.root, 'api-key.json');
  fs.writeFileSync(keyPath, JSON.stringify({ key_id: 'TESTKEY123', issuer_id: 'test-issuer', key: 'test-only-private-key' }));
  fs.writeFileSync(path.join(f.root, 'bin/fastlane'), '#!/bin/sh\nprintf "%s\\n" "$*" >> "$CALL_LOG"\n', { mode: 0o755 });
  const result = spawnSync('bash', ['scripts/submit-review.sh', '1.8.0', '72'], { cwd: f.root, encoding: 'utf8', env: {
    ...process.env, PATH: `${f.root}/bin:${process.env.PATH}`, CALL_LOG: path.join(f.root, 'calls'), ASC_API_KEY_PATH: keyPath,
  } });
  assert.equal(result.status, 0, result.stderr);
  assert.match(f.calls(), /--app_version 1\.8\.0 --build_number 72/);
  assert.match(f.calls(), /wait_production_build version:1\.8\.0 build:72/);
  assert.match(f.calls(), /--skip_binary_upload/);
  assert.match(f.calls(), /--submit_for_review --automatic_release false/);
});

test('Android upload refuses debug signing even when jarsigner exits successfully', (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'release.aab'), 'test artifact');
  fs.writeFileSync(path.join(f.root, 'bin/jarsigner'), '#!/bin/sh\necho "CN=Android Debug"\necho "jar verified."\n', { mode: 0o755 });
  assert.notEqual(f.run('bash', ['scripts/submit-store.sh', '--platform', 'android', '--path', 'release.aab']).status, 0);
  assert.equal(f.calls(), '');
});

test('Android upload refuses a signature verifier failure before EAS', (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'release.aab'), 'test artifact');
  fs.writeFileSync(path.join(f.root, 'bin/jarsigner'), '#!/bin/sh\nexit 1\n', { mode: 0o755 });
  assert.notEqual(f.run('bash', ['scripts/submit-store.sh', '--platform', 'android', '--path', 'release.aab']).status, 0);
  assert.equal(f.calls(), '');
});

test('OTA environment wrapper validates remote values and quotes shell metacharacters', (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'bin/npx'), `#!/bin/sh
if [ "$2" = env:exec ]; then
  export EXPO_PUBLIC_API_BASE_URL=https://example.invalid/api
  export EXPO_PUBLIC_S3_BUCKET_URL=https://example.invalid/assets
  export EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID=ios-client
  export EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID=web-client
  exec /bin/sh -c "$4"
fi
printf '%s\\n' "$@" >> "$CALL_LOG"
`, { mode: 0o755 });
  const message = "quote ' $(touch injected) `touch injected` ; &";
  const result = f.run('node', ['scripts/publish-ota.cjs', 'production', 'production', 'all', message]);
  assert.equal(result.status, 0, result.stderr);
  assert.ok(f.calls().includes(message));
  assert.equal(fs.existsSync(path.join(f.root, 'injected')), false);
});

test('OTA missing remote config cannot fall back to local shell values', (t) => {
  const f = fixture(t);
  fs.writeFileSync(path.join(f.root, 'bin/npx'), '#!/bin/sh\nif [ "$2" = env:exec ]; then exec /bin/sh -c "$4"; fi\necho unexpected-publish >> "$CALL_LOG"\n', { mode: 0o755 });
  const result = spawnSync('node', ['scripts/publish-ota.cjs', 'production', 'production', 'all', 'audit'], {
    cwd: f.root, encoding: 'utf8', env: { ...process.env, PATH: `${f.root}/bin:${process.env.PATH}`, CALL_LOG: path.join(f.root, 'calls'),
      EXPO_PUBLIC_API_BASE_URL: 'https://example.invalid/api', EXPO_PUBLIC_S3_BUCKET_URL: 'https://example.invalid/assets',
      EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'local-ios', EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID: 'local-web' },
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /환경변수 누락/);
  assert.equal(f.calls(), '');
});

test('failed native build resumes without bumping again or requiring an EAS login', (t) => {
  const f = fixture(t);
  fs.unlinkSync(path.join(f.root, 'bin/git'));
  fs.symlinkSync(path.join(__dirname, '../node_modules'), path.join(f.root, 'node_modules'));
  fs.copyFileSync(path.join(__dirname, 'ExportOptions.plist'), path.join(f.root, 'scripts/ExportOptions.plist'));
  const unity = path.join(f.root, '../unity/RunTaehoUnity');
  for (const directory of ['Assets', 'Packages', 'ProjectSettings', 'Builds/iOS/Unity-iPhone.xcodeproj']) {
    fs.mkdirSync(path.join(unity, directory), { recursive: true });
  }
  const output = path.join(unity, 'Builds/iOS');
  fs.writeFileSync(path.join(output, '.runtaeho-export.json'), JSON.stringify({
    platform: 'ios', exportPath: output, sourceHash: require('./check-unity.cjs').sourceHash(unity),
  }));
  fs.mkdirSync(path.join(f.root, 'ios/app.xcworkspace'));
  fs.writeFileSync(path.join(f.root, 'ios/app.xcworkspace/contents.xcworkspacedata'), `location = "absolute:${output}/Unity-iPhone.xcodeproj">`);
  fs.writeFileSync(path.join(f.root, '.gitignore'), 'build/\nnode_modules\ncalls\n');
  fs.writeFileSync(path.join(f.root, 'bin/xcodebuild'), `#!/bin/sh
case "$*" in *-showBuildSettings*) exit 0 ;; esac
if [ "$FAIL_BUILD" = 1 ]; then exit 1; fi
while [ "$#" -gt 0 ]; do
  if [ "$1" = -exportPath ]; then mkdir -p "$2"; touch "$2/app.ipa"; break; fi
  shift
done
`, { mode: 0o755 });
  for (const args of [['init', '-q'], ['add', '.'], ['-c', 'user.name=Deployment Test', '-c', 'user.email=deploy@example.invalid', 'commit', '-qm', 'fixture']]) {
    const result = f.run('/usr/bin/git', args);
    assert.equal(result.status, 0, result.stderr);
  }
  const env = {
    EXPO_PUBLIC_API_BASE_URL: 'https://example.invalid/api', EXPO_PUBLIC_S3_BUCKET_URL: 'https://example.invalid/assets',
    EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID: 'ios-client', EXPO_PUBLIC_GOOGLE_SERVER_CLIENT_ID: 'web-client',
    SENTRY_AUTH_TOKEN: 'test-only-token',
  };
  const failed = f.run('bash', ['scripts/deploy-store.sh', '--platform', 'ios', '--no-submit'], { ...env, FAIL_BUILD: '1' });
  assert.notEqual(failed.status, 0);
  assert.match(failed.stderr, /실패한 단계: iOS 빌드/);
  assert.equal(fs.existsSync(path.join(f.root, 'build/deploy.lock')), false);
  const resumed = f.run('bash', ['scripts/deploy-store.sh', '--platform', 'ios', '--no-submit', '--resume'], { ...env, FAIL_BUILD: '0' });
  assert.equal(resumed.status, 0, resumed.stdout + resumed.stderr);
  assert.match(fs.readFileSync(path.join(f.root, 'ios/app.xcodeproj/project.pbxproj'), 'utf8'), /CURRENT_PROJECT_VERSION = 2;/);
  assert.equal(f.calls(), '');
});


test('setting release version keeps phone and independent companion watch marketing versions matched', (t) => {
  const f = fixture(t);
  const result = f.run('node', ['scripts/version.js', 'set', '1.9.0']);
  assert.equal(result.status, 0, result.stderr);
  const phone = fs.readFileSync(path.join(f.root, 'ios/app.xcodeproj/project.pbxproj'), 'utf8');
  const watch = fs.readFileSync(path.join(f.root, 'watchos/RunTaehoWatch.xcodeproj/project.pbxproj'), 'utf8');
  assert.match(phone, /MARKETING_VERSION = 1\.9\.0;/);
  assert.match(watch, /MARKETING_VERSION = 1\.9\.0;/);
  assert.match(phone, /CURRENT_PROJECT_VERSION = 1;/);
  assert.match(watch, /CURRENT_PROJECT_VERSION = 1;/);
});

test('iOS build bump advances both projects beyond the highest existing companion build', (t) => {
  const f = fixture(t);
  const watchFile = path.join(f.root, 'watchos/RunTaehoWatch.xcodeproj/project.pbxproj');
  fs.writeFileSync(watchFile, 'MARKETING_VERSION = 1.8.0;\nCURRENT_PROJECT_VERSION = 7;');
  const result = f.run('node', ['scripts/version.js', 'bump-build', 'ios']);
  assert.equal(result.status, 0, result.stderr);
  assert.match(fs.readFileSync(path.join(f.root, 'ios/app.xcodeproj/project.pbxproj'), 'utf8'), /CURRENT_PROJECT_VERSION = 8;/);
  assert.match(fs.readFileSync(watchFile, 'utf8'), /CURRENT_PROJECT_VERSION = 8;/);
  assert.match(fs.readFileSync(watchFile, 'utf8'), /MARKETING_VERSION = 1\.8\.0;/);
  assert.match(fs.readFileSync(path.join(f.root, 'android/app/build.gradle'), 'utf8'), /versionCode 68/);
});

test('Android-only build bump leaves independent watch project untouched', (t) => {
  const f = fixture(t);
  const watchFile = path.join(f.root, 'watchos/RunTaehoWatch.xcodeproj/project.pbxproj');
  const before = fs.readFileSync(watchFile, 'utf8');
  const result = f.run('node', ['scripts/version.js', 'bump-build', 'android']);
  assert.equal(result.status, 0, result.stderr);
  assert.equal(fs.readFileSync(watchFile, 'utf8'), before);
  assert.match(fs.readFileSync(path.join(f.root, 'ios/app.xcodeproj/project.pbxproj'), 'utf8'), /CURRENT_PROJECT_VERSION = 1;/);
  assert.match(fs.readFileSync(path.join(f.root, 'android/app/build.gradle'), 'utf8'), /versionCode 69/);
});
