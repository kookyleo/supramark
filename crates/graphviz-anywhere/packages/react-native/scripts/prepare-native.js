#!/usr/bin/env node
/**
 * prepare-native.js — 把 build-android.sh 的产物（output/android/<abi>/）拷贝到
 * 包内，让 file: 协议安装后包自包含 .so + headers，yarn install 不丢。
 *
 * 产物有两份用途、两个目标路径：
 *   1. android/libs/<abi>/{lib,include}/  —— CMake 编译期链接 JNI 用
 *      (CMakeLists.txt 的 GRAPHVIZ_PREBUILT 指向 ../../libs/<abi>)
 *   2. android/src/main/jniLibs/<abi>/    —— gradle 打进 APK，运行期加载用
 *      (build.gradle 的 jniLibs.srcDirs = ["src/main/jniLibs"])
 *
 * Run this AFTER:
 *   - ANDROID_NDK_HOME=... ./scripts/build-android.sh  (产出 output/android/)
 *
 * Idempotent — re-running just refreshes.
 */

const fs = require('fs');
const path = require('path');

// crates/graphviz-anywhere/packages/react-native/scripts/ → 5 levels up
const REPO_ROOT = path.resolve(__dirname, '..', '..', '..', '..', '..');
const PKG_DIR = path.resolve(__dirname, '..');
const PROJECT_ROOT = path.resolve(PKG_DIR, '..', '..'); // crates/graphviz-anywhere
const TARGET_DIR = path.join(REPO_ROOT, 'target');

const ANDROID_OUTPUT = path.join(PROJECT_ROOT, 'output', 'android');
const ABIS = ['arm64-v8a', 'armeabi-v7a', 'x86_64', 'x86'];

// iOS xcframework（build-ios.sh 产物，约定放在 target/ios-xcframeworks/）
const IOS_XCFRAMEWORK_SRC = path.join(TARGET_DIR, 'ios-xcframeworks', 'GraphvizApi.xcframework');
const IOS_FRAMEWORKS_DEST = path.join(PKG_DIR, 'ios', 'Frameworks');

// CMake 编译期链接用（CMakeLists.txt 的 GRAPHVIZ_PREBUILT）
const LIBS_DEST = path.join(PKG_DIR, 'android', 'libs');
// gradle 打包进 APK 用（build.gradle 的 jniLibs.srcDirs）
const JNILIBS_DEST = path.join(PKG_DIR, 'android', 'src', 'main', 'jniLibs');

function fileExists(p) {
  try { fs.accessSync(p); return true; } catch { return false; }
}

function copyDirRecursive(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const entry of fs.readdirSync(src, { withFileTypes: true })) {
    const s = path.join(src, entry.name);
    const d = path.join(dest, entry.name);
    if (entry.isDirectory()) copyDirRecursive(s, d);
    else fs.copyFileSync(s, d);
  }
}

function prepareIOS() {
  if (!fileExists(IOS_XCFRAMEWORK_SRC)) {
    console.warn(`⚠  iOS xcframework not found at:\n   ${IOS_XCFRAMEWORK_SRC}`);
    console.warn(`   Run scripts/build-ios.sh, then assemble GraphvizApi.xcframework into target/ios-xcframeworks/.`);
    return false;
  }
  fs.rmSync(IOS_FRAMEWORKS_DEST, { recursive: true, force: true });
  fs.mkdirSync(IOS_FRAMEWORKS_DEST, { recursive: true });
  copyDirRecursive(IOS_XCFRAMEWORK_SRC, path.join(IOS_FRAMEWORKS_DEST, 'GraphvizApi.xcframework'));
  console.log(`✓ iOS: copied GraphvizApi.xcframework → ${path.relative(REPO_ROOT, IOS_FRAMEWORKS_DEST)}`);
  return true;
}

function prepareAndroid() {
  let anyFound = false;
  for (const abi of ABIS) {
    const srcSo = path.join(ANDROID_OUTPUT, abi, 'lib', 'libgraphviz_api.so');
    const srcHeader = path.join(ANDROID_OUTPUT, abi, 'include', 'graphviz_api.h');
    if (!fileExists(srcSo)) {
      console.warn(`⚠  Android ${abi}: missing ${path.relative(REPO_ROOT, srcSo)} (skip)`);
      continue;
    }

    // 1. libs/<abi>/lib + libs/<abi>/include（CMake 编译期）
    const libsAbiDir = path.join(LIBS_DEST, abi);
    fs.mkdirSync(path.join(libsAbiDir, 'lib'), { recursive: true });
    fs.mkdirSync(path.join(libsAbiDir, 'include'), { recursive: true });
    fs.copyFileSync(srcSo, path.join(libsAbiDir, 'lib', 'libgraphviz_api.so'));
    if (fileExists(srcHeader)) {
      fs.copyFileSync(srcHeader, path.join(libsAbiDir, 'include', 'graphviz_api.h'));
    }

    // 2. jniLibs/<abi>（gradle 打包）
    const jniLibsAbiDir = path.join(JNILIBS_DEST, abi);
    fs.mkdirSync(jniLibsAbiDir, { recursive: true });
    fs.copyFileSync(srcSo, path.join(jniLibsAbiDir, 'libgraphviz_api.so'));

    anyFound = true;
    console.log(`✓ Android ${abi}: copied .so → libs/${abi}/lib + jniLibs/${abi}/`);
  }
  return anyFound;
}

const ios = prepareIOS();
const android = prepareAndroid();
if (!ios && !android) {
  console.error('No native artefacts found. Run scripts/build-android.sh / build-ios.sh first.');
  process.exit(1);
}
