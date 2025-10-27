# Android Unity Bridge 메시지 전송 플로우 분석

## 📋 목차
1. [전체 아키텍처 개요](#전체-아키텍처-개요)
2. [메시지 전송 플로우 상세 분석](#메시지-전송-플로우-상세-분석)
3. [각 레이어별 역할](#각-레이어별-역할)
4. [실제 사용 예시](#실제-사용-예시)
5. [Unity 메시지 수신 방법](#unity-메시지-수신-방법)
6. [문제 해결 가이드](#문제-해결-가이드)

---

## 전체 아키텍처 개요

```
┌─────────────────────────────────────────────────────────────────┐
│                        TypeScript Layer                          │
│  ┌──────────────────┐        ┌───────────────────────────┐      │
│  │  UnityService    │───────▶│  UnityBridge              │      │
│  │  (Business Logic)│        │  (NativeModules wrapper)  │      │
│  └──────────────────┘        └───────────────────────────┘      │
└─────────────────────────────────────────┬───────────────────────┘
                                          │
                                          │ React Native Bridge
                                          │
┌─────────────────────────────────────────▼───────────────────────┐
│                        Native Layer (Kotlin)                     │
│  ┌─────────────────────────┐       ┌──────────────────────┐     │
│  │ RNUnityBridgeModule     │──────▶│  UnityHolder         │     │
│  │ (React Native Module)   │       │  (Unity Wrapper)     │     │
│  └─────────────────────────┘       └──────────────────────┘     │
└─────────────────────────────────────────┬───────────────────────┘
                                          │
                                          │ Unity Native API
                                          │
┌─────────────────────────────────────────▼───────────────────────┐
│                           Unity Layer (C#)                       │
│  ┌─────────────────────────────────────────────────────┐        │
│  │  GameObject: "Charactor"                            │        │
│  │  ┌────────────────────────────────────────────┐    │        │
│  │  │  CharactorManager (MonoBehaviour)          │    │        │
│  │  │  ├─ SetSpeed(string)                       │    │        │
│  │  │  ├─ SetTrigger(string)                     │    │        │
│  │  │  └─ SetSprites(string)                     │    │        │
│  │  └────────────────────────────────────────────┘    │        │
│  └─────────────────────────────────────────────────────┘        │
└──────────────────────────────────────────────────────────────────┘
```

---

## 메시지 전송 플로우 상세 분석

### 1단계: TypeScript → UnityBridge

**위치**: `src/features/unity/services/UnityService.ts`

```typescript
// 예시: 캐릭터 속도 설정
async setCharacterSpeed(speed: number): Promise<void> {
  // 1. 도메인 로직: 속도 검증 및 변환
  let clampedSpeed = /* 속도 계산 로직 */;

  // 2. Unity Bridge로 메시지 전송
  await UnityBridge.sendUnityMessage(
    'Charactor',      // GameObject 이름
    'SetSpeed',       // 메서드 이름
    clampedSpeed.toString()  // 파라미터
  );
}
```

**역할**:
- 비즈니스 로직 처리 (속도 범위 검증, 데이터 변환)
- Unity에 전송할 데이터 포맷팅
- 에러 처리

---

### 2단계: UnityBridge → Native Module

**위치**: `src/features/unity/bridge/UnityBridge.ts`

```typescript
// NativeModules를 통해 Native Module 접근
const { RNUnityBridge: NativeUnityBridge } = NativeModules;

class UnityBridgeImpl implements UnityBridgeInterface {
  async sendUnityMessage(
    objectName: string,    // "Charactor"
    methodName: string,    // "SetSpeed"
    parameter: string      // "5.0"
  ): Promise<void> {
    // Native Module의 sendUnityMessage 호출
    await NativeUnityBridge.sendUnityMessage(
      objectName,
      methodName,
      parameter
    );
  }
}
```

**역할**:
- React Native Bridge를 통한 Native Module 호출
- Promise 기반 비동기 처리
- 플랫폼 독립적 인터페이스 제공 (iOS/Android 모두 동작)

---

### 3단계: Native Module → Unity Holder

**위치**: `android/app/src/main/java/com/hongtaeho/app/unity/RNUnityBridgeModule.kt`

```kotlin
@ReactMethod
fun sendUnityMessage(
    objectName: String,    // "Charactor"
    methodName: String,    // "SetSpeed"
    parameter: String,     // "5.0"
    promise: Promise
) {
    Log.d(TAG, "sendUnityMessage: $objectName.$methodName($parameter)")

    try {
        // UnityHolder로 메시지 전달
        UnityHolder.sendMessage(objectName, methodName, parameter)

        // React Native에 성공 응답
        promise.resolve(null)
    } catch (e: Exception) {
        // 에러 발생 시 Promise reject
        promise.reject("UNITY_MESSAGE_ERROR", "Failed to send Unity message", e)

        // 에러 이벤트도 함께 전송
        sendErrorEvent("UNITY_MESSAGE_ERROR", "Failed to send Unity message", e.message ?: "Unknown error")
    }
}
```

**역할**:
- React Native Bridge 인터페이스 제공
- Promise 기반 응답 처리
- 에러 처리 (Promise rejection + Event emission)
- 로깅

**JSON 데이터 전송**:
```kotlin
@ReactMethod
fun sendUnityJSON(
    objectName: String,
    methodName: String,
    data: ReadableArray,   // React Native 배열
    promise: Promise
) {
    // 1. ReadableArray → JSONArray 변환
    val jsonArray = convertReadableArrayToJsonArray(data)

    // 2. JSONArray → String
    val jsonString = jsonArray.toString()

    // 3. Unity로 전송
    UnityHolder.sendMessage(objectName, methodName, jsonString)
}
```

---

### 4단계: UnityHolder → Unity Native API

**위치**: `android/app/src/main/java/com/hongtaeho/app/unity/UnityHolder.kt`

```kotlin
object UnityHolder {
    fun sendMessage(
        gameObject: String,    // "Charactor"
        methodName: String,    // "SetSpeed"
        message: String        // "5.0"
    ) {
        try {
            Log.d(TAG, "Sending message to Unity: $gameObject.$methodName($message)")

            // Unity Native API 호출
            UnityPlayerActivity.UnitySendMessage(gameObject, methodName, message)

            Log.d(TAG, "Message sent successfully")
        } catch (e: Exception) {
            Log.e(TAG, "Error sending message to Unity: ${e.message}", e)
            throw e
        }
    }
}
```

**역할**:
- Unity Player와의 직접 통신
- Unity Native API (`UnitySendMessage`) 호출
- 에러 핸들링

**Unity Native API**:
```kotlin
UnityPlayerActivity.UnitySendMessage(
    gameObject: String,    // Unity Scene의 GameObject 이름
    methodName: String,    // GameObject에 attach된 스크립트의 public 메서드 이름
    message: String        // 메서드에 전달할 파라미터 (문자열만 가능)
)
```

---

### 5단계: Unity GameObject 메서드 호출

**위치**: `unity/RunTaehoUnity/Assets/02.Script/CharactorManager.cs`

Unity Scene에는 "Charactor"라는 이름의 GameObject가 있고, 이 GameObject에 `CharactorManager` 스크립트가 attach되어 있습니다.

```csharp
public class CharactorManager : MonoBehaviour
{
    public float speed;
    private Animator animator;

    // React Native에서 호출하는 메서드 1: 속도 설정
    public void SetSpeed(string speed)
    {
        // 문자열을 float으로 변환
        this.speed = float.Parse(speed) / 10.0f;
    }

    // React Native에서 호출하는 메서드 2: 모션 트리거 설정
    public void SetTrigger(string trigger)
    {
        animator.ResetTrigger(trigger);
    }

    // React Native에서 호출하는 메서드 3: 아바타 스프라이트 변경
    public async Task SetSprites(string json)
    {
        // 1. JSON 파싱
        SpriteSettingDtoList dtoList = JsonUtility.FromJson<SpriteSettingDtoList>(json);

        // 2. 스프라이트 로드 및 적용
        foreach (var dto in dtoList.list) {
            // 스프라이트 변경 로직...
        }
    }
}
```

**중요 사항**:
1. 메서드는 **반드시 public**이어야 함
2. 파라미터는 **string 타입 1개만** 가능
3. GameObject 이름은 **Scene에 존재하는 실제 GameObject 이름**과 일치해야 함
4. 스크립트는 **해당 GameObject에 attach**되어 있어야 함

---

## 각 레이어별 역할

### TypeScript Layer (UnityService)

**책임**:
- 비즈니스 로직 처리
- 데이터 검증 및 변환
- 도메인 상수 관리
- 에러 처리

**핵심 상수**:
```typescript
private static readonly UNITY_OBJECT_NAME = 'Charactor';  // Unity GameObject 이름
private static readonly UNITY_SPEED_METHOD = 'SetSpeed';   // Unity 메서드 이름
private static readonly UNITY_MOTION_METHOD = 'SetTrigger';
private static readonly CHANGE_AVATAR = 'SetSprites';
```

---

### React Native Bridge Layer (UnityBridge)

**책임**:
- Native Module과의 인터페이스
- 플랫폼 독립성 제공 (iOS/Android 공통 인터페이스)
- Promise 기반 비동기 처리

**주요 메서드**:
```typescript
interface UnityBridgeInterface {
  sendUnityMessage(objectName: string, methodName: string, parameter: string): Promise<void>;
  sendUnityJSON(objectName: string, methodName: string, data: any[]): Promise<void>;
}
```

---

### Native Layer (Kotlin)

**RNUnityBridgeModule 책임**:
- React Native Bridge Module 구현
- @ReactMethod를 통한 JavaScript 호출 가능 메서드 제공
- Promise 기반 응답 처리
- JSON 데이터 변환 (ReadableArray/Map → JSONArray/Object)
- 에러 이벤트 전송

**UnityHolder 책임**:
- Unity Player와의 직접 통신
- Unity Native API 호출 래퍼
- 에러 핸들링
- Unity 인스턴스 상태 확인

---

### Unity Layer (C#)

**CharactorManager 책임**:
- React Native에서 전송된 메시지 수신
- Unity 게임 로직 처리
- 캐릭터 애니메이션 제어
- 아바타 스프라이트 변경

---

## 실제 사용 예시

### 예시 1: 캐릭터 속도 설정

**TypeScript 호출**:
```typescript
import { unityService } from '~/features/unity';

// 속도 5.0으로 설정
await unityService.setCharacterSpeed(5.0);
```

**메시지 전송 과정**:
```
TypeScript: setCharacterSpeed(5.0)
  ↓ (속도 검증 및 변환: 5.0 → "5.0")
UnityBridge.sendUnityMessage("Charactor", "SetSpeed", "5.0")
  ↓ (React Native Bridge)
RNUnityBridgeModule.sendUnityMessage("Charactor", "SetSpeed", "5.0")
  ↓ (Unity Native API)
UnityHolder.sendMessage("Charactor", "SetSpeed", "5.0")
  ↓ (Unity Player)
UnityPlayerActivity.UnitySendMessage("Charactor", "SetSpeed", "5.0")
  ↓ (Unity GameObject)
CharactorManager.SetSpeed("5.0")
  ↓ (속도 변환: "5.0" → 0.5f)
this.speed = 0.5f;
```

---

### 예시 2: 캐릭터 모션 변경

**TypeScript 호출**:
```typescript
await unityService.setCharacterMotion('MOVE');
```

**메시지 전송**:
```
"Charactor" GameObject → SetTrigger("MOVE") → animator.ResetTrigger("MOVE")
```

---

### 예시 3: 아바타 변경 (JSON 데이터)

**TypeScript 호출**:
```typescript
const items: Item[] = [
  {
    name: "New_Hair_01.png",
    itemType: { id: 1, name: "Hair" },
    filePath: "...",
    unityFilePath: "Assets/05.Resource/Hair/"
  },
  // ... more items
];

await unityService.changeAvatar(items);
```

**데이터 변환 과정**:
```typescript
// 1. TypeScript: Item[] → UnityAvatarDtoList
{
  "list": [
    {
      "name": "New_Hair_01.png",
      "part": "Hair",
      "itemPath": "Assets/05.Resource/Hair/New_Hair_01.png"
    }
  ]
}

// 2. JSON.stringify
'{"list":[{"name":"New_Hair_01.png","part":"Hair","itemPath":"Assets/05.Resource/Hair/New_Hair_01.png"}]}'

// 3. Native Module: String 그대로 전송
UnityBridge.sendUnityMessage("Charactor", "SetSprites", jsonString)

// 4. Unity: JSON 파싱
SpriteSettingDtoList dtoList = JsonUtility.FromJson<SpriteSettingDtoList>(json);
```

**Unity C# 처리**:
```csharp
public async Task SetSprites(string json)
{
    // 1. JSON 파싱
    SpriteSettingDtoList dtoList = JsonUtility.FromJson<SpriteSettingDtoList>(json);

    // 2. 각 item에 대해
    foreach (var dto in dtoList.list)
    {
        // 3. Addressables에서 스프라이트 로드
        string addressableKey = dto.itemPath + ".png";
        Sprite[] sprites = await Addressables.LoadAssetAsync<Sprite[]>(addressableKey).Task;

        // 4. 스프라이트 적용
        ApplySprite(matchingElement, sprite, imageElement);
    }
}
```

---

## Unity 메시지 수신 방법

### Unity Scene 설정

1. **GameObject 생성**:
   ```
   Hierarchy → Create Empty → 이름: "Charactor"
   ```

2. **스크립트 Attach**:
   ```
   Charactor GameObject → Add Component → CharactorManager
   ```

3. **메서드 작성 규칙**:
   ```csharp
   public class CharactorManager : MonoBehaviour
   {
       // ✅ 올바른 메서드 시그니처
       public void SetSpeed(string speed) { }
       public void SetTrigger(string trigger) { }
       public async Task SetSprites(string json) { }

       // ❌ 잘못된 메서드 시그니처
       private void SetSpeed(string speed) { }     // private 불가
       public void SetSpeed(int speed) { }         // string이 아닌 타입 불가
       public void SetSpeed(string s1, string s2) { } // 파라미터 2개 불가
   }
   ```

### DTO 정의 (JSON 수신용)

**C# DTO**:
```csharp
[Serializable]
public class SpriteSettingDto
{
    public string name;
    public string part;
    public string itemPath;
}

[Serializable]
public class SpriteSettingDtoList
{
    public List<SpriteSettingDto> list;
}
```

**TypeScript DTO** (동일 구조):
```typescript
interface UnityAvatarDto {
  name: string;
  part: string;
  itemPath: string;
}

interface UnityAvatarDtoList {
  list: UnityAvatarDto[];
}
```

**중요**:
- C#과 TypeScript의 필드명이 **정확히 일치**해야 함
- `[Serializable]` 어트리뷰트 필수
- Unity의 `JsonUtility.FromJson`을 사용하려면 클래스여야 함 (struct 불가)

---

## 문제 해결 가이드

### 1. "RNUnityBridge native module not available" 에러

**원인**: Native Module이 React Native에 등록되지 않음

**해결**:
1. `MainApplication.kt`에 패키지 등록 확인:
   ```kotlin
   override fun getPackages(): List<ReactPackage> =
       PackageList(this).packages.apply {
           add(RNUnityBridgePackage())
       }
   ```

2. 앱 재빌드:
   ```bash
   cd android
   ./gradlew clean
   cd ..
   npm run android
   ```

---

### 2. Unity 메시지가 전달되지 않음

**원인 1**: Unity가 초기화되지 않음

**확인 방법**:
```kotlin
val isLoaded = UnityHolder.isUnityLoaded()
Log.d("Unity", "Unity loaded: $isLoaded")
```

**해결**:
- Unity 빌드가 올바르게 포함되었는지 확인
- `build.gradle`에 `implementation project(':unityLibrary')` 추가
- Unity Scene이 로드되었는지 확인

---

**원인 2**: GameObject 이름 불일치

**확인**:
```typescript
// TypeScript
UNITY_OBJECT_NAME = 'Charactor'  // 'Charactor' 맞는지 확인 ('Character' 아님!)
```

```csharp
// Unity Scene
Hierarchy → GameObject 이름: "Charactor"  // 정확히 일치해야 함
```

---

**원인 3**: 메서드 시그니처 오류

**잘못된 예**:
```csharp
private void SetSpeed(string speed) { }  // ❌ private
public void SetSpeed(int speed) { }      // ❌ int 타입
```

**올바른 예**:
```csharp
public void SetSpeed(string speed) { }   // ✅
```

---

### 3. JSON 파싱 에러 (Unity)

**원인**: JSON 구조 불일치

**디버깅**:
```csharp
public async Task SetSprites(string json)
{
    Debug.Log($"받은 JSON: {json}");

    SpriteSettingDtoList dtoList = JsonUtility.FromJson<SpriteSettingDtoList>(json);

    if (dtoList == null || dtoList.list == null) {
        Debug.LogError("JSON 파싱 실패!");
        return;
    }

    Debug.Log($"파싱된 항목 수: {dtoList.list.Count}");
}
```

**해결**:
- TypeScript와 C# DTO 필드명 일치 확인
- JSON 문자열 포맷 확인 (단일 따옴표 → 이중 따옴표)
- `[Serializable]` 어트리뷰트 확인

---

### 4. 컴파일 에러: UnityPlayer not found

**원인**: Unity 라이브러리가 프로젝트에 포함되지 않음

**해결**:

1. **Unity 빌드**:
   ```
   Unity → Build Settings → Android → Export Project
   → 위치: runtaeho_app/android/unityLibrary/
   ```

2. **settings.gradle**:
   ```gradle
   include ':unityLibrary'
   project(':unityLibrary').projectDir = new File('unityLibrary')
   ```

3. **build.gradle** (`android/app/build.gradle`):
   ```gradle
   dependencies {
       implementation project(':unityLibrary')
   }
   ```

---

### 5. Logcat 로그 확인

```bash
# Unity Bridge 로그 필터링
adb logcat | grep -E "RNUnityBridge|UnityHolder"

# Unity 로그 필터링
adb logcat | grep -E "Unity|UnityPlayer"

# 모든 로그
adb logcat | grep -E "RNUnityBridge|UnityHolder|Unity|CharactorManager"
```

---

## 핵심 요약

### 메시지 전송 플로우
```
TypeScript (UnityService)
  ↓ sendUnityMessage()
UnityBridge (NativeModules wrapper)
  ↓ NativeModules.RNUnityBridge
RNUnityBridgeModule (Kotlin)
  ↓ UnityHolder.sendMessage()
UnityHolder (Unity API wrapper)
  ↓ UnityPlayerActivity.UnitySendMessage()
Unity GameObject (C# MonoBehaviour)
  ↓ public method call
Unity 게임 로직 실행
```

### 필수 조건

**Android Native**:
1. `RNUnityBridgePackage`가 `MainApplication`에 등록
2. Unity 라이브러리가 프로젝트에 포함
3. `UnityPlayer` 클래스 사용 가능

**Unity**:
1. GameObject 이름이 TypeScript 상수와 일치
2. 스크립트가 GameObject에 attach됨
3. 메서드가 `public void MethodName(string param)` 형태
4. Scene이 로드됨

**TypeScript**:
1. Native Module 사용 가능 (`NativeModules.RNUnityBridge`)
2. 메서드 호출이 Promise 기반으로 처리됨

### 데이터 전송 규칙

1. **단순 문자열**: `sendUnityMessage` 사용
2. **JSON 데이터**: `sendUnityMessage` + `JSON.stringify` 사용 (또는 `sendUnityJSON`)
3. **Unity에서 파싱**: `JsonUtility.FromJson<T>(json)`
4. **DTO 필드명 일치**: TypeScript ↔ C#

---

## 참고 자료

- [Unity as a Library (Android)](https://docs.unity3d.com/Manual/UnityasaLibrary-Android.html)
- [React Native Native Modules (Android)](https://reactnative.dev/docs/native-modules-android)
- [Unity Scripting API: UnitySendMessage](https://docs.unity3d.com/ScriptReference/AndroidJNI.UnitySendMessage.html)
