/*
 * SupramarkMermaidModule.m — RN native module impl (iOS/macOS).
 *
 * Pulls Mermaid source from JS, dispatches to a serial background queue,
 * calls supramark_mermaid_render, and resolves the Promise with an UTF-8
 * SVG string.
 */

#import "SupramarkMermaidModule.h"
#import "supramark_mermaid.h"

#import <React/RCTLog.h>

@implementation SupramarkMermaidModule {
    dispatch_queue_t _renderQueue;
}

RCT_EXPORT_MODULE(SupramarkMermaidNative)

- (instancetype)init {
    self = [super init];
    if (self) {
        _renderQueue = dispatch_queue_create("com.supramark.mermaidnative.render",
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
        int32_t status = supramark_mermaid_render((const uint8_t *)[sourceData bytes],
                                                  [sourceData length],
                                                  &outBuf,
                                                  &outLen);
        if (status != SUPRAMARK_MERMAID_OK) {
            NSString *code;
            switch (status) {
                case SUPRAMARK_MERMAID_ERR_PARSE:      code = @"PARSE_ERROR"; break;
                case SUPRAMARK_MERMAID_ERR_RENDER:     code = @"RENDER_ERROR"; break;
                case SUPRAMARK_MERMAID_ERR_NULL_INPUT: code = @"NULL_INPUT"; break;
                default:                          code = @"UNKNOWN"; break;
            }
            reject(code,
                   [NSString stringWithFormat:@"supramark_mermaid_render returned %d", status],
                   nil);
            return;
        }
        // Copy the buffer into NSString before freeing.
        NSString *svg = [[NSString alloc] initWithBytes:outBuf
                                                 length:outLen
                                               encoding:NSUTF8StringEncoding];
        supramark_mermaid_free(outBuf, outLen);
        if (svg == nil) {
            reject(@"RENDER_ERROR",
                   @"supramark_mermaid_render returned bytes that aren't valid UTF-8",
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
    const char *v = supramark_mermaid_version();
    if (v == NULL) {
        reject(@"UNKNOWN", @"supramark_mermaid_version returned NULL", nil);
        return;
    }
    resolve([NSString stringWithUTF8String:v]);
}

#ifdef RCT_NEW_ARCH_ENABLED
- (std::shared_ptr<facebook::react::TurboModule>)getTurboModule:
    (const facebook::react::ObjCTurboModule::InitParams &)params
{
    return std::make_shared<facebook::react::NativeSupramarkMermaidSpecJSI>(params);
}
#endif

@end
