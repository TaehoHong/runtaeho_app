#!/usr/bin/env bash
#
# 스토어 배포 — 이 맥에서 네이티브를 빌드해 App Store Connect / Google Play에 올린다.
#
# EAS Build(원격 빌드)를 쓸 수 없기 때문에 로컬 빌드가 유일한 경로다.
# Unity 산출물이 저장소가 아니라 이 맥의 절대경로에 있고, ios/app.xcworkspace와
# android/settings.gradle이 그 경로를 직접 참조한다. 그래서 빌드는 로컬에서 하고
# Android 운영 업로드는 EAS Submit, iOS는 API key 기반 fastlane을 사용한다.
#
#   bash scripts/deploy-store.sh --version 1.9.0
#   bash scripts/deploy-store.sh --platform ios
#   bash scripts/deploy-store.sh --platform android --no-submit
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PLATFORM="all"
PROFILE="production"
NEW_VERSION=""
BUMP_BUILD=1
SYNC_RUNTIME=1
SUBMIT=1
ALLOW_DIRTY=0
RUN_PODS=0
PREFLIGHT_ONLY=0
RESUME=0
SUBMIT_REVIEW=0
LOCK_HELD=0
LOCK_DIR="$ROOT/build/deploy.lock"

OUT_DIR="$ROOT/build/release"

STEP="시작"
die() { echo "오류: $*" >&2; exit 1; }
info() { echo "▸ $*"; }
step() { STEP="$1"; echo ""; echo "=== $1 ==="; }
finish() {
  local code=$?
  trap - EXIT
  if [[ $LOCK_HELD -eq 1 ]]; then
    rmdir "$LOCK_DIR" || { echo "배포 잠금 해제 실패: $LOCK_DIR" >&2; code=1; }
  fi
  if [[ $code -ne 0 ]]; then echo "실패한 단계: $STEP" >&2; fi
  exit "$code"
}
trap finish EXIT
trap 'exit 130' INT
trap 'exit 143' TERM

usage() {
  cat <<'EOF'
사용법: bash scripts/deploy-store.sh [옵션]

  --profile <name>      development | production (기본: production)
  --platform <name>     all | ios | android      (기본: all)
  --version <x.y.z>     앱 버전을 이 값으로 올린다 (생략하면 현재 버전 유지)
  --no-bump             빌드번호/versionCode 증가를 건너뛴다
  --no-sync-runtime     runtimeVersion을 앱 버전에 맞추지 않는다 (같은 버전 재업로드용)
  --no-submit           빌드만 하고 스토어 업로드는 하지 않는다
  --pods                빌드 전 pod install 실행
  --allow-dirty         커밋되지 않은 변경이 있어도 진행
  --preflight-only      사전 조건만 확인하고 종료 (버전/빌드 변경 없음)
  --resume              실패한 빌드 재시도 (소스 동일 여부 확인, 버전 증가 없음)
  --submit-review       iOS 업로드 후 해당 버전/빌드를 심사에 제출 (승인 후 수동 출시)

사전 준비는 docs/deployment.md 참고.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --profile) PROFILE="${2:-}"; shift 2 ;;
    --platform) PLATFORM="${2:-}"; shift 2 ;;
    --version) NEW_VERSION="${2:-}"; shift 2 ;;
    --no-bump) BUMP_BUILD=0; shift ;;
    --no-sync-runtime) SYNC_RUNTIME=0; shift ;;
    --no-submit) SUBMIT=0; shift ;;
    --pods) RUN_PODS=1; shift ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    --preflight-only) PREFLIGHT_ONLY=1; shift ;;
    --resume) RESUME=1; BUMP_BUILD=0; SYNC_RUNTIME=0; shift ;;
    --submit-review) SUBMIT_REVIEW=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) usage; die "알 수 없는 인자: $1" ;;
  esac
done

case "$PLATFORM" in
  all|ios|android) ;;
  *) die "지원하지 않는 플랫폼: $PLATFORM (all | ios | android)" ;;
esac

case "$PROFILE" in
  production) ;;
  development) OUT_DIR="$ROOT/build/development" ;;
  *) die "지원하지 않는 배포 프로파일: $PROFILE (development | production)" ;;
esac
[[ "$PROFILE" == production || $SUBMIT_REVIEW -eq 0 ]] || die "개발 앱은 운영 심사에 제출하지 않는다."
source "$ROOT/scripts/deployment-config.sh"
IOS_CONFIGURATION="$(node scripts/app-profile.cjs get "$PROFILE" iosConfiguration)"
IOS_SCHEME="$(node scripts/app-profile.cjs get "$PROFILE" iosScheme)"

