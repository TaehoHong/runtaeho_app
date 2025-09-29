# Unity-React Native Bridge (Swift)

## 파일 구조
```
Unity/
├── UnityBridge.swift           # React Native 브릿지 모듈
├── UnityBridge.m               # Objective-C 브릿지 인터페이스
├── UnityManager.swift          # Unity 관리 싱글톤 클래스
├── UnityViewController.swift   # Unity 뷰 컨트롤러
├── UnityFramework-Bridging-Header.h  # Unity Framework 브릿징 헤더
└── README.md                   # 사용 가이드
```

## 주요 기능
- Unity 초기화
- Unity 화면 표시/숨기기
- React Native → Unity 메시지 전송
- Unity → React Native 이벤트 수신

## Unity Framework 통합 방법

1. **Unity에서 iOS 빌드 생성**
   - Unity에서 iOS 플랫폼으로 빌드
   - UnityFramework.xcframework 생성

2. **Xcode 프로젝트에 Unity Framework 추가**
   - UnityFramework.xcframework를 프로젝트에 드래그
   - Embed & Sign 설정

3. **브릿징 헤더 설정**
   - Build Settings → Swift Compiler - General
   - Objective-C Bridging Header: `$(PROJECT_DIR)/app/Unity/UnityFramework-Bridging-Header.h`

4. **UnityFramework-Bridging-Header.h 수정**
   - 파일의 주석 처리된 import 문을 해제

5. **UnityManager.swift 수정**
   - Unity 초기화 코드 추가
   - SendMessage 함수 연결

## React Native 사용 예제

```javascript
import { NativeModules, NativeEventEmitter } from 'react-native';

const { UnityBridge } = NativeModules;
const unityEvents = new NativeEventEmitter(UnityBridge);

// Unity 초기화
await UnityBridge.initialize();

// Unity 화면 표시
await UnityBridge.showUnity();

// Unity로 메시지 전송
await UnityBridge.sendMessage('GameObject', 'MethodName', 'Hello Unity');

// Unity 이벤트 수신
unityEvents.addListener('UnityMessage', (data) => {
  console.log('Unity Message:', data);
});
```

## 주의사항
- Unity Framework가 실제로 통합되기 전까지는 플레이스홀더 뷰가 표시됩니다
- Unity SendMessage는 메인 스레드에서 실행되어야 합니다
- Unity 뷰는 modal로 표시됩니다
