#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(UnityBridge, RCTEventEmitter)

// Unity 초기화
RCT_EXTERN_METHOD(initialize:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Unity 화면 표시
RCT_EXTERN_METHOD(showUnity:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Unity 화면 숨기기
RCT_EXTERN_METHOD(hideUnity:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

// Unity로 메시지 전송
RCT_EXTERN_METHOD(sendMessage:(NSString *)gameObject
                  methodName:(NSString *)methodName
                  message:(NSString *)message
                  resolver:(RCTPromiseResolveBlock)resolve
                  rejecter:(RCTPromiseRejectBlock)reject)

+ (BOOL)requiresMainQueueSetup
{
    return YES;
}

@end
