# Unity-React Native Bridge (Swift)

## 파일 구조
```
iOS/
├── UnityBridge.swift           # React Native 브릿지 모듈
├── UnityBridge.m               # Objective-C 브릿지 인터페이스  
├── UnityManager.swift          # Unity Framework 관리 싱글톤 클래스
├── UnityViewController.swift   # Unity 뷰 컨트롤러
├── UnityFramework-Bridging-Header.h  # Unity Framework 브릿징 헤더
└── README.md                   # 사용 가이드
```

## 주요 기능
- Unity Framework 초기화 및 관리
- Unity 화면 표시/숨기기 (Modal 방식)
- React Native → Unity 메시지 전송 (UnitySendMessage)
- Unity → React Native 이벤트 수신
- Unity 일시정지/재개

## Unity Framework 통합 완료 ✅

Unity Framework가 성공적으로 통합되었습니다. 

### 현재 활성화된 기능:
- ✅ Unity Framework 로드 및 초기화
- ✅ UnitySendMessage를 통한 Unity 통신
- ✅ Unity 뷰 컨트롤러 표시
- ✅ Unity 일시정지/재개 제어

## Xcode 프로젝트 설정

1. **Unity Framework 확인**
   - UnityFramework.xcframework가 프로젝트에 추가되어 있는지 확인
   - Embed & Sign으로 설정되어 있는지 확인

2. **브릿징 헤더 설정**
   - Build Settings → Swift Compiler - General
   - Objective-C Bridging Header: `$(PROJECT_DIR)/app/Unity/UnityFramework-Bridging-Header.h`

3. **Info.plist 설정 (필요시)**
   ```xml
   <key>UIViewControllerBasedStatusBarAppearance</key>
   <false/>
   ```

## React Native 사용 예제

```javascript
import { NativeModules, NativeEventEmitter } from 'react-native';

const { UnityBridge } = NativeModules;
const unityEvents = new NativeEventEmitter(UnityBridge);

// Unity 초기화
await UnityBridge.initialize();

// Unity 화면 표시
await UnityBridge.showUnity();

// Unity 화면 숨기기
await UnityBridge.hideUnity();

// Unity로 메시지 전송
await UnityBridge.sendMessage('GameObject', 'MethodName', 'Hello Unity');

// Unity 이벤트 수신
const subscription = unityEvents.addListener('UnityMessage', (data) => {
  console.log('Unity Message:', data);
});

// 이벤트 리스너 정리
subscription.remove();
```

## Unity 측 설정

Unity 프로젝트에서 메시지를 받을 GameObject와 메서드를 준비해야 합니다:

```csharp
public class GameObject : MonoBehaviour
{
    public void MethodName(string message)
    {
        Debug.Log("Received from React Native: " + message);
        
        // React Native로 응답 보내기
        SendMessageToNative("Response from Unity");
    }
    
    private void SendMessageToNative(string message)
    {
        // iOS Native로 메시지 전송
        #if UNITY_IOS
        // Native 콜백 호출
        #endif
    }
}
```

## 주의사항
- Unity Framework는 메인 스레드에서 실행되어야 합니다
- Unity 뷰는 Modal로 표시되며, 전체 화면을 차지합니다
- Unity를 표시하기 전에 반드시 initialize()를 호출해야 합니다
- 앱이 백그라운드로 이동할 때 Unity를 일시정지하는 것이 권장됩니다

## 문제 해결

### Unity 화면이 표시되지 않는 경우
- Unity Framework가 올바르게 링크되어 있는지 확인
- 브릿징 헤더 경로가 올바른지 확인
- Unity 초기화가 완료되었는지 확인

### 메시지가 전달되지 않는 경우  
- GameObject 이름이 정확한지 확인
- 메서드 이름이 Unity 측과 일치하는지 확인
- Unity 씬이 로드되어 있는지 확인

### 빌드 오류
- UnityFramework.xcframework가 Embed & Sign으로 설정되어 있는지 확인
- Swift 버전 호환성 확인 (Swift 5.0+)
- Unity 버전 호환성 확인 (Unity 2020.3+)
