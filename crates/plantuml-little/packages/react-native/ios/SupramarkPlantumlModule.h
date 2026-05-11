/*
 * SupramarkPlantumlModule.h — RN native module header.
 *
 * Bridges JS `render(source)` calls to the C ABI exported by
 * libsupramark_plantuml_native.a:
 *
 *   int supramark_plantuml_render(const char *input, size_t input_len,
 *                           uint8_t **out_buf, size_t *out_len);
 *   void supramark_plantuml_free(uint8_t *buf, size_t len);
 *   const char *supramark_plantuml_version(void);
 *
 * See ../../include/supramark_plantuml.h for the full contract. Supports
 * both old (RCTBridgeModule) and new (TurboModule) architectures.
 */

#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <SupramarkPlantumlNativeSpec/SupramarkPlantumlNativeSpec.h>
#endif

@interface SupramarkPlantumlModule : NSObject <RCTBridgeModule
#ifdef RCT_NEW_ARCH_ENABLED
  , NativeSupramarkPlantumlSpec
#endif
>

@end
