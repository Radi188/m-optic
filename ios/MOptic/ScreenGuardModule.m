#import <React/RCTBridgeModule.h>

// The implementation lives in ScreenGuardModule.swift; this only exports it to
// JS, which the Swift side cannot do on its own.
@interface RCT_EXTERN_MODULE(ScreenGuardModule, NSObject)

RCT_EXTERN_METHOD(allowCapture
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(blockCapture
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

RCT_EXTERN_METHOD(isCaptureAllowed
                  : (RCTPromiseResolveBlock)resolve rejecter
                  : (RCTPromiseRejectBlock)reject)

@end