want_ios() { [[ "$PLATFORM" == "all" || "$PLATFORM" == "ios" ]]; }
want_android() { [[ "$PLATFORM" == "all" || "$PLATFORM" == "android" ]]; }

[[ $RESUME -eq 0 || -z "$NEW_VERSION" ]] || die "--resume과 --version은 함께 사용할 수 없다."
if [[ $SUBMIT_REVIEW -eq 1 ]]; then
  want_ios && [[ $SUBMIT -eq 1 ]] || die "--submit-review는 iOS 업로드와 함께 사용한다."
  command -v fastlane >/dev/null || die "설치된 fastlane이 필요하다."
  check_asc_api_key || exit 1
  FASTLANE_SKIP_UPDATE_CHECK=1 FASTLANE_HIDE_CHANGELOG=1 fastlane production_preflight || die "운영 App Store Connect 앱과 API key 접근 권한을 확인한다."
fi

# gradle 프로퍼티가 ~/.gradle/gradle.properties 또는 ORG_GRADLE_PROJECT_* 로 있는지 확인
has_gradle_property() {
  local key="$1"
  local env_name="ORG_GRADLE_PROJECT_${key}"
  [[ -n "${!env_name:-}" ]] && return 0
  [[ -f "$HOME/.gradle/gradle.properties" ]] && grep -q "^${key}=" "$HOME/.gradle/gradle.properties"
}

# ---------------------------------------------------------------- 프리플라이트

step "프리플라이트"

BRANCH_NAME="$(git rev-parse --abbrev-ref HEAD)"
[[ "$BRANCH_NAME" == "main" ]] || info "경고: 현재 브랜치가 $BRANCH_NAME 이다 (스토어 배포는 보통 main)"

if [[ $RESUME -eq 1 ]]; then
  node scripts/release-state.cjs check "$PLATFORM" "$PROFILE"
