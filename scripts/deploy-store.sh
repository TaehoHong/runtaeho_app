#!/usr/bin/env bash
#
# 스토어 배포 — 이 맥에서 네이티브를 빌드해 App Store Connect / Google Play에 올린다.
#
# EAS Build(원격 빌드)를 쓸 수 없기 때문에 로컬 빌드가 유일한 경로다.
# Unity 산출물이 저장소가 아니라 이 맥의 절대경로에 있고, ios/app.xcworkspace와
# android/settings.gradle이 그 경로를 직접 참조한다. 그래서 빌드는 로컬에서 하고
# 업로드만 eas submit --path 로 자동화한다.
#
#   bash scripts/deploy-store.sh --version 1.9.0
#   bash scripts/deploy-store.sh --platform ios
#   bash scripts/deploy-store.sh --platform android --no-submit
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

PLATFORM="all"
NEW_VERSION=""
BUMP_BUILD=1
SYNC_RUNTIME=1
SUBMIT=1
ALLOW_DIRTY=0
RUN_PODS=0
PREFLIGHT_ONLY=0

OUT_DIR="$ROOT/build/release"
SUBMIT_PROFILE="production"

STEP="시작"
die() { echo "오류: $*" >&2; exit 1; }
info() { echo "▸ $*"; }
step() { STEP="$1"; echo ""; echo "=== $1 ==="; }
trap 'code=$?; [[ $code -ne 0 ]] && echo "" && echo "실패한 단계: $STEP" >&2; exit $code' EXIT

usage() {
  cat <<'EOF'
사용법: bash scripts/deploy-store.sh [옵션]

  --platform <name>     all | ios | android      (기본: all)
  --version <x.y.z>     앱 버전을 이 값으로 올린다 (생략하면 현재 버전 유지)
  --no-bump             빌드번호/versionCode 증가를 건너뛴다
  --no-sync-runtime     runtimeVersion을 앱 버전에 맞추지 않는다 (같은 버전 재업로드용)
  --no-submit           빌드만 하고 스토어 업로드는 하지 않는다
  --pods                빌드 전 pod install 실행
  --allow-dirty         커밋되지 않은 변경이 있어도 진행
  --preflight-only      사전 조건만 확인하고 종료 (버전/빌드 변경 없음)

사전 준비는 docs/deployment.md 참고.
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --platform) PLATFORM="${2:-}"; shift 2 ;;
    --version) NEW_VERSION="${2:-}"; shift 2 ;;
    --no-bump) BUMP_BUILD=0; shift ;;
    --no-sync-runtime) SYNC_RUNTIME=0; shift ;;
    --no-submit) SUBMIT=0; shift ;;
    --pods) RUN_PODS=1; shift ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    --preflight-only) PREFLIGHT_ONLY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) usage; die "알 수 없는 인자: $1" ;;
  esac
done

case "$PLATFORM" in
  all|ios|android) ;;
  *) die "지원하지 않는 플랫폼: $PLATFORM (all | ios | android)" ;;
esac

want_ios() { [[ "$PLATFORM" == "all" || "$PLATFORM" == "ios" ]]; }
want_android() { [[ "$PLATFORM" == "all" || "$PLATFORM" == "android" ]]; }

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

