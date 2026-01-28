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

// Unity Message Methods
RCT_EXTERN_METHOD(sendUnityMessage:(NSString *)objectName methodName:(NSString *)methodName parameter:(NSString *)parameter resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(sendUnityJSON:(NSString *)objectName methodName:(NSString *)methodName data:(NSArray *)data resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

// Native Promise Hold (Avatar Change And Wait)
RCT_EXTERN_METHOD(changeAvatarAndWait:(NSString *)objectName methodName:(NSString *)methodName data:(NSString *)data resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

// State Query Methods (Pull Pattern)
RCT_EXTERN_METHOD(isCharactorReady:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(resetCharactorReady:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

// Unity State Validation Methods
RCT_EXTERN_METHOD(validateUnityState:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(forceResetUnity:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

// v8: Unity Engine Ready Methods
RCT_EXTERN_METHOD(isEngineReady:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(initializeUnityEngine:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)

@end
