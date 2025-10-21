//
//  UnityViewManager.m
//  app
//
//  Created by Hong Taeho on 9/23/25.
//  React Native Unity View Manager Registration
//

#import <React/RCTViewManager.h>
#import <React/RCTUIManager.h>

@interface RCT_EXTERN_MODULE(UnityView, RCTViewManager)

// Events
RCT_EXPORT_VIEW_PROPERTY(onUnityReady, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onUnityError, RCTDirectEventBlock)
RCT_EXPORT_VIEW_PROPERTY(onCharacterStateChanged, RCTDirectEventBlock)

// Commands
RCT_EXTERN_METHOD(sendMessageToUnity:(nonnull NSNumber *)node objectName:(NSString *)objectName methodName:(NSString *)methodName parameter:(NSString *)parameter)
RCT_EXTERN_METHOD(pauseUnity:(nonnull NSNumber *)node)
RCT_EXTERN_METHOD(resumeUnity:(nonnull NSNumber *)node)
RCT_EXTERN_METHOD(reattachUnityView:(nonnull NSNumber *)node)

@end