if [[ $ALLOW_DIRTY -eq 0 ]] && [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  die "커밋되지 않은 변경이 있다. 어떤 커밋이 스토어에 올라갔는지 추적할 수 없다."
fi

npx eas whoami >/dev/null 2>&1 || die "EAS에 로그인되어 있지 않다. 'npx eas login' 후 다시 실행한다."

if want_ios; then
  command -v xcodebuild >/dev/null 2>&1 || die "xcodebuild를 찾을 수 없다."
  [[ -f "$ROOT/scripts/ExportOptions.plist" ]] || die "scripts/ExportOptions.plist가 없다."

  UNITY_IOS_PROJECT="$(sed -n 's/.*location = "absolute:\(.*\)">.*/\1/p' \
    ios/app.xcworkspace/contents.xcworkspacedata | head -1 || true)"
  [[ -n "$UNITY_IOS_PROJECT" ]] || die "워크스페이스에서 Unity 프로젝트 참조를 찾지 못했다."
  [[ -d "$UNITY_IOS_PROJECT" ]] || die "Unity iOS 프로젝트가 없다: $UNITY_IOS_PROJECT
Unity에서 iOS로 다시 export해야 한다. UnityFramework는 저장소에 없고 이 경로에서만 빌드된다."
  info "Unity iOS 프로젝트  $UNITY_IOS_PROJECT"
fi

if want_android; then
  UNITY_ANDROID_LIB="$(sed -n "s/.*project(':unityLibrary').projectDir = new File('\(.*\)').*/\1/p" \
    android/settings.gradle | head -1 || true)"
  [[ -n "$UNITY_ANDROID_LIB" ]] || die "settings.gradle에서 unityLibrary 경로를 찾지 못했다."
  [[ -d "$UNITY_ANDROID_LIB" ]] || die "Unity Android 라이브러리가 없다: $UNITY_ANDROID_LIB
Unity에서 Android로 다시 export해야 한다."
  info "Unity Android 라이브러리  $UNITY_ANDROID_LIB"

  for key in RUNTAEHO_UPLOAD_STORE_FILE RUNTAEHO_UPLOAD_STORE_PASSWORD \
             RUNTAEHO_UPLOAD_KEY_ALIAS RUNTAEHO_UPLOAD_KEY_PASSWORD; do
    has_gradle_property "$key" || die "업로드 키 서명 설정이 없다: $key
~/.gradle/gradle.properties에 4개 값을 넣어야 한다. docs/deployment.md 참고.
이 설정 없이 빌드하면 debug 키로 서명되어 Play가 거부한다."
  done
  info "업로드 키 서명 프로퍼티  확인됨"
fi

if [[ $PREFLIGHT_ONLY -eq 1 ]]; then
  echo ""
  info "프리플라이트 통과 (버전/빌드는 건드리지 않았다)"
  exit 0
fi

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
node scripts/version.js status || true

VERSION="$(node -p "require('./package.json').version")"
IOS_BUILD="$(sed -n 's/.*CURRENT_PROJECT_VERSION = \([^;]*\);.*/\1/p' \
  ios/app.xcodeproj/project.pbxproj | head -1 | tr -d ' ' || true)"
ANDROID_CODE="$(sed -n 's/.*versionCode \([0-9]*\).*/\1/p' android/app/build.gradle | head -1 || true)"

mkdir -p "$OUT_DIR/ios" "$OUT_DIR/android"

# 네이티브 빌드의 JS 번들은 .env.production을 읽는다 (Release 구성은 NODE_ENV=production).
export EXPO_PUBLIC_ENV=production

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
    -scheme app \
    -configuration Release \
    -destination 'generic/platform=iOS' \
    -archivePath "$ARCHIVE_PATH" \
    -allowProvisioningUpdates \
    archive

  info "IPA 내보내기"
  xcodebuild -exportArchive \
    -archivePath "$ARCHIVE_PATH" \
    -exportPath "$EXPORT_PATH" \
    -exportOptionsPlist scripts/ExportOptions.plist \
    -allowProvisioningUpdates

  IPA_PATH="$(find "$EXPORT_PATH" -maxdepth 1 -name '*.ipa' 2>/dev/null | head -1 || true)"
  [[ -n "$IPA_PATH" ]] || die "IPA를 찾지 못했다: $EXPORT_PATH"
  info "IPA  $IPA_PATH"
fi

# ---------------------------------------------------------------- Android

AAB_PATH=""
if want_android; then
  step "Android 빌드 ($VERSION versionCode $ANDROID_CODE)"

  (cd android && ./gradlew :app:bundleRelease)

  BUILT_AAB="$ROOT/android/app/build/outputs/bundle/release/app-release.aab"
  [[ -f "$BUILT_AAB" ]] || die "AAB를 찾지 못했다: $BUILT_AAB"

  # debug 키로 서명된 산출물이 스토어로 나가는 사고를 막는다.
  if jarsigner -verify -verbose:summary -certs "$BUILT_AAB" 2>/dev/null | grep -q "CN=Android Debug"; then
    die "AAB가 debug 키로 서명됐다. 업로드 키 설정을 확인해야 한다."
  fi

  AAB_PATH="$OUT_DIR/android/app-$VERSION-$ANDROID_CODE.aab"
  cp "$BUILT_AAB" "$AAB_PATH"
  info "AAB  $AAB_PATH"
fi

# ---------------------------------------------------------------- 제출

if [[ $SUBMIT -eq 1 ]]; then
  if [[ -n "$IPA_PATH" ]]; then
    step "App Store Connect 업로드"
    npx eas submit --platform ios --path "$IPA_PATH" \
      --profile "$SUBMIT_PROFILE" --non-interactive
  fi

  if [[ -n "$AAB_PATH" ]]; then
    step "Google Play 업로드"
    npx eas submit --platform android --path "$AAB_PATH" \
      --profile "$SUBMIT_PROFILE" --non-interactive
  fi
fi

# ---------------------------------------------------------------- 요약

step "완료"
echo "버전        $VERSION"
if [[ -n "$IPA_PATH" ]]; then
  echo "iOS         build $IOS_BUILD  →  $IPA_PATH"
fi
if [[ -n "$AAB_PATH" ]]; then
  echo "Android     versionCode $ANDROID_CODE  →  $AAB_PATH"
fi
echo ""

if [[ $SUBMIT -eq 1 ]]; then
  echo "남은 수동 단계:"
  if [[ -n "$IPA_PATH" ]]; then
    cat <<'EOF'
  - iOS: 처리(10~15분) 후 TestFlight에 올라온다. 실제 출시는 App Store Connect에서
    버전을 만들고 심사 제출해야 한다. eas submit은 업로드까지만 한다.
EOF
  fi
  if [[ -n "$AAB_PATH" ]]; then
    cat <<'EOF'
  - Android: eas.json 설정대로 internal 트랙에 draft로 올라간다. Play Console에서
    검토 후 트랙/롤아웃을 진행한다.
EOF
  fi
fi

echo ""
echo "버전 변경이 커밋되지 않았다면 지금 커밋해 둔다:"
echo "  git add package.json ios android && git commit -m \"chore: release $VERSION\""
