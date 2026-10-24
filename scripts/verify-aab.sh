#!/usr/bin/env bash
set -euo pipefail
[[ -f "${1:-}" ]] || { echo "검증할 AAB가 없다." >&2; exit 1; }
REPORT="$(LC_ALL=C jarsigner -verify -verbose:summary -certs "$1" 2>/dev/null)" || {
  echo "AAB 서명 검증 실패" >&2; exit 1;
}
if ! grep -q 'jar verified\.' <<< "$REPORT" || grep -q 'CN=Android Debug' <<< "$REPORT"; then
  echo "서명되지 않았거나 debug 키로 서명된 AAB는 제출하지 않는다." >&2
  exit 1
fi
