/* global __dirname */
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { execFileSync } = require('node:child_process');

function fingerprint(root) {
  const files = execFileSync('git', ['ls-files', '-z', '--cached', '--others', '--exclude-standard'], { cwd: root })
    .toString().split('\0').filter(Boolean);
  const hash = createHash('sha256');
  hash.update(execFileSync('git', ['rev-parse', 'HEAD'], { cwd: root }));
  for (const file of [...new Set(files)].sort()) {
    hash.update(`${file}\0`);
    const target = path.join(root, file);
    hash.update(fs.existsSync(target)
      ? `file:${createHash('sha256').update(fs.readFileSync(target)).digest('hex')}\n`
      : 'deleted\n');
  }
  return hash.digest('hex');
}

if (require.main === module) {
  try {
    const root = path.join(__dirname, '..');
    const statePath = path.join(root, 'build/release/pending.json');
    const current = fingerprint(root);
    const platform = process.argv[3];
    if (!['all', 'ios', 'android'].includes(platform)) throw new Error('재시도 플랫폼이 필요하다.');
    if (process.argv[2] === 'save') {
      fs.mkdirSync(path.dirname(statePath), { recursive: true });
      fs.writeFileSync(statePath, JSON.stringify({ fingerprint: current, platform }, null, 2) + '\n');
    } else if (process.argv[2] === 'check') {
      const saved = JSON.parse(fs.readFileSync(statePath));
      if (saved.fingerprint !== current || saved.platform !== platform) {
        throw new Error('배포 준비 후 소스/커밋이 바뀌었다. --resume 대신 새 배포를 준비한다.');
      }
    } else throw new Error('사용법: node scripts/release-state.cjs save|check');
  } catch (error) {
    console.error(error.code === 'ENOENT' ? '재시도할 배포 상태가 없다.' : error.message);
    process.exitCode = 1;
  }
}
