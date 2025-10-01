# Redux + RTK Query → Zustand + React Query 마이그레이션 완료

## 📋 개요

본 프로젝트는 Redux Toolkit + RTK Query에서 Zustand + React Query로 마이그레이션되었습니다.

마이그레이션 완료 날짜: 2025-10-01

## ✅ 완료된 작업

### Phase 1: ViewModel의 RTK Query → React Query 마이그레이션

**변경된 파일:**
- ✅ `RunningViewModel.ts` - Running mutations (start, end, update, delete)
- ✅ `RunningRecordViewModel.ts` - Running queries (list, infinite scroll)
- ✅ `AvatarViewModel.ts` - Avatar mutations (update, purchase, remove)
- ✅ `ItemViewModel.ts` - Item queries & mutations
- ✅ `PointViewModel.ts` - Point queries & mutations
- ✅ `ShoeViewModel.ts` - Shoe queries & mutations
- ✅ `StatisticViewModel.ts` - Statistics queries
- ✅ `PersonalRecordsViewModel.ts` - Personal records queries
- ✅ `TrendsViewModel.ts` - Trends queries

**주요 변경 사항:**
```typescript
// Before (RTK Query)
import { useStartRunningMutation } from '../../../store/api/runningApi';
const [startRunningMutation, { isLoading }] = useStartRunningMutation();
const result = await startRunningMutation().unwrap();

// After (React Query)
import { useStartRunning } from '../../../services/running';
const { mutateAsync: startRunningMutation, isPending } = useStartRunning();
const result = await startRunningMutation(); // unwrap() 불필요
```

### Phase 2: Zustand에서 비동기 로직 분리

**변경된 파일:**
- ✅ `src/stores/unity/unityStore.ts` - 비동기 로직 제거, 상태만 관리
- ✅ `src/features/unity/viewmodels/UnityViewModel.ts` - 비동기 로직 담당

**책임 분리:**
```typescript
// Before (❌ 문제)
export const useUnityStore = create((set) => ({
  setCharacterSpeed: async (speed) => {
    // Zustand에 비동기 로직이 섞여있음
    const service = getUnityBridgeService();
    await service.setCharacterSpeed(speed);
  }
}));

// After (✅ 개선)
// 1. Zustand: 상태만 관리
export const useUnityStore = create((set) => ({
  characterState: null,
  updateCharacterState: (state) => set({ characterState: state }),
}));

// 2. ViewModel: 비즈니스 로직 & 비동기 작업
export const useUnityViewModel = () => {
  const updateCharacterState = useUnityStore(s => s.updateCharacterState);

  const setCharacterSpeed = async (speed) => {
    const service = getUnityBridgeService();
    await service.setCharacterSpeed(speed);
    updateCharacterState({ speed });
  };

  return { setCharacterSpeed };
};
```

### Phase 3: Store 구조 정리 및 최적화

**변경된 파일:**
- ✅ `src/stores/auth/authStore.ts` - 인증 플로우만 관리 (로딩, 에러)
- ✅ `src/stores/user/userStore.ts` - 사용자 데이터, 토큰, 로그인 상태 관리 (주 Store)
- ✅ 불필요한 Selector 함수 제거

### Phase 4: UserStateManager 마이그레이션

**변경된 파일:**
- ✅ `src/shared/services/userStateManager.ts` - Redux → Zustand 완전 마이그레이션
- ✅ `app/(tabs)/_layout.tsx` - Redux selector → Zustand hook 변경
- ✅ `src/features/running/views/RunningView.tsx` - Redux → Zustand 변경

**중복 제거:**

| 필드 | Before | After |
|------|--------|-------|
| `isLoggedIn` | AuthStore + UserStore | UserStore만 |
| `accessToken` | AuthStore + UserStore | UserStore만 |
| `refreshToken` | AuthStore + UserStore | UserStore만 |
| `currentUser` | AuthStore(UserAuthData) + UserStore(User) | UserStore만 |
| `isLoading` | AuthStore + UserStore | UserStore (데이터 로딩), AuthStore (인증 플로우 로딩) |

**최종 Store 구조:**

```typescript
// AuthStore: 인증 플로우만
interface AuthState {
  isLoading: boolean;  // 인증 요청 진행 중
  error: string | null;
}

// UserStore: 사용자 데이터 (주 Store)
interface UserState {
  isLoggedIn: boolean;
  currentUser: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  totalPoint: number;
  avatarId: number;
  // ... 기타 사용자 관련 상태
}

// AppStore: 앱 전역 UI 상태
interface AppState {
  viewState: ViewState;
  runningState: RunningState;
}

// UnityStore: Unity 연동 상태 (비동기 로직은 ViewModel로 분리)
interface UnityState {
  isConnected: boolean;
  characterState: CharacterState | null;
  currentAvatar: AvatarData | null;
}
```

## 📁 새로운 파일 구조

```
src/
├── stores/                    # Zustand Stores (상태 관리만)
│   ├── auth/
│   │   ├── authStore.ts
│   │   └── index.ts
│   ├── user/
│   │   ├── userStore.ts
│   │   └── index.ts
│   ├── app/
│   │   ├── appStore.ts
│   │   └── index.ts
│   ├── unity/
│   │   ├── unityStore.ts
│   │   └── index.ts
│   └── index.ts
│
├── services/                  # React Query (서버 상태)
│   ├── auth/
│   │   ├── authService.ts     # API 호출
│   │   ├── authQueries.ts     # React Query hooks
│   │   └── index.ts
│   ├── user/
│   │   ├── userService.ts
│   │   ├── userQueries.ts
│   │   └── index.ts
│   ├── running/
│   ├── avatar/
│   ├── point/
│   ├── shoe/
│   ├── statistics/
│   ├── api/                   # Axios client & config
│   └── queryClient.ts         # React Query 설정
│
├── features/
│   └── */viewmodels/          # ViewModel (비즈니스 로직)
│
└── store/                     # ⚠️ 레거시 (삭제 예정)
    ├── api/                   # RTK Query (더 이상 사용 안함)
    └── slices/                # Redux slices (더 이상 사용 안함)
```

