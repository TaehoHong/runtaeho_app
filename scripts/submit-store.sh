#!/usr/bin/env bash
# 이미 만든 산출물만 업로드한다. 버전 변경/Unity export/네이티브 빌드 없음.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PLATFORM=""
PROFILE="production"
ARTIFACT=""
PREFLIGHT_ONLY=0
die() { echo "오류: $*" >&2; exit 1; }
while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform) PLATFORM="${2:?플랫폼 필요}"; shift 2 ;;
    --profile) PROFILE="${2:?프로파일 필요}"; shift 2 ;;
    --path) ARTIFACT="${2:?산출물 경로 필요}"; shift 2 ;;
    --preflight-only) PREFLIGHT_ONLY=1; shift ;;
    *) die "사용법: submit-store.sh --platform ios|android [--profile development|production] --path <ipa|aab|apk> [--preflight-only]" ;;
  esac
done
case "$PROFILE:$PLATFORM" in
  development:ios|development:android|production:ios|production:android) ;;
  *) die "개발/운영 프로파일과 ios/android 플랫폼을 지정한다." ;;
esac
if [[ $PREFLIGHT_ONLY -eq 0 ]]; then
  case "$PROFILE:$PLATFORM:$ARTIFACT" in
    development:android:*.apk|development:ios:*.ipa|production:android:*.aab|production:ios:*.ipa) ;;
    *) die "배포 프로파일·플랫폼과 산출물 확장자가 다르다." ;;
  esac
  [[ -f "$ARTIFACT" ]] || die "산출물이 없다: $ARTIFACT"
fi
source "$ROOT/scripts/deployment-config.sh"

if [[ "$PROFILE" == development && "$PLATFORM" == android ]]; then
  [[ -n "${FIREBASE_PROJECT_ID:-}" ]] || die "FIREBASE_PROJECT_ID를 설정한다."
  [[ -n "${FIREBASE_ANDROID_APP_ID:-}" ]] || die "FIREBASE_ANDROID_APP_ID에 .dev 앱의 Firebase App ID를 설정한다."
  [[ -n "${FIREBASE_TESTER_GROUPS:-}" ]] || die "FIREBASE_TESTER_GROUPS에 테스터 그룹 별칭을 설정한다."
  command -v firebase >/dev/null || die "Firebase CLI가 필요하다. docs/deployment.md의 1회 설정을 확인한다."
  FIREBASE_APPS="$(firebase apps:list ANDROID --project "$FIREBASE_PROJECT_ID" --json 2>/dev/null)" || die "Firebase 로그인·서비스 계정과 프로젝트 접근 권한을 확인한다."
  APP_IDENTIFIER="$(node scripts/app-profile.cjs get development applicationId)"
  printf '%s' "$FIREBASE_APPS" | node -e '
    const data = JSON.parse(require("node:fs").readFileSync(0, "utf8"));
    if (!Array.isArray(data.result) || !data.result.some(app =>
      app.appId === process.argv[1] && app.packageName === process.argv[2])) process.exit(1);
  ' "$FIREBASE_ANDROID_APP_ID" "$APP_IDENTIFIER" >/dev/null 2>&1 || die "Firebase App ID가 선택한 프로젝트의 .dev Android 앱과 일치하지 않는다."
  [[ $PREFLIGHT_ONLY -eq 0 ]] || exit 0
  firebase appdistribution:distribute "$ARTIFACT" --project "$FIREBASE_PROJECT_ID" \
    --app "$FIREBASE_ANDROID_APP_ID" --groups "$FIREBASE_TESTER_GROUPS"
elif [[ "$PLATFORM" == ios ]]; then
  command -v fastlane >/dev/null || die "설치된 fastlane이 필요하다."
  check_asc_api_key || exit 1
  APP_IDENTIFIER="$(node scripts/app-profile.cjs get "$PROFILE" applicationId)"
  export FASTLANE_SKIP_UPDATE_CHECK=1 FASTLANE_HIDE_CHANGELOG=1
  if [[ "$PROFILE" == development ]]; then
    [[ -n "${TESTFLIGHT_DEV_GROUPS:-}" ]] || die "App Store Connect에서 .dev 앱·TestFlight 내부 그룹을 등록하고 TESTFLIGHT_DEV_GROUPS에 그룹 이름을 설정한다."
    fastlane development_preflight || die "https://appstoreconnect.apple.com/apps 에서 .dev 앱·내부 그룹과 API key 접근 권한을 확인한다."
  else
    fastlane production_preflight || die "https://appstoreconnect.apple.com/apps 에서 운영 앱과 API key 접근 권한을 확인한다."
  fi
  [[ $PREFLIGHT_ONLY -eq 0 ]] || exit 0
  if [[ "$PROFILE" == development ]]; then
    fastlane pilot upload --api_key_path "$ASC_API_KEY_PATH" \
      --app_identifier "$APP_IDENTIFIER" --ipa "$ARTIFACT" --groups "$TESTFLIGHT_DEV_GROUPS" \
      --distribute_external false --submit_beta_review false --skip_submission false --skip_waiting_for_build_processing false \
      || die "App Store Connect가 개발 배포를 거부했다. 위 서버 오류를 확인하고 콘솔에서 필요한 항목을 처리한다."
  else
    fastlane pilot upload --api_key_path "$ASC_API_KEY_PATH" \
      --app_identifier "$APP_IDENTIFIER" --ipa "$ARTIFACT" --skip_waiting_for_build_processing true --skip_submission true \
      || die "App Store Connect가 업로드를 거부했다. 위 서버 오류를 확인하고 콘솔에서 필요한 항목을 처리한다."
  fi
else
  if [[ $PREFLIGHT_ONLY -eq 1 ]]; then
    npx --no-install eas whoami >/dev/null 2>&1 || die "EAS 로그인 또는 네트워크를 확인한다."
    exit 0
  fi
  bash scripts/verify-aab.sh "$ARTIFACT"
  node -e 'const s=require("./eas.json").submit.production.android; console.log(`Google Play: track=${s.track}, releaseStatus=${s.releaseStatus}, rollout=${s.rollout ?? "default"}`)'
  npx eas submit --platform "$PLATFORM" --path "$ARTIFACT" --profile production --non-interactive \
    || die "Google Play 제출이 실패했다. 위 서버 오류와 https://play.google.com/console 의 필요한 항목을 확인한다."
fi
