// Stub for web-only wasm packages on the RN bundle. RN routes diagrams
// through the per-engine native FFI wrappers (@kookyleo/supramark-*-native-rn);
// the *-web packages must never load on this platform but engines/src/*
// resolves them statically. Re-exporting nothing leaves any `await import(...)`
// call resolvable to an empty object, and downstream code in
// @supramark/engines/src/*/index.ts already throws a clear error if the
// expected entry points are missing.
module.exports = {};
