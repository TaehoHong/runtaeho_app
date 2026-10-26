#!/usr/bin/env bash
# Xcode의 직접 빌드에도 CLI와 같은 앱/서버 프로파일을 적용한다.
set -e
if [[ -f "$PROJECT_DIR/.xcode.env" ]]; then source "$PROJECT_DIR/.xcode.env"; fi
if [[ -f "$PROJECT_DIR/.xcode.env.local" ]]; then source "$PROJECT_DIR/.xcode.env.local"; fi
case "$CONFIGURATION" in
  Debug) RUNTAEHO_PROFILE=local ;;
  Development) RUNTAEHO_PROFILE=development ;;
  Release) RUNTAEHO_PROFILE=production ;;
  *) echo "지원하지 않는 Xcode 앱 구성" >&2; exit 1 ;;
esac
PROFILE_EXPORTS="$("${NODE_BINARY:-node}" "$PROJECT_DIR/../scripts/app-profile.cjs" shell "$RUNTAEHO_PROFILE")"
eval "$PROFILE_EXPORTS"
