/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { sourceHash } = require('./check-unity.cjs');

test('Local workspace selects Simulator Unity without changing the device project', (t) => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), 'runtaeho-ios-simulator-'));
  t.after(() => fs.rmSync(directory, { recursive: true, force: true }));
  const root = path.join(directory, 'runtaeho_app');
  const unity = path.join(directory, 'unity/RunTaehoUnity');
  const output = path.join(unity, 'Builds/iOS-Simulator');
  for (const name of ['Assets', 'Packages', 'ProjectSettings', 'Builds/iOS-Simulator/Unity-iPhone.xcodeproj']) {
    fs.mkdirSync(path.join(unity, name), { recursive: true });
  }
  fs.writeFileSync(path.join(output, '.runtaeho-export.json'), JSON.stringify({
    platform: 'ios-simulator', exportPath: output, sourceHash: sourceHash(unity),
  }));
  const originals = {};
  for (const name of ['app.xcodeproj/project.pbxproj', 'app.xcodeproj/xcshareddata/xcschemes/Local.xcscheme', 'app.xcworkspace/contents.xcworkspacedata']) {
    const file = path.join(root, 'ios', name);
    fs.mkdirSync(path.dirname(file), { recursive: true });
    originals[name] = fs.readFileSync(path.join(__dirname, '../ios', name), 'utf8');
    fs.writeFileSync(file, originals[name]);
  }

  const workspace = require('./prepare-ios-simulator.cjs').prepare(root);
  assert.equal(workspace, path.join(root, 'ios/app-simulator.xcworkspace'));
  const project = require('xcode').project(path.join(root, 'ios/app-simulator.xcodeproj/project.pbxproj'));
  project.parseSync();
  const unityReference = Object.values(project.hash.project.objects.PBXFileReference)
    .find(item => item.name === '"Unity-iPhone.xcodeproj"');
  assert.equal(JSON.parse(unityReference.path), path.join(output, 'Unity-iPhone.xcodeproj'));
  const contents = fs.readFileSync(path.join(workspace, 'contents.xcworkspacedata'), 'utf8');
  assert.match(contents, /group:app-simulator\.xcodeproj/);
  assert.match(contents, /iOS-Simulator\/Unity-iPhone\.xcodeproj/);
  assert.doesNotMatch(contents, /Builds\/iOS\/Unity-iPhone/);
  const scheme = fs.readFileSync(path.join(root, 'ios/app-simulator.xcodeproj/xcshareddata/xcschemes/Local.xcscheme'), 'utf8');
  assert.match(scheme, /container:app-simulator\.xcodeproj/);
  for (const [name, original] of Object.entries(originals)) {
    assert.equal(fs.readFileSync(path.join(root, 'ios', name), 'utf8'), original);
  }
});
