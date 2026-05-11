/*
 * SupramarkPlantumlModule.m — RN native module impl (iOS/macOS).
 *
 * Pulls PlantUML source from JS, dispatches to a serial background queue,
 * calls supramark_plantuml_render, and resolves the Promise with an UTF-8
 * SVG string.
 */

#import "SupramarkPlantumlModule.h"
#import "supramark_plantuml.h"

#import <React/RCTLog.h>

@implementation SupramarkPlantumlModule {
    dispatch_queue_t _renderQueue;
}

RCT_EXPORT_MODULE(SupramarkPlantumlNative)

- (instancetype)init {
    self = [super init];
    if (self) {
        _renderQueue = dispatch_queue_create("com.supramark.plantumlnative.render",
                                             DISPATCH_QUEUE_SERIAL);
    }
    return self;
}

+ (BOOL)requiresMainQueueSetup {
    return NO;
}

#pragma mark - render(source) -> Promise<string>

RCT_EXPORT_METHOD(render:(NSString *)source
                  resolve:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    if (source == nil) {
        reject(@"NULL_INPUT", @"render: source is null", nil);
        return;
    }
    NSData *sourceData = [source dataUsingEncoding:NSUTF8StringEncoding];
    if (sourceData == nil) {
        reject(@"NULL_INPUT", @"render: source is not valid UTF-8", nil);
        return;
    }

    dispatch_async(_renderQueue, ^{
        uint8_t *outBuf = NULL;
        size_t outLen = 0;
        int status = supramark_plantuml_render((const char *)[sourceData bytes],
                                               [sourceData length],
                                               &outBuf,
                                               &outLen);
        if (status != SUPRAMARK_PLANTUML_OK) {
            NSString *code;
            switch (status) {
                case SUPRAMARK_PLANTUML_ERR_PARSE:      code = @"PARSE_ERROR"; break;
                case SUPRAMARK_PLANTUML_ERR_RENDER:     code = @"RENDER_ERROR"; break;
                case SUPRAMARK_PLANTUML_ERR_NULL_INPUT: code = @"NULL_INPUT"; break;
                default:                          code = @"UNKNOWN"; break;
            }
            reject(code,
                   [NSString stringWithFormat:@"supramark_plantuml_render returned %d", status],
                   nil);
            return;
        }
        // Copy the buffer into NSString before freeing.
        NSString *svg = [[NSString alloc] initWithBytes:outBuf
                                                 length:outLen
                                               encoding:NSUTF8StringEncoding];
        supramark_plantuml_free(outBuf, outLen);
        if (svg == nil) {
            reject(@"RENDER_ERROR",
                   @"supramark_plantuml_render returned bytes that aren't valid UTF-8",
                   nil);
            return;
        }
        resolve(svg);
    });
}

#pragma mark - getVersion() -> Promise<string>

RCT_EXPORT_METHOD(getVersion:(RCTPromiseResolveBlock)resolve
                  reject:(RCTPromiseRejectBlock)reject)
{
    const char *v = supramark_plantuml_version();
    if (v == NULL) {
        reject(@"UNKNOWN", @"supramark_plantuml_version returned NULL", nil);
        return;
    }
    resolve([NSString stringWithUTF8String:v]);
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeSupramarkPlantumlSpecJSI>(params);
}
#endif

@end