## 🎯 현업 Best Practice 적용

### 1. 책임 분리 (Separation of Concerns)

```typescript
// ✅ 현업 권장 패턴
Zustand      → 클라이언트 상태 (UI 상태, 전역 설정)
React Query  → 서버 상태 (API 데이터, 캐싱, 동기화)
ViewModel    → 비즈니스 로직 (Zustand + React Query 조합)
Service      → 외부 통신 (API 호출, Bridge 통신)
```

### 2. Zustand 직접 선택 (Selector 최소화)

```typescript
// ❌ Bad (불필요한 selector)
export const selectCurrentUser = () => useUserStore.getState().currentUser;
const user = selectCurrentUser();

// ✅ Good (직접 hook 사용)
const user = useUserStore(state => state.currentUser);

// ✅ Best (복잡한 로직만 selector로)
export const selectHasConnectedAccounts = (state: UserState) => {
  return state.currentUser?.userAccounts.some(acc => acc.isConnected) ?? false;
};
const hasAccounts = useUserStore(selectHasConnectedAccounts);
```

### 3. React Query Optimistic Update

```typescript
// ✅ 현업 패턴
export const useUpdateUserProfile = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (updates) => userService.updateUserProfile(updates),

    onMutate: async (updates) => {
      // 낙관적 업데이트
      await queryClient.cancelQueries({ queryKey: queryKeys.user.current });
      const previousUser = queryClient.getQueryData(queryKeys.user.current);

      queryClient.setQueryData(queryKeys.user.current, (old: any) => ({
        ...old,
        ...updates,
      }));

      return { previousUser };
    },

    onError: (err, updates, context) => {
      // 에러 시 롤백
      if (context?.previousUser) {
        queryClient.setQueryData(queryKeys.user.current, context.previousUser);
      }
    },

    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.user.all });
    },
  });
};
```

## 🔄 마이그레이션 가이드

### ViewModel에서 API 호출 시

```typescript
// Before (RTK Query)
import { useGetUserQuery, useUpdateUserMutation } from '../../../store/api/userApi';

const { data, isLoading } = useGetUserQuery();
const [updateUser] = useUpdateUserMutation();

// After (React Query)
import { useGetCurrentUser, useUpdateUserProfile } from '../../../services/user';

const { data, isLoading } = useGetCurrentUser();
const { mutateAsync: updateUser } = useUpdateUserProfile();
```

### Store에서 상태 접근 시

```typescript
// Before (Redux)
import { useSelector, useDispatch } from 'react-redux';
import { selectCurrentUser, login } from '../../../store/slices/userSlice';

const user = useSelector(selectCurrentUser);
const dispatch = useDispatch();
dispatch(login(userData));

// After (Zustand)
import { useUserStore } from '../../../stores/user';

const user = useUserStore(state => state.currentUser);
const setLoginData = useUserStore(state => state.setLoginData);
setLoginData(userData);
```

## 🗑️ 삭제 예정 파일

다음 파일들은 더 이상 사용되지 않으므로 안전하게 삭제 가능:

```
src/store/
├── api/
│   ├── baseApi.ts
│   ├── authApi.ts
│   ├── userApi.ts
│   ├── runningApi.ts
│   ├── avatarApi.ts
│   ├── pointApi.ts
│   ├── shoeApi.ts
│   └── statisticApi.ts
├── slices/
│   ├── authSlice.ts
│   ├── userSlice.ts
│   ├── appSlice.ts
│   └── unitySlice.ts
├── middleware/
├── hooks.ts
├── index.ts
└── feature-registry.ts
```

삭제 전 확인 사항:
1. ✅ 모든 ViewModel이 `services/*` 사용
2. ✅ `store/api` import가 없는지 전역 검색
3. ✅ Redux Provider 제거 (React Query Provider로 대체)
4. ✅ UserStateManager Redux 의존성 제거 완료

## 📝 참고 문서

- [Zustand 공식 문서](https://docs.pmnd.rs/zustand/getting-started/introduction)
- [React Query 공식 문서](https://tanstack.com/query/latest/docs/framework/react/overview)
- [현업 상태 관리 패턴](https://tkdodo.eu/blog/practical-react-query)

## 🎉 완료!

모든 마이그레이션 작업이 완료되었습니다.
- Phase 1: ViewModel RTK Query 제거 ✅
- Phase 2: Zustand 비동기 로직 분리 ✅
- Phase 3: Store 구조 최적화 ✅
- Phase 4: UserStateManager Redux → Zustand 마이그레이션 ✅

**Phase 4 상세 변경 사항:**
```typescript
// Before (Redux 사용)
import { store } from '../../store';
import { setLoginData, logout as logoutAction, ... } from '../../store/slices/userSlice';

get currentUser(): User | null {
  return store.getState().user.currentUser;
}

async login(...) {
  store.dispatch(setLoginData(...));
}

// After (Zustand 사용)
import { useUserStore, UserPreferences } from '../../stores/user/userStore';

get currentUser(): User | null {
  return useUserStore.getState().currentUser;
}

async login(...) {
  useUserStore.getState().setLoginData(...);
}
```
