//
//  UnityNativeBridge.mm
//  app
//
//  Created by Hong Taeho on 11/24/25.
//

#import <Foundation/Foundation.h>

// ==========================================
// Unity C#에서 호출할 C 함수들
// DllImport로 선언된 함수들과 1:1 매핑
// ==========================================

extern "C" {
    /// <summary>
    /// Unity GameObject (Charactor) 준비 완료 알림
    /// Unity CharactorManager.cs의 MarkReady()에서 호출됨
    /// </summary>
    void _notifyCharactorReady() {
        NSLog(@"[UnityNativeBridge] 🎉 Charactor GameObject Ready notification received from Unity!");

        // 메인 스레드에서 NotificationCenter로 이벤트 발행
        dispatch_async(dispatch_get_main_queue(), ^{
            [[NSNotificationCenter defaultCenter]
                postNotificationName:@"UnityCharactorReady"
                              object:nil
                            userInfo:nil];

            NSLog(@"[UnityNativeBridge] ✅ NotificationCenter posted: UnityCharactorReady");
        });
    }
}

