/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');

function sourceHash(root) {
  const files = [];
  function walk(directory) {
    for (const entry of fs.readdirSync(path.join(root, directory), { withFileTypes: true })) {
      const name = `${directory}/${entry.name}`;
      if (entry.isDirectory()) walk(name);
      else if (entry.isFile() && entry.name !== '.DS_Store' &&
          !/^Assets\/AddressableAssetsData\/.+\/addressables_content_state\.bin(?:\.meta)?$/.test(name)) files.push(name);
      else if (entry.isSymbolicLink()) throw new Error(`Unity 입력의 심볼릭 링크는 지원하지 않는다: ${name}`);
    }
  }
  ['Assets', 'Packages', 'ProjectSettings'].forEach(walk);
  const hash = createHash('sha256');
  for (const name of files.sort()) {
    const digest = createHash('sha256').update(fs.readFileSync(path.join(root, name))).digest('hex');
    hash.update(`${name}\0${digest}\n`);
  }
  return hash.digest('hex');
}

function check(root, platform, output) {
  if (!['ios', 'android'].includes(platform)) throw new Error('잘못된 Unity 플랫폼');
  const receiptPath = path.join(output, '.runtaeho-export.json');
  if (!fs.existsSync(receiptPath)) throw new Error(`Unity ${platform} export 기록이 없다. Unity에서 다시 export한다.`);
  const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
  const recordedDirectory = fs.statSync(receipt.exportPath);
  const actualDirectory = fs.statSync(output);
  if (receipt.platform !== platform || recordedDirectory.dev !== actualDirectory.dev ||
      recordedDirectory.ino !== actualDirectory.ino || receipt.sourceHash !== sourceHash(root)) {
    throw new Error(`Unity ${platform} export와 현재 소스가 다르다. Unity에서 다시 export한다.`);
  }
}

if (require.main === module) {
  try {
    const root = path.resolve(__dirname, '../../unity/RunTaehoUnity');
    check(root, process.argv[2], process.argv[3]);
    console.log(`Unity ${process.argv[2]} export 입력 검증 완료`);
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
module.exports = { sourceHash, check };
