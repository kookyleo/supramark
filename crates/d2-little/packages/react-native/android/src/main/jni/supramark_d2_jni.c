/*
 * supramark_d2_jni.c — JNI bridge between Java SupramarkD2Module
 * and the C ABI exported by libsupramark_d2_native.so.
 *
 * Function naming follows JNI mangling for class
 * com.supramark.d2native.SupramarkD2Module — static native methods
 * `nativeRender(String) -> String` and `nativeGetVersion() -> String`.
 */

#include <jni.h>
#include <string.h>
#include <stdlib.h>
#include <android/log.h>

#include "supramark_d2.h"

#define TAG "SupramarkD2JNI"
#define LOGE(...) __android_log_print(ANDROID_LOG_ERROR, TAG, __VA_ARGS__)

JNIEXPORT jstring JNICALL
Java_com_supramark_d2native_SupramarkD2Module_nativeRender(
    JNIEnv *env, jclass cls, jstring jSource, jintArray jStatusOut)
{
    (void)cls;
    if (jSource == NULL) {
        if (jStatusOut != NULL) {
            jint err = SUPRAMARK_D2_ERR_NULL_INPUT;
            (*env)->SetIntArrayRegion(env, jStatusOut, 0, 1, &err);
        }
        return NULL;
    }

    const char *src = (*env)->GetStringUTFChars(env, jSource, NULL);
    jsize       srcLen = (*env)->GetStringUTFLength(env, jSource);
    if (src == NULL) {
        if (jStatusOut != NULL) {
            jint err = SUPRAMARK_D2_ERR_NULL_INPUT;
            (*env)->SetIntArrayRegion(env, jStatusOut, 0, 1, &err);
        }
        return NULL;
    }

    uint8_t *outBuf = NULL;
    size_t   outLen = 0;
    int status = supramark_d2_render(src, (size_t)srcLen, &outBuf, &outLen);
    (*env)->ReleaseStringUTFChars(env, jSource, src);

    if (jStatusOut != NULL) {
        jint s = status;
        (*env)->SetIntArrayRegion(env, jStatusOut, 0, 1, &s);
    }

    if (status != SUPRAMARK_D2_OK) {
        LOGE("supramark_d2_render returned %d", status);
        return NULL;
    }

    // The buffer is UTF-8 but not NUL-terminated. NewStringUTF needs
    // a C string; allocate a NUL-terminated copy.
    char *cstr = (char *)malloc(outLen + 1);
    if (cstr == NULL) {
        supramark_d2_free(outBuf, outLen);
        if (jStatusOut != NULL) {
            jint err = SUPRAMARK_D2_ERR_RENDER;
            (*env)->SetIntArrayRegion(env, jStatusOut, 0, 1, &err);
        }
        return NULL;
    }
    memcpy(cstr, outBuf, outLen);
    cstr[outLen] = '\0';
    supramark_d2_free(outBuf, outLen);

    jstring result = (*env)->NewStringUTF(env, cstr);
    free(cstr);
    return result;
}

JNIEXPORT jstring JNICALL
Java_com_supramark_d2native_SupramarkD2Module_nativeGetVersion(
    JNIEnv *env, jclass cls)
{
    (void)cls;
    const char *v = supramark_d2_version();
    if (v == NULL) return NULL;
    return (*env)->NewStringUTF(env, v);
}
