#!/usr/bin/env bash
# Manually assemble an iOS .xcframework from per-target static libs.
# Used as a workaround when `xcodebuild -create-xcframework` is broken
# (e.g. Xcode 26.4.1 IDESimulatorFoundation / DVTDownloads plug-in load
# failure on macOS 26.3.x). The output layout matches what xcodebuild
# would emit for two slices: `ios-arm64` and `ios-arm64_x86_64-simulator`.
#
# Usage:
#   scripts/build-ios-xcframework.sh <crate-name> <header-dir> <library-name> <output-xcframework>
#
# Example:
#   scripts/build-ios-xcframework.sh supramark-d2-native \
#     crates/d2-little/packages/native/include \
#     libsupramark_d2_native.a \
#     target/ios-xcframeworks/SupramarkD2.xcframework
#
# Expects these to already exist under target/:
#   target/aarch64-apple-ios/release/<library-name>
#   target/ios-sim-universal/release/<library-name>     (lipo of arm64-sim + x86_64-sim)

set -euo pipefail

if [[ $# -ne 4 ]]; then
  echo "usage: $0 <crate-name> <header-dir> <library-name> <output-xcframework>" >&2
  exit 2
fi

CRATE="$1"
HEADERS_SRC="$2"
LIB_NAME="$3"
OUT="$4"

DEVICE_LIB="target/aarch64-apple-ios/release/${LIB_NAME}"
SIM_LIB="target/ios-sim-universal/release/${LIB_NAME}"

for f in "${DEVICE_LIB}" "${SIM_LIB}"; do
  if [[ ! -f "${f}" ]]; then
    echo "missing input: ${f}" >&2
    exit 1
  fi
done
if [[ ! -d "${HEADERS_SRC}" ]]; then
  echo "missing header dir: ${HEADERS_SRC}" >&2
  exit 1
fi

rm -rf "${OUT}"
mkdir -p "${OUT}/ios-arm64/Headers" "${OUT}/ios-arm64_x86_64-simulator/Headers"

cp "${DEVICE_LIB}" "${OUT}/ios-arm64/${LIB_NAME}"
cp "${SIM_LIB}"    "${OUT}/ios-arm64_x86_64-simulator/${LIB_NAME}"
cp -R "${HEADERS_SRC}/." "${OUT}/ios-arm64/Headers/"
cp -R "${HEADERS_SRC}/." "${OUT}/ios-arm64_x86_64-simulator/Headers/"

cat > "${OUT}/Info.plist" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
	<key>AvailableLibraries</key>
	<array>
		<dict>
			<key>BinaryPath</key>
			<string>${LIB_NAME}</string>
			<key>HeadersPath</key>
			<string>Headers</string>
			<key>LibraryIdentifier</key>
			<string>ios-arm64</string>
			<key>LibraryPath</key>
			<string>${LIB_NAME}</string>
			<key>SupportedArchitectures</key>
			<array>
				<string>arm64</string>
			</array>
			<key>SupportedPlatform</key>
			<string>ios</string>
		</dict>
		<dict>
			<key>BinaryPath</key>
			<string>${LIB_NAME}</string>
			<key>HeadersPath</key>
			<string>Headers</string>
			<key>LibraryIdentifier</key>
			<string>ios-arm64_x86_64-simulator</string>
			<key>LibraryPath</key>
			<string>${LIB_NAME}</string>
			<key>SupportedArchitectures</key>
			<array>
				<string>arm64</string>
				<string>x86_64</string>
			</array>
			<key>SupportedPlatform</key>
			<string>ios</string>
			<key>SupportedPlatformVariant</key>
			<string>simulator</string>
		</dict>
	</array>
	<key>CFBundlePackageType</key>
	<string>XFWK</string>
	<key>XCFrameworkFormatVersion</key>
	<string>1.0</string>
</dict>
</plist>
PLIST

echo "Built ${OUT}"
echo "  ios-arm64                       : $(lipo -info "${OUT}/ios-arm64/${LIB_NAME}" 2>&1 | sed 's/^.*: //')"
echo "  ios-arm64_x86_64-simulator      : $(lipo -info "${OUT}/ios-arm64_x86_64-simulator/${LIB_NAME}" 2>&1 | sed 's/^.*: //')"
