//
//  RNUnityBridge.m
//  RunTaeho
//
//  Created by Hong Taeho on 9/23/25.
//  React Native Bridge Module registration
//

#import <Foundation/Foundation.h>
#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>

@interface RCT_EXTERN_MODULE(RNUnityBridge, RCTEventEmitter)

// Unity Message Methods (순수 브리지)
RCT_EXTERN_METHOD(sendUnityMessage:(NSString *)objectName methodName:(NSString *)methodName parameter:(NSString *)parameter resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(sendUnityJSON:(NSString *)objectName methodName:(NSString *)methodName data:(NSArray *)data resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
