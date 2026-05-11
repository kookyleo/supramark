/*
 * supramark_d2_jni.c — JNI bridge between Java SupramarkMermaidModule
 * and the C ABI exported by libsupramark_mermaid_native.so.
 *
 * Function naming follows JNI mangling for class
 * com.supramark.mermaidnative.SupramarkMermaidModule — static native methods
 * `nativeRender(String) -> String` and `nativeGetVersion() -> String`.
 */

#include <jni.h>
#include <string.h>
#include <stdlib.h>
#include <android/log.h>

#include "supramark_mermaid.h"

#define TAG "SupramarkMermaidJNI"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

JNIEXPORT jstring JNICALL
Java_com_supramark_mermaidnative_SupramarkMermaidModule_nativeRender(
    JNIEnv *env, jclass cls, jstring jSource, jintArray jStatusOut)
{
    (void)cls;
    if (jSource == NULL) {
        if (jStatusOut != NULL) {
            jint err = SUPRAMARK_MERMAID_ERR_NULL_INPUT;
            (*env)->SetIntArrayRegion(env, jStatusOut, 0, 1, &err);
        }
        return NULL;
    }

    const char *src = (*env)->GetStringUTFChars(env, jSource, NULL);
    jsize       srcLen = (*env)->GetStringUTFLength(env, jSource);
    if (src == NULL) {
        if (jStatusOut != NULL) {
            jint err = SUPRAMARK_MERMAID_ERR_NULL_INPUT;
            (*env)->SetIntArrayRegion(env, jStatusOut, 0, 1, &err);
        }
        return NULL;
    }

    uint8_t *outBuf = NULL;
    size_t   outLen = 0;
    int status = supramark_mermaid_render(src, (size_t)srcLen, &outBuf, &outLen);
    (*env)->ReleaseStringUTFChars(env, jSource, src);

    if (jStatusOut != NULL) {
        jint s = status;
        (*env)->SetIntArrayRegion(env, jStatusOut, 0, 1, &s);
    }

    if (status != SUPRAMARK_MERMAID_OK) {
        LOGE("supramark_mermaid_render returned %d", status);
        return NULL;
    }

    // The buffer is UTF-8 but not NUL-terminated. NewStringUTF needs
    // a C string; allocate a NUL-terminated copy.
    char *cstr = (char *)malloc(outLen + 1);
    if (cstr == NULL) {
        supramark_mermaid_free(outBuf, outLen);
        if (jStatusOut != NULL) {
            jint err = SUPRAMARK_MERMAID_ERR_RENDER;
            (*env)->SetIntArrayRegion(env, jStatusOut, 0, 1, &err);
        }
        return NULL;
    }
    memcpy(cstr, outBuf, outLen);
    cstr[outLen] = '\0';
    supramark_mermaid_free(outBuf, outLen);

    jstring result = (*env)->NewStringUTF(env, cstr);
    free(cstr);
    return result;
}

JNIEXPORT jstring JNICALL
Java_com_supramark_mermaidnative_SupramarkMermaidModule_nativeGetVersion(
    JNIEnv *env, jclass cls)
{
    (void)cls;
    const char *v = supramark_mermaid_version();
    if (v == NULL) return NULL;
    return (*env)->NewStringUTF(env, v);
}
