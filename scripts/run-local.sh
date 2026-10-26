#!/usr/bin/env bash
# 네이티브 placeholder를 Expo CLI가 URI scheme으로 오인하지 않도록 직접 빌드·실행한다.
set -euo pipefail
ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"
PLATFORM="${1:-}"
case "$PLATFORM" in ios|android) ;; *) echo '사용법: run-local.sh ios|android' >&2; exit 1 ;; esac
PROFILE_EXPORTS="$(node scripts/app-profile.cjs shell local)"
eval "$PROFILE_EXPORTS"
APPLICATION_ID="$(node scripts/app-profile.cjs get local applicationId)"
SCHEME="$(node scripts/app-profile.cjs get local scheme)"
URL="$SCHEME://expo-development-client/?url=http%3A%2F%2Flocalhost%3A8081"
echo '다른 터미널에서 npm start로 Metro(8081)를 실행한다.'

if [[ "$PLATFORM" == android ]]; then
  ADB="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-$HOME/Library/Android/sdk}}/platform-tools/adb"
  "$ADB" -e get-state >/dev/null
  (cd android && ./gradlew :app:assembleLocalDebug)
  "$ADB" -e reverse tcp:8081 tcp:8081
  "$ADB" -e install -r "$ROOT/android/app/build/outputs/apk/local/debug/app-local-debug.apk"
  "$ADB" -e shell am start -a android.intent.action.VIEW -d "$URL" "$APPLICATION_ID"
else
  xcrun simctl bootstatus booted -b
  xcodebuild -workspace ios/app.xcworkspace -scheme Local -configuration Debug \
    -sdk iphonesimulator -destination 'generic/platform=iOS Simulator' \
    -derivedDataPath "$ROOT/build/local/ios" build
  xcrun simctl install booted "$ROOT/build/local/ios/Build/Products/Debug-iphonesimulator/RunTaeho.app"
  xcrun simctl openurl booted "$URL"
fi
