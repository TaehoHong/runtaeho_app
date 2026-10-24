#!/usr/bin/env bash
# 이미 만든 산출물만 업로드한다. 버전 변경/Unity export/네이티브 빌드 없음.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PLATFORM=""
ARTIFACT=""
while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform) PLATFORM="${2:?플랫폼 필요}"; shift 2 ;;
    --path) ARTIFACT="${2:?산출물 경로 필요}"; shift 2 ;;
    *) echo "사용법: bash scripts/submit-store.sh --platform ios|android --path <ipa|aab>" >&2; exit 1 ;;
  esac
done
case "$PLATFORM:$ARTIFACT" in
  ios:*.ipa|android:*.aab) ;;
  *) echo "플랫폼과 산출물 확장자를 확인한다 (--platform ios|android --path <ipa|aab>)." >&2; exit 1 ;;
esac
[[ -f "$ARTIFACT" ]] || { echo "산출물이 없다: $ARTIFACT" >&2; exit 1; }
if [[ "$PLATFORM" == android ]]; then
  bash scripts/verify-aab.sh "$ARTIFACT"
  node -e 'const s=require("./eas.json").submit.production.android; console.log(`Google Play: track=${s.track}, releaseStatus=${s.releaseStatus}, rollout=${s.rollout ?? "default"}`)'
else
  echo "App Store Connect 업로드 (심사 제출: npm run submit:review:ios -- <version> <build>)"
fi
npx eas submit --platform "$PLATFORM" --path "$ARTIFACT" --profile production --non-interactive
