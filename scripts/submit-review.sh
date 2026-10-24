#!/usr/bin/env bash
# 업로드가 처리된 정확한 버전/빌드를 심사에 제출한다. 승인 후 출시는 수동이다.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
VERSION="${1:-}"
BUILD="${2:-}"
[[ "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ && "$BUILD" =~ ^[0-9]+$ ]] || {
  echo "사용법: ASC_API_KEY_PATH=<외부 API key JSON> bash scripts/submit-review.sh <version> <build>" >&2
  exit 1
}
[[ -n "${ASC_API_KEY_PATH:-}" && -f "$ASC_API_KEY_PATH" ]] || {
  echo "ASC_API_KEY_PATH에 fastlane API key JSON 파일 경로를 지정한다 (저장소 외부)." >&2
  exit 1
}
command -v fastlane >/dev/null || { echo "설치된 fastlane이 필요하다." >&2; exit 1; }
METADATA_ARGS=(--skip_metadata)
if [[ -n "${ASC_METADATA_PATH:-}" ]]; then
  [[ -d "$ASC_METADATA_PATH" ]] || { echo "ASC_METADATA_PATH 디렉터리가 없다." >&2; exit 1; }
  METADATA_ARGS=(--metadata_path "$ASC_METADATA_PATH")
fi
export FASTLANE_SKIP_UPDATE_CHECK=1 FASTLANE_HIDE_CHANGELOG=1
fastlane deliver --api_key_path "$ASC_API_KEY_PATH" \
  --app_identifier com.runtaeho.runtaeho --app_version "$VERSION" --build_number "$BUILD" \
  --skip_binary_upload "${METADATA_ARGS[@]}" --skip_screenshots \
  --submit_for_review --automatic_release false --force \
  --precheck_include_in_app_purchases false
