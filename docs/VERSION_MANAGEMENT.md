# RunTaeho 버전 관리 가이드

## 개요

RunTaeho 앱은 **OTA(Over-The-Air) 업데이트**를 중심으로 버전을 관리합니다.
핵심 원칙: **runtimeVersion은 최소한으로 변경**하여 모든 사용자가 동일한 OTA 업데이트를 받을 수 있도록 합니다.

## 버전 종류

| 속성 | 위치 | 용도 | 변경 시점 |
|------|------|------|----------|
| `version` | package.json | 스토어 표시 버전 (1.0.3) | 매 릴리스 |
| `runtimeVersion` | package.json > config | OTA 호환성 기준 | 네이티브 변경 시만 |
| `buildNumber` (iOS) | EAS 관리 | 빌드 번호 | 자동 증가 |
| `versionCode` (Android) | EAS 관리 | 빌드 번호 | 자동 증가 |

## 현재 버전 확인

```bash
npm run version:status
```

## 버전 관리 원칙

### runtimeVersion 변경이 필요한 경우 (새 빌드 필요)

| 상황 | 예시 |
|------|------|
| 네이티브 모듈 추가 | expo-camera, react-native-maps 등 |
| Expo SDK 업그레이드 | SDK 53 → SDK 54 |
| iOS/Android 설정 변경 | permissions, info.plist 수정 |
| 네이티브 플러그인 업데이트 | expo-location 메이저 버전 업 |

### runtimeVersion 유지 (OTA 가능)

| 상황 | 예시 |
|------|------|
| JS/TS 코드 수정 | 버그 수정, 기능 추가 |
| 스타일/이미지 변경 | UI 개선 |
| npm 패키지 추가 (JS만) | axios, zustand 등 |
| 환경변수 변경 | API URL 변경 |

## 워크플로우

### 1. JS 버그 수정 / 기능 추가 (OTA)

```bash
# 1. 코드 수정 후 커밋
git add . && git commit -m "Fix: 버그 수정"

# 2. 버전 올리고 OTA 배포 (한 번에)
npm run release:ota -- "버그 수정"

# 또는 단계별로:
npm run version:patch           # 1.0.3 → 1.0.4
npm run update:prod -- "버그 수정"
```

### 2. 네이티브 모듈 추가 (새 빌드)

```bash
# 1. 네이티브 모듈 설치
npx expo install expo-camera

# 2. 코드 수정 및 커밋
git add . && git commit -m "Feat: 카메라 기능 추가"

# 3. 버전 올림 (마이너 또는 메이저)
npm run version:minor           # 1.0.4 → 1.1.0

# 4. runtimeVersion 동기화 + 빌드
npm run release:native

# 5. 스토어 제출
npm run submit:all
```

### 3. 스테이징 테스트 후 프로덕션 배포

```bash
# 1. 스테이징에서 먼저 테스트
npm run update:staging -- "테스트: 새 기능"

# 2. TestFlight/Internal Testing으로 검증

# 3. 검증 완료 후 프로덕션 배포
npm run update:prod -- "릴리스: 새 기능"
```

### 4. 롤백

```bash
# 마지막 OTA 업데이트 롤백
npm run update:rollback
```

## npm 스크립트 요약

| 스크립트 | 설명 |
|---------|------|
| `version:status` | 현재 버전 상태 확인 |
| `version:patch` | 패치 버전 증가 (1.0.3 → 1.0.4) |
| `version:minor` | 마이너 버전 증가 (1.0.3 → 1.1.0) |
| `version:major` | 메이저 버전 증가 (1.0.3 → 2.0.0) |
| `version:sync-runtime` | runtimeVersion을 version에 맞춤 |
| `release:ota` | 패치 버전 증가 + OTA 배포 |
| `release:native` | runtimeVersion 동기화 + 빌드 |
| `update:staging` | 스테이징 OTA 배포 |
| `update:prod` | 프로덕션 OTA 배포 |
| `update:rollback` | OTA 롤백 |

## EAS 빌드 프로필

| 프로필 | 채널 | 용도 | 자동 빌드 번호 |
|--------|------|------|--------------|
| `development` | development | 로컬 개발 | - |
| `preview` | staging | 내부 테스트 | O |
| `production` | production | 스토어 배포 | O |

## 버전 관리 예시

### 시나리오: 스토어 앱 1.0.2 → 기능 추가 → 버그 수정 → 네이티브 변경

```
스토어 앱 상태:
  version: 1.0.2
  runtimeVersion: 1.0.2

[JS 기능 추가]
  version: 1.0.3 → OTA 배포
  runtimeVersion: 1.0.2 (유지)

[JS 버그 수정]
  version: 1.0.4 → OTA 배포
  runtimeVersion: 1.0.2 (유지)

[네이티브 모듈 추가]
  version: 1.1.0 → 새 빌드 + 스토어 제출
  runtimeVersion: 1.1.0 (동기화)
```

## 주의사항

1. **runtimeVersion이 다르면 OTA 불가**: 스토어 앱의 runtimeVersion과 일치해야 OTA 가능
2. **buildNumber/versionCode는 EAS가 관리**: `appVersionSource: "remote"` 설정으로 자동 증가
3. **네이티브 변경 감지**: `fingerprint` 정책 사용 시 자동 감지 가능 (실험적)
4. **롤백 주의**: 롤백 시 해당 브랜치의 모든 사용자에게 영향

## 문제 해결

### OTA 업데이트가 적용되지 않는 경우

1. runtimeVersion 확인: `npm run version:status`
2. 스토어 앱의 runtimeVersion과 일치하는지 확인
3. 채널(channel) 확인: production/staging 구분

### 빌드 번호 충돌

```bash
# EAS 서버와 로컬 동기화
eas build:version:sync
```

## 참고 자료

- [Expo Runtime Versions](https://docs.expo.dev/eas-update/runtime-versions/)
- [EAS Update Best Practices](https://expo.dev/blog/eas-update-best-practices)
- [App Version Management](https://docs.expo.dev/build-reference/app-versions/)
