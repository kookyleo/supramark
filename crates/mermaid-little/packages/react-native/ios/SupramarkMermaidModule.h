/*
 * SupramarkMermaidModule.h — RN native module header.
 *
 * Bridges JS `render(source)` calls to the C ABI exported by
 * libsupramark_mermaid_native.a:
 *
 *   int supramark_mermaid_render(const char *input, size_t input_len,
 *                           uint8_t **out_buf, size_t *out_len);
 *   void supramark_mermaid_free(uint8_t *buf, size_t len);
 *   const char *supramark_mermaid_version(void);
 *
 * See ../../include/supramark_mermaid.h for the full contract. Supports
 * both old (RCTBridgeModule) and new (TurboModule) architectures.
 */

#import <React/RCTBridgeModule.h>

#ifdef RCT_NEW_ARCH_ENABLED
#import <SupramarkMermaidNativeSpec/SupramarkMermaidNativeSpec.h>
#endif

@interface SupramarkMermaidModule : NSObject <RCTBridgeModule
#ifdef RCT_NEW_ARCH_ENABLED
  , NativeSupramarkMermaidSpec
#endif
>

@end
