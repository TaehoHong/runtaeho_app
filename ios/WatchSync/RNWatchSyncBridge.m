#import <React/RCTBridgeModule.h>
#import <React/RCTEventEmitter.h>
@interface RCT_EXTERN_MODULE(RNWatchSyncBridge, RCTEventEmitter)
RCT_EXTERN_METHOD(setOwnerUserId:(NSString * _Nullable)userId resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(getPendingRecords:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
RCT_EXTERN_METHOD(acknowledgeRecord:(NSString *)sessionId source:(NSString *)source ownerUserId:(NSString *)ownerUserId runningRecordId:(NSString *)runningRecordId resolver:(RCTPromiseResolveBlock)resolve rejecter:(RCTPromiseRejectBlock)reject)
@end
