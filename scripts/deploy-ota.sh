#!/usr/bin/env bash
#
# 앱푸시(OTA) 배포 — JS/에셋 레이어만 교체한다.
#
# 네이티브 코드, 네이티브 의존성, 권한, 앱 아이콘, Unity 관련 변경은 이 경로로
# 나갈 수 없다. 그런 변경은 scripts/deploy-store.sh를 써야 한다.
#
#   bash scripts/deploy-ota.sh -m "결제 화면 문구 수정"
#   bash scripts/deploy-ota.sh -m "스테이징 확인" -b staging
#
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT"

BRANCH="production"
PLATFORM="all"
MESSAGE=""
ALLOW_DIRTY=0
DRY_RUN=0

die() { echo "오류: $*" >&2; exit 1; }
info() { echo "▸ $*"; }

usage() {
  cat <<'EOF'
사용법: bash scripts/deploy-ota.sh -m "<변경 요약>" [옵션]

  -m, --message <text>   업데이트 메시지 (필수)
  -b, --branch <name>    production | staging  (기본: production)
  -p, --platform <name>  all | ios | android   (기본: all)
      --allow-dirty      커밋되지 않은 변경이 있어도 진행
      --dry-run          실행할 명령만 출력
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    -m|--message) MESSAGE="${2:-}"; shift 2 ;;
    -b|--branch) BRANCH="${2:-}"; shift 2 ;;
    -p|--platform) PLATFORM="${2:-}"; shift 2 ;;
    --allow-dirty) ALLOW_DIRTY=1; shift ;;
    --dry-run) DRY_RUN=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) usage; die "알 수 없는 인자: $1" ;;
  esac
done

[[ -n "$MESSAGE" ]] || { usage; die "-m 으로 업데이트 메시지를 지정해야 한다."; }

case "$BRANCH" in
  production) ENVIRONMENT="production" ;;
  staging) ENVIRONMENT="preview" ;;
  *) die "지원하지 않는 브랜치: $BRANCH (production | staging)" ;;
esac

case "$PLATFORM" in
  all|ios|android) ;;
  *) die "지원하지 않는 플랫폼: $PLATFORM (all | ios | android)" ;;
esac

# 1. 런타임 정합 — 이 게이트가 없으면 업데이트가 조용히 유실된다.
info "런타임 버전 확인"
node scripts/version.js check-ota || die "런타임이 어긋난 상태로는 퍼블리시하지 않는다."

# 2. 작업 트리 상태. eas.json의 cli.requireCommit이 true라 EAS도 커밋을 요구한다.
if [[ $ALLOW_DIRTY -eq 0 ]] && [[ -n "$(git status --porcelain)" ]]; then
  git status --short
  die "커밋되지 않은 변경이 있다. 커밋 후 다시 실행하거나 --allow-dirty를 준다."
fi

# 3. EAS 로그인
npx eas whoami >/dev/null 2>&1 || die "EAS에 로그인되어 있지 않다. 'npx eas login' 후 다시 실행한다."

RUNTIME="$(node -p "require('./package.json').config.runtimeVersion")"
VERSION="$(node -p "require('./package.json').version")"

echo ""
info "브랜치      $BRANCH (environment: $ENVIRONMENT)"
info "플랫폼      $PLATFORM"
info "앱 버전     $VERSION"
info "런타임      $RUNTIME  ← 이 런타임으로 설치된 빌드만 업데이트를 받는다"
info "메시지      $MESSAGE"
echo ""

CMD=(npx eas update
  --branch "$BRANCH"
  --environment "$ENVIRONMENT"
  --platform "$PLATFORM"
  --message "$MESSAGE"
  --non-interactive)

if [[ $DRY_RUN -eq 1 ]]; then
  info "dry-run: ${CMD[*]}"
  exit 0
fi

"${CMD[@]}"

echo ""
info "퍼블리시 완료. 앱을 완전히 종료 후 재실행하면 적용된다."
info "되돌리려면: npx eas update:rollback --branch $BRANCH"
