/*
 * SupramarkD2Module.h — RN native module header.
 *
 * Bridges JS `render(source)` calls to the C ABI exported by
 * libsupramark_d2_native.a:
 *
 *   int supramark_d2_render(const char *input, size_t input_len,
 *                           uint8_t **out_buf, size_t *out_len);
 *   void supramark_d2_free(uint8_t *buf, size_t len);
 *   const char *supramark_d2_version(void);
 *
 * See ../../include/supramark_d2.h for the full contract. Supports
 * both old (RCTBridgeModule) and new (TurboModule) architectures.
 */

#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <SupramarkD2NativeSpec/SupramarkD2NativeSpec.h>
#endif

@interface SupramarkD2Module : NSObject <RCTBridgeModule
#ifdef RCT_NEW_ARCH_ENABLED
  , NativeSupramarkD2Spec
#endif
>

@end
