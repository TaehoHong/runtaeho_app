/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { check } = require('./check-unity.cjs');

function prepare(root) {
  const unity = path.resolve(root, '../unity/RunTaehoUnity');
  const output = path.join(unity, 'Builds/iOS-Simulator');
  try {
    check(unity, 'ios-simulator', output);
  } catch {
    const version = fs.readFileSync(path.join(unity, 'ProjectSettings/ProjectVersion.txt'), 'utf8')
      .match(/^m_EditorVersion: (.+)$/m)[1].trim();
    const editor = `/Applications/Unity/Hub/Editor/${version}/Unity.app/Contents/MacOS/Unity`;
    const log = path.join(root, 'build/local/unity-ios-simulator.log');
    fs.mkdirSync(path.dirname(log), { recursive: true });
    console.log(`Unity Simulator export를 준비합니다. 로그: ${log}`);
    const result = spawnSync(editor, [
      '-batchmode', '-nographics', '-quit', '-projectPath', unity, '-buildTarget', 'iOS',
      '-executeMethod', 'RunTaeho.Editor.NativeProjectExport.ExportIosSimulator', '-logFile', log,
    ], { stdio: 'inherit' });
    if (result.error) throw result.error;
    if (result.status !== 0) throw new Error(`Unity Simulator export 실패. 로그: ${log}`);
    check(unity, 'ios-simulator', output);
  }

  const ios = path.join(root, 'ios');
  const project = path.join(ios, 'app-simulator.xcodeproj');
  const workspace = path.join(ios, 'app-simulator.xcworkspace');
  const scheme = 'xcshareddata/xcschemes/Local.xcscheme';
  const unityProject = path.join(output, 'Unity-iPhone.xcodeproj');
  fs.mkdirSync(path.join(project, path.dirname(scheme)), { recursive: true });
  fs.mkdirSync(workspace, { recursive: true });
  const contents = fs.readFileSync(path.join(ios, 'app.xcodeproj/project.pbxproj'), 'utf8');
  const reference = /path = "[^"\n]*\/Unity-iPhone\.xcodeproj"; sourceTree = SOURCE_ROOT;/;
  if (!reference.test(contents)) throw new Error('앱의 Unity 프로젝트 참조를 찾지 못했다.');
  fs.writeFileSync(path.join(project, 'project.pbxproj'), contents.replace(reference,
    `path = ${JSON.stringify(unityProject)}; sourceTree = "<absolute>";`));
  fs.writeFileSync(path.join(project, scheme), fs.readFileSync(path.join(ios, 'app.xcodeproj', scheme), 'utf8')
    .replaceAll('container:app.xcodeproj', 'container:app-simulator.xcodeproj'));
  fs.writeFileSync(path.join(workspace, 'contents.xcworkspacedata'),
    fs.readFileSync(path.join(ios, 'app.xcworkspace/contents.xcworkspacedata'), 'utf8')
      .replace('group:app.xcodeproj', 'group:app-simulator.xcodeproj')
      .replace(/absolute:[^"\n]*\/Unity-iPhone\.xcodeproj/, `absolute:${unityProject}`));
  return workspace;
}

if (require.main === module) {
  try {
    console.log(`iOS Simulator workspace: ${prepare(path.resolve(__dirname, '..'))}`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { prepare };
