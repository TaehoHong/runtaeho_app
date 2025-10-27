# Android Unity Bridge

iOS Unity Bridge와 동일한 기능을 제공하는 Android용 Unity Bridge 구현입니다.

## 구조

### 1. Native 레이어 (Kotlin)

#### UnityHolder.kt
- Unity 인스턴스 관리 싱글톤
- iOS의 `Unity.swift`와 동일한 역할
- `UnityPlayer.UnitySendMessage`를 사용하여 Unity와 통신

```kotlin
UnityHolder.sendMessage(gameObject, methodName, message)
```

#### RNUnityBridgeModule.kt
- React Native 브릿지 모듈
- iOS의 `RNUnityBridge.swift`와 동일한 기능
- 주요 메서드:
  - `sendUnityMessage(objectName, methodName, parameter, promise)`
  - `sendUnityJSON(objectName, methodName, data, promise)`

#### RNUnityBridgePackage.kt
- React Native 패키지 등록
- `MainApplication.kt`에서 사용

### 2. TypeScript 레이어

#### UnityBridge.ts
- 이미 크로스플랫폼으로 구현되어 있음
- `NativeModules.RNUnityBridge` 사용
- iOS/Android 모두에서 동일하게 작동

#### UnityService.ts
- 도메인 로직 처리
- 플랫폼 독립적

## 설치 및 설정

### 1. MainApplication.kt 등록

`android/app/src/main/java/com/hongtaeho/app/MainApplication.kt`에 패키지 등록:

```kotlin
import com.hongtaeho.app.unity.RNUnityBridgePackage

class MainApplication : Application(), ReactApplication {
  override val reactNativeHost: ReactNativeHost = ReactNativeHostWrapper(
      this,
      object : DefaultReactNativeHost(this) {
        override fun getPackages(): List<ReactPackage> =
            PackageList(this).packages.apply {
              // Unity Bridge Package 등록
              add(RNUnityBridgePackage())
            }
        // ...
      }
  )
}
```

### 2. Unity Android 빌드 설정

Unity에서 Android 빌드 시:
1. **Build Settings**
   - Platform: Android
   - Export Project: 체크
   - Export 위치: `android/unityLibrary/`

2. **Player Settings**
   - Target SDK: 최신 버전
   - Minimum API Level: 21 이상

### 3. build.gradle 설정

Unity 라이브러리가 포함되어 있어야 합니다:

```gradle
dependencies {
    implementation project(':unityLibrary')
    // ...
}
```

### 4. AndroidManifest.xml 설정

Unity Activity 권한 및 설정 추가 (필요시):

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
```

## 사용 방법

### TypeScript에서 사용

```typescript
import { UnityService } from '~/features/unity';

// 캐릭터 속도 설정
await unityService.setCharacterSpeed(5.0);

// 캐릭터 정지
await unityService.stopCharacter();

// 캐릭터 모션 설정
await unityService.setCharacterMotion('MOVE');

// 아바타 변경
await unityService.changeAvatar(items);
```

## iOS vs Android 비교

| 기능 | iOS | Android |
|------|-----|---------|
| Unity 통신 | `Unity.shared.sendMessage` | `UnityPlayer.UnitySendMessage` |
| 모듈 등록 | Objective-C Bridge | Kotlin Package |
| 이벤트 에미터 | `RCTEventEmitter` | `DeviceEventManagerModule` |
| JSON 변환 | `JSONSerialization` | `org.json.JSONObject` |

## 주요 메서드

### sendUnityMessage
Unity GameObject의 메서드를 문자열 파라미터로 호출

```kotlin
@ReactMethod
fun sendUnityMessage(
    objectName: String,
    methodName: String,
    parameter: String,
    promise: Promise
)
```

### sendUnityJSON
Unity GameObject의 메서드를 JSON 데이터로 호출

```kotlin
@ReactMethod
fun sendUnityJSON(
    objectName: String,
    methodName: String,
    data: ReadableArray,
    promise: Promise
)
```

## 에러 처리

Android bridge는 iOS와 동일하게 에러를 처리합니다:

1. **Promise Rejection**: React Native로 에러 반환
2. **Event Emission**: `onUnityError` 이벤트 발생
3. **Logging**: Logcat에 에러 로그 출력

```kotlin
try {
    UnityHolder.sendMessage(objectName, methodName, parameter)
    promise.resolve(null)
} catch (e: Exception) {
    promise.reject("UNITY_MESSAGE_ERROR", "Failed to send Unity message: ${e.message}", e)
    sendErrorEvent("UNITY_MESSAGE_ERROR", "Failed to send Unity message", e.message ?: "Unknown error")
}
```

## 디버깅

### Logcat 로그 확인

```bash
adb logcat | grep -E "RNUnityBridge|UnityHolder"
```

### Unity 로그 확인

```bash
adb logcat | grep -E "Unity|UnityPlayer"
```

## 알려진 제한사항

1. Unity Android 빌드가 먼저 완료되어야 함
2. `unityLibrary` 프로젝트가 Android 프로젝트에 포함되어야 함
3. Unity Player가 초기화되지 않으면 메시지 전송 실패

## 문제 해결

### RNUnityBridge 모듈을 찾을 수 없음

**원인**: 패키지가 등록되지 않음

**해결**:
1. `MainApplication.kt`에서 `RNUnityBridgePackage` 등록 확인
2. 앱 재빌드 (`cd android && ./gradlew clean && cd .. && npm run android`)

### Unity 메시지 전송 실패

**원인**: Unity가 초기화되지 않음

**해결**:
1. Unity 빌드가 올바르게 포함되었는지 확인
2. `UnityPlayer.currentActivity`가 null이 아닌지 확인
3. Unity Scene이 로드되었는지 확인

### JSON 변환 에러

**원인**: 지원하지 않는 데이터 타입

**해결**:
1. 데이터 구조 확인 (primitives, objects, arrays만 지원)
2. 순환 참조 제거
3. undefined/null 값 처리

## 참고 자료

- [Unity as a Library (Android)](https://docs.unity3d.com/Manual/UnityasaLibrary-Android.html)
- [React Native Native Modules (Android)](https://reactnative.dev/docs/native-modules-android)
- iOS Unity Bridge: `src/features/unity/bridge/iOS/README.md` (별도 작성 필요)
