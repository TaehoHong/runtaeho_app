#!/bin/bash

# Auth Import Migration Script
# 이 스크립트는 이전 auth import 경로를 새로운 경로로 업데이트합니다.

echo "🔄 Auth Import Migration 시작..."

# 프로젝트 루트 디렉토리
PROJECT_ROOT="/Users/hongtaeho/running/runtaeho_app"

# 변경할 import 패턴들
declare -a OLD_PATTERNS=(
    "from '@/shared/utils/tokenUtils'"
    "from '../shared/utils/tokenUtils'"
    "from '../../shared/utils/tokenUtils'"
    "from '../../../shared/utils/tokenUtils'"
    "from '@/services/auth'"
    "from '../services/auth'"
    "from '../../services/auth'"
    "from '../../../services/auth'"
    "from '@/stores/auth'"
    "from '../stores/auth'"
    "from '../../stores/auth'"
    "from '../../../stores/auth'"
)

declare -a NEW_PATTERNS=(
    "from '@/features/auth/utils'"
    "from '@/features/auth/utils'"
    "from '@/features/auth/utils'"
    "from '@/features/auth/utils'"
    "from '@/features/auth'"
    "from '@/features/auth'"
    "from '@/features/auth'"
    "from '@/features/auth'"
    "from '@/features/auth'"
    "from '@/features/auth'"
    "from '@/features/auth'"
    "from '@/features/auth'"
)

# TypeScript/JavaScript 파일 찾기
FILES=$(find "$PROJECT_ROOT/src" -type f \( -name "*.ts" -o -name "*.tsx" -o -name "*.js" -o -name "*.jsx" \) ! -path "*/node_modules/*" ! -path "*/.git/*")

# 각 파일에서 import 경로 변경
for file in $FILES; do
    MODIFIED=false
    
    for i in "${!OLD_PATTERNS[@]}"; do
        if grep -q "${OLD_PATTERNS[$i]}" "$file"; then
            sed -i.bak "s|${OLD_PATTERNS[$i]}|${NEW_PATTERNS[$i]}|g" "$file"
            MODIFIED=true
            echo "✅ Updated: $file"
        fi
    done
    
    # 백업 파일 제거
    if [ -f "$file.bak" ]; then
        rm "$file.bak"
    fi
done

echo "✨ Auth Import Migration 완료!"
echo ""
echo "📝 다음 단계:"
echo "1. 프로젝트 빌드 테스트: npm run build"
echo "2. 린트 체크: npm run lint"
echo "3. 테스트 실행: npm test"
echo ""
echo "⚠️  레거시 디렉토리 제거 (선택사항):"
echo "  rm -rf $PROJECT_ROOT/src/services/auth"
echo "  rm -rf $PROJECT_ROOT/src/stores/auth"
