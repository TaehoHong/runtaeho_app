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
    void _notifyAvatarProtocolVersion(int version) {
    dispatch_async(dispatch_get_main_queue(), ^{
        [[NSNotificationCenter defaultCenter] postNotificationName:@"UnityAvatarProtocolVersion" object:nil userInfo:@{@"version": @(version)}];
    });
}

void _notifyAvatarApplied(const char* requestId, bool success) {
    NSString *identifier = [NSString stringWithUTF8String:requestId];
    dispatch_async(dispatch_get_main_queue(), ^{
        [[NSNotificationCenter defaultCenter] postNotificationName:@"UnityAvatarApplied" object:nil userInfo:@{@"requestId": identifier, @"success": @(success)}];
    });
}

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

    /// <summary>
    /// Unity Avatar (SetSprites) 적용 완료 알림
    /// Unity CharactorManager.cs의 SetSprites() 완료 시 호출됨
    /// React Native에서 이 알림을 받고 UnityView를 표시함
    /// </summary>
    void _notifyAvatarReady() {
        NSLog(@"[UnityNativeBridge] 🎨 Avatar Ready notification received from Unity!");

        // 메인 스레드에서 NotificationCenter로 이벤트 발행
        dispatch_async(dispatch_get_main_queue(), ^{
            [[NSNotificationCenter defaultCenter]
                postNotificationName:@"UnityAvatarReady"
                              object:nil
                            userInfo:nil];

            NSLog(@"[UnityNativeBridge] ✅ NotificationCenter posted: UnityAvatarReady");
        });
    }

    /// <summary>
    /// Unity 캐릭터 스크린샷 캡처 완료 알림
    /// Unity CharactorManager.cs의 CaptureCharacter() 완료 시 호출됨
    /// Base64 인코딩된 PNG 이미지를 React Native에 전달
    /// </summary>
    /// @param callbackId 콜백 식별을 위한 고유 ID
    /// @param base64Image Base64 인코딩된 PNG 이미지 데이터
    void _sendCharacterImage(const char* callbackId, const char* base64Image) {
        NSLog(@"[UnityNativeBridge] 📸 Character image captured from Unity!");

        NSString *callbackIdStr = [NSString stringWithUTF8String:callbackId];
        NSString *base64Str = [NSString stringWithUTF8String:base64Image];

        // 메인 스레드에서 NotificationCenter로 이벤트 발행
        dispatch_async(dispatch_get_main_queue(), ^{
            [[NSNotificationCenter defaultCenter]
                postNotificationName:@"UnityCharacterImageCaptured"
                              object:nil
                            userInfo:@{
                                @"callbackId": callbackIdStr,
                                @"base64Image": base64Str
                            }];

            NSLog(@"[UnityNativeBridge] ✅ NotificationCenter posted: UnityCharacterImageCaptured (callbackId: %@, imageLength: %lu)",
                  callbackIdStr, (unsigned long)base64Str.length);
        });
    }
}