elif [[ $ALLOW_DIRTY -eq 0 ]] && [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  die "커밋되지 않은 변경이 있다. 어떤 커밋이 스토어에 올라갔는지 추적할 수 없다."
fi

# 빌드와 OTA에서 앱 모드를 명시한다. 백엔드 주소는 현재 공유 서버를 유지한다.
PROFILE_EXPORTS="$(node scripts/app-profile.cjs shell "$PROFILE")"
eval "$PROFILE_EXPORTS"
node scripts/check-env.cjs remote "$PROFILE"
[[ -n "${SENTRY_AUTH_TOKEN:-}" ]] || die "SENTRY_AUTH_TOKEN을 셸 환경변수로 주입한다 (저장소에 저장하지 않음)."

if want_ios; then
  command -v xcodebuild >/dev/null 2>&1 || die "xcodebuild를 찾을 수 없다."
  python3 scripts/sign-ios.py preflight "$PROFILE"
  [[ -f "$ROOT/scripts/ExportOptions.plist" ]] || die "scripts/ExportOptions.plist가 없다."
  xcodebuild -workspace ios/app.xcworkspace -scheme "$IOS_SCHEME" -configuration "$IOS_CONFIGURATION" \
    -destination 'generic/platform=iOS' -showBuildSettings >/dev/null 2>&1 || \
    die "Xcode의 iOS 플랫폼 설치와 선택한 스킴·구성을 확인한다 (Xcode > Settings > Components)."

  UNITY_IOS_PROJECT="$(sed -n 's/.*location = "absolute:\(.*\)">.*/\1/p' \
    ios/app.xcworkspace/contents.xcworkspacedata | head -1 || true)"
  [[ -n "$UNITY_IOS_PROJECT" ]] || die "워크스페이스에서 Unity 프로젝트 참조를 찾지 못했다."
  [[ -d "$UNITY_IOS_PROJECT" ]] || die "Unity iOS 프로젝트가 없다: $UNITY_IOS_PROJECT
Unity에서 iOS로 다시 export해야 한다. UnityFramework는 저장소에 없고 이 경로에서만 빌드된다."
  info "Unity iOS 프로젝트  $UNITY_IOS_PROJECT"
  node scripts/check-unity.cjs ios "$(dirname "$UNITY_IOS_PROJECT")"
fi

if want_android; then
  UNITY_ANDROID_LIB="$(sed -n "s/.*project(':unityLibrary').projectDir = new File('\(.*\)').*/\1/p" \
    android/settings.gradle | head -1 || true)"
  [[ -n "$UNITY_ANDROID_LIB" ]] || die "settings.gradle에서 unityLibrary 경로를 찾지 못했다."
  [[ -d "$UNITY_ANDROID_LIB" ]] || die "Unity Android 라이브러리가 없다: $UNITY_ANDROID_LIB
Unity에서 Android로 다시 export해야 한다."
  info "Unity Android 라이브러리  $UNITY_ANDROID_LIB"
  node scripts/check-unity.cjs android "$(dirname "$UNITY_ANDROID_LIB")"

  if [[ "$PROFILE" == development ]]; then
    [[ -f "$CREDENTIALS_DIR/android-development.properties" ]] || die "npm run signing:dev:android로 개발 서명키를 먼저 준비한다."
  else
  for key in RUNTAEHO_UPLOAD_STORE_FILE RUNTAEHO_UPLOAD_STORE_PASSWORD \
             RUNTAEHO_UPLOAD_KEY_ALIAS RUNTAEHO_UPLOAD_KEY_PASSWORD; do
    has_gradle_property "$key" || die "업로드 키 서명 설정이 없다: $key
~/.gradle/gradle.properties에 4개 값을 넣어야 한다. docs/deployment.md 참고.
이 설정 없이 빌드하면 debug 키로 서명되어 Play가 거부한다."
  done
  info "업로드 키 서명 프로퍼티  확인됨"
  fi
fi

if [[ $SUBMIT -eq 1 ]]; then
  if want_ios; then bash scripts/submit-store.sh --profile "$PROFILE" --platform ios --preflight-only; fi
  if want_android; then bash scripts/submit-store.sh --profile "$PROFILE" --platform android --preflight-only; fi
fi

if [[ $PREFLIGHT_ONLY -eq 1 ]]; then
  echo ""
  info "프리플라이트 통과 (버전/빌드는 건드리지 않았다)"
  exit 0
fi

mkdir -p "$ROOT/build"
mkdir "$LOCK_DIR" 2>/dev/null || die "다른 배포가 실행 중이다. 종료된 작업이라면 build/deploy.lock을 확인한다."
LOCK_HELD=1

# ---------------------------------------------------------------- 버전

step "버전 반영"

if [[ -n "$NEW_VERSION" ]]; then
  node scripts/version.js set "$NEW_VERSION"
fi
if [[ $SYNC_RUNTIME -eq 1 ]]; then
  node scripts/version.js sync-runtime
else
  info "runtimeVersion 동기화 건너뜀"
fi
if [[ $BUMP_BUILD -eq 1 ]]; then
  node scripts/version.js bump-build "$PLATFORM"
else
  info "빌드번호 증가 건너뜀"
fi

echo ""
node scripts/version.js status
# 버전 변경 후의 상태를 기록하여 실패 시 같은 소스로만 재시도한다.
node scripts/release-state.cjs save "$PLATFORM" "$PROFILE"

VERSION="$(node -p "require('./package.json').version")"
IOS_BUILD="$(sed -n 's/.*CURRENT_PROJECT_VERSION = \([^;]*\);.*/\1/p' \
  ios/app.xcodeproj/project.pbxproj | head -1 | tr -d ' ' || true)"
ANDROID_CODE="$(sed -n 's/.*versionCode \([0-9]*\).*/\1/p' android/app/build.gradle | head -1 || true)"

mkdir -p "$OUT_DIR/ios" "$OUT_DIR/android"

# 서버 환경은 앞에서 선택한 프로파일을 유지한다. 개발 앱도 Release 번들을 사용한다.
export EXPO_PUBLIC_ENV="$PROFILE"

# ---------------------------------------------------------------- iOS

IPA_PATH=""
if want_ios; then
  step "iOS 빌드 ($VERSION build $IOS_BUILD)"

  if [[ $RUN_PODS -eq 1 ]]; then
    info "pod install"
    (cd ios && pod install)
  fi

  ARCHIVE_PATH="$OUT_DIR/ios/app-$VERSION-$IOS_BUILD.xcarchive"
  EXPORT_PATH="$OUT_DIR/ios/export-$VERSION-$IOS_BUILD"
  rm -rf "$ARCHIVE_PATH" "$EXPORT_PATH"

  info "아카이브 (Unity 프로젝트가 워크스페이스에 포함되어 함께 빌드된다)"
  xcodebuild \
    -workspace ios/app.xcworkspace \
    -scheme "$IOS_SCHEME" \
    -configuration "$IOS_CONFIGURATION" \
    -destination 'generic/platform=iOS' \
    -archivePath "$ARCHIVE_PATH" \
    CODE_SIGNING_ALLOWED=NO \
    archive

  info "IPA 내보내기"
  python3 scripts/sign-ios.py export "$PROFILE" "$ARCHIVE_PATH" "$EXPORT_PATH"

  IPA_PATH="$(find "$EXPORT_PATH" -maxdepth 1 -name '*.ipa' 2>/dev/null | head -1 || true)"
  [[ -n "$IPA_PATH" ]] || die "IPA를 찾지 못했다: $EXPORT_PATH"
  info "IPA  $IPA_PATH"
fi

# ---------------------------------------------------------------- Android

ANDROID_PATH=""
if want_android; then
  step "Android 빌드 ($VERSION versionCode $ANDROID_CODE)"

  if [[ "$PROFILE" == development ]]; then
    (cd android && ./gradlew :app:assembleDevelopmentRelease)
    BUILT_ANDROID="$ROOT/android/app/build/outputs/apk/development/release/app-development-release.apk"
    ANDROID_PATH="$OUT_DIR/android/app-$VERSION-$ANDROID_CODE.apk"
  else
    (cd android && ./gradlew :app:bundleProductionRelease)
    BUILT_ANDROID="$ROOT/android/app/build/outputs/bundle/productionRelease/app-production-release.aab"
    ANDROID_PATH="$OUT_DIR/android/app-$VERSION-$ANDROID_CODE.aab"
    bash scripts/verify-aab.sh "$BUILT_ANDROID"
  fi
  [[ -f "$BUILT_ANDROID" ]] || die "Android 산출물을 찾지 못했다: $BUILT_ANDROID"
  cp "$BUILT_ANDROID" "$ANDROID_PATH"
  info "Android  $ANDROID_PATH"
fi

# ---------------------------------------------------------------- 제출

if [[ $SUBMIT -eq 1 ]]; then
  if [[ -n "$IPA_PATH" ]]; then
    step "App Store Connect 업로드"
    bash scripts/submit-store.sh --profile "$PROFILE" --platform ios --path "$IPA_PATH"
  fi

  if [[ -n "$ANDROID_PATH" ]]; then
    if [[ "$PROFILE" == development ]]; then step "Firebase App Distribution 업로드"; else step "Google Play 업로드"; fi
    bash scripts/submit-store.sh --profile "$PROFILE" --platform android --path "$ANDROID_PATH"
  fi
  if [[ -n "$IPA_PATH" && $SUBMIT_REVIEW -eq 1 ]]; then
    step "iOS 심사 제출"
    bash scripts/submit-review.sh "$VERSION" "$IOS_BUILD"
  fi
fi

# ---------------------------------------------------------------- 요약

step "완료"
echo "버전        $VERSION"
if [[ -n "$IPA_PATH" ]]; then
  echo "iOS         build $IOS_BUILD  →  $IPA_PATH"
fi
if [[ -n "$ANDROID_PATH" ]]; then
  echo "Android     versionCode $ANDROID_CODE  →  $ANDROID_PATH"
fi
echo ""

if [[ $SUBMIT -eq 1 && "$PROFILE" == development ]]; then
  [[ -z "$IPA_PATH" ]] || echo "iOS 개발 앱: TestFlight 내부 그룹 배포 완료"
  [[ -z "$ANDROID_PATH" ]] || echo "Android 개발 앱: Firebase 테스터 그룹 배포 완료"
elif [[ $SUBMIT -eq 1 ]]; then
  echo "남은 수동 단계:"
  if [[ -n "$IPA_PATH" ]]; then
    if [[ $SUBMIT_REVIEW -eq 1 ]]; then
      echo "  - iOS: 심사 제출 완료. 승인 후 App Store Connect에서 수동 출시한다."
    else
      echo "  - iOS: Apple 처리 후 npm run submit:review:ios -- $VERSION $IOS_BUILD 로 심사에 제출한다."
    fi
  fi
  if [[ -n "$ANDROID_PATH" ]]; then
    node -e 'const s=require("./eas.json").submit.production.android; console.log(`  - Android: ${s.track} / ${s.releaseStatus}. 실제 공개 시점은 Play 심사 및 게시 설정에 따른다.`)'
  fi
fi

echo ""
echo "버전 변경이 커밋되지 않았다면 지금 커밋해 둔다:"
echo "  git add package.json ios android && git commit -m \"chore: release $VERSION\""
