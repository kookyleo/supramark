cmake_minimum_required(VERSION 3.22.1)
project(supramark_plantuml_jni)

# Pre-built libsupramark_plantuml_native.so for this ABI — staged by
# scripts/prepare-native.js under jniLibs/<abi>/. We import it as a
# SHARED library so the host's APK bundles a single .so per ABI.
set(PlantUML_NATIVE_DIR "${CMAKE_CURRENT_SOURCE_DIR}/jniLibs/${ANDROID_ABI}")
set(PlantUML_NATIVE_LIB "${PlantUML_NATIVE_DIR}/libsupramark_plantuml_native.so")

if(NOT EXISTS "${PlantUML_NATIVE_LIB}")
    message(FATAL_ERROR
        "Missing prebuilt supramark-plantuml-native library:\n"
        "  ${PlantUML_NATIVE_LIB}\n"
        "Run `cargo ndk -t arm64-v8a -t armeabi-v7a -t x86_64 -t x86 build "
        "--release -p supramark-plantuml-native` and then "
        "`node scripts/prepare-native.js` in this package."
    )
endif()

# Header path: prepare-native.js 把 C ABI header 拷贝到包内的
# jni/include/，让包自包含（file: 协议安装后包被拷贝到消费者 node_modules，
# 原先指向 monorepo 内 native crate 的相对路径会断裂）。
set(SUPRAMARK_PLANTUML_INCLUDE
    "${CMAKE_CURRENT_SOURCE_DIR}/jni/include")

add_library(supramark_plantuml_native SHARED IMPORTED)
set_target_properties(supramark_plantuml_native PROPERTIES
    IMPORTED_NO_SONAME TRUE
    IMPORTED_LOCATION "${PlantUML_NATIVE_LIB}"
)

add_library(supramark_plantuml_jni SHARED
    jni/supramark_plantuml_jni.c
)

target_include_directories(supramark_plantuml_jni PRIVATE
    "${SUPRAMARK_PLANTUML_INCLUDE}"
)

find_library(log-lib log)
target_link_libraries(supramark_plantuml_jni
    supramark_plantuml_native
    ${log-lib}
)
