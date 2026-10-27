#!/usr/bin/env bash
# 이 Mac의 배포 설정만 읽는다. credentials/는 Git에서 제외된다.
if [[ -f "$ROOT/credentials/deployment.sh" ]]; then
  set -a
  source "$ROOT/credentials/deployment.sh"
  set +a
fi

check_asc_api_key() {
  [[ -n "${ASC_API_KEY_PATH:-}" && -f "$ASC_API_KEY_PATH" ]] || {
    echo "ASC_API_KEY_PATH에 fastlane API key JSON 파일 경로를 지정한다." >&2
    return 1
  }
  if ! node - "$ASC_API_KEY_PATH" >/dev/null 2>&1 <<'NODE'
const fs = require('node:fs');
const key = JSON.parse(fs.readFileSync(process.argv[2], 'utf8'));
if (!key.key_id || !key.issuer_id || !key.key) process.exit(1);
NODE
  then
    echo "App Store Connect API key JSON에 key_id, issuer_id, key가 필요하다 (값은 출력하지 않음)." >&2
    return 1
  fi
}
