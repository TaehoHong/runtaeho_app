# Auth Feature Module

Auth 관련 모든 코드가 이제 `/src/features/auth`에 통합되었습니다.

## 📁 디렉토리 구조

```
src/features/auth/
├── constants/       # 인증 관련 상수
├── hooks/          # React hooks (useAuthSignIn, authQueries 등)
├── models/         # 데이터 모델 및 타입 정의
├── services/       # API 서비스 및 비즈니스 로직
├── stores/         # 상태 관리 (Zustand)
├── strategies/     # 인증 전략 (Google, Apple 등)
├── utils/          # 유틸리티 함수 (tokenUtils 등)
├── viewmodels/     # ViewModel 패턴
└── views/          # React 컴포넌트 및 화면

```

## 🔄 마이그레이션 가이드

### 이전 경로 → 새로운 경로

```typescript
// ❌ 이전 (deprecated)
import { tokenUtils } from '@/shared/utils/tokenUtils';
import { authService } from '@/services/auth';
import { useAuthStore } from '@/stores/auth';

// ✅ 새로운 경로
import { tokenUtils } from '@/features/auth/utils';
import { authService } from '@/features/auth/services';
import { useAuthStore } from '@/features/auth/stores';

// 또는 한번에
import { tokenUtils, authService, useAuthStore } from '@/features/auth';
```

## ⚠️ Backward Compatibility

레거시 경로들은 현재 유지되고 있지만, 새로운 코드에서는 사용하지 마세요:
- `/src/services/auth/index.ts` - re-export only
- `/src/stores/auth/index.ts` - re-export only

이 파일들은 추후 제거될 예정입니다.

## 📝 주요 변경 사항

1. **tokenUtils 이동**: `/src/shared/utils/tokenUtils.ts` → `/src/features/auth/utils/tokenUtils.ts`
2. **백업 파일 정리**: 모든 `.backup` 파일들을 `/.backup` 디렉토리로 이동
3. **Export 통합**: `/src/features/auth/index.ts`에서 모든 auth 모듈을 export

## 🏗️ Feature-based Architecture

이 구조는 Feature-based Architecture를 따릅니다:
- 각 feature는 독립적으로 작동 가능
- 관련된 모든 코드가 한 곳에 위치
- 높은 응집도와 낮은 결합도
