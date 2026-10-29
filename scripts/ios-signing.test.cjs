/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const path = require('node:path');

function python(source) {
  return spawnSync('python3', ['-c', `
import importlib.util, json, pathlib, hashlib
spec=importlib.util.spec_from_file_location('signing', ${JSON.stringify(path.join(__dirname, 'sign-ios.py'))})
m=importlib.util.module_from_spec(spec)
spec.loader.exec_module(m)
${source}`], { encoding: 'utf8', env: { ...process.env, PYTHONDONTWRITEBYTECODE: '1' } });
}

test('App Store entitlements use the selected profile without granting unrelated capabilities', () => {
  const result = python(`
source={'aps-environment':'development','com.apple.developer.healthkit':True,'com.apple.developer.applesignin':['Default']}
allowed={**source,'aps-environment':'production','application-identifier':'TEAM.com.example.dev','get-task-allow':False,'com.apple.developer.healthkit.access':['health-records']}
print(json.dumps(m.entitlements(source, allowed)))
`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), {
    'aps-environment': 'production',
    'com.apple.developer.healthkit': true,
    'com.apple.developer.applesignin': ['Default'],
    'application-identifier': 'TEAM.com.example.dev',
    'get-task-allow': false,
  });
});

test('a missing HealthKit capability cannot produce a signed release', () => {
  const result = python(`
try:
    m.entitlements({'com.apple.developer.healthkit':True}, {})
except ValueError as error:
    print(str(error))
else:
    raise AssertionError('Missing capability accepted')
`);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /com.apple.developer.healthkit/);
});

test('a production archive cannot be exported as the development app', () => {
  const result = python(`
import tempfile, plistlib
with tempfile.TemporaryDirectory() as directory:
    app=pathlib.Path(directory)
    (app/'Info.plist').write_bytes(plistlib.dumps({'CFBundleIdentifier':'com.runtaeho.runtaeho'}))
    try:
        m.check_app(app, 'com.runtaeho.runtaeho.dev')
    except ValueError as error:
        print(str(error))
    else:
        raise AssertionError('Wrong app accepted')
`);
  assert.equal(result.status, 0, result.stderr);
  assert.match(result.stdout, /앱 ID가.*다릅니다.*com\.runtaeho\.runtaeho\.dev/);
});

test('signing failure restores the original keychain search list and removes the temporary keychain', () => {
  const result = python(`
state={'search':['/example/login.keychain-db'],'created':[]}
digest=hashlib.sha1(b'fixture certificate').hexdigest().upper()
def security(args):
    action=args[1]
    if action=='list-keychains':
        if '-s' in args:
            state['search']=args[5:]
        return ('\\n'.join('"'+p+'"' for p in state['search'])).encode()
    if action=='create-keychain': state['created'].append(args[-1])
    if action=='delete-keychain': state['created'].remove(args[-1])
    if action=='find-identity': return ('1) '+digest+' "Apple Distribution: Fixture"').encode()
    return b''
m.command=security
try:
    with m.signing_keychain(pathlib.Path('/fixture/signing.p12'), 'fixture-password', [b'fixture certificate']):
        assert state['search'] != ['/example/login.keychain-db']
        raise RuntimeError('Simulated export failure')
except RuntimeError:
    pass
print(json.dumps(state))
`);
  assert.equal(result.status, 0, result.stderr);
  assert.deepEqual(JSON.parse(result.stdout), { search: ['/example/login.keychain-db'], created: [] });
  assert.doesNotMatch(result.stdout + result.stderr, /fixture-password/);
});
