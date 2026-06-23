//! Native FFI wrapper around `supramark-markdown`.
//!
//! Mirrors the wasm-bindgen surface in `crates/supramark-markdown/packages/web`
//! but exposes a C ABI so React Native, iOS, Android, and other native
//! hosts can link against `libsupramark_markdown_native.{a,so,dylib}` and
//! call `supramark_markdown_parse_json(...)` to turn a Markdown source
//! string into an AST v2 JSON byte buffer.
//!
//! Error handling
//! --------------
//! All entry points return `int32_t` status codes (see
//! `SUPRAMARK_MARKDOWN_*` constants in `include/supramark_markdown.h`).
//! Out-parameters are written only on success. On failure they are
//! zero-initialised so callers that forget to check the return code at
//! least see `NULL` / `0`.
//!
//! Memory ownership
//! ----------------
//! `supramark_markdown_parse_json` heap-allocates the JSON buffer via
//! Rust's global allocator. Callers MUST release it through
//! `supramark_markdown_free(buf, len)` to match the allocator that
//! produced it; calling `free(3)` from C is undefined behaviour because
//! the Rust allocator may be jemalloc/mimalloc in a host build.

use std::ffi::{CStr, c_char};
use std::os::raw::c_int;
use std::ptr;
use std::slice;

// ---------------------------------------------------------------------------
// Status codes — keep in sync with include/supramark_markdown.h
// ---------------------------------------------------------------------------

/// Parse succeeded; `*out_buf` / `*out_len` are populated.
pub const SUPRAMARK_MARKDOWN_OK: c_int = 0;
/// AST serialization to JSON failed. In practice this should never
/// happen for a well-formed `SupramarkNode`, but we surface it as a
/// distinct code so hosts can distinguish allocator/serializer faults
/// from input issues.
pub const SUPRAMARK_MARKDOWN_ERR_SERIALIZE: c_int = 1;
/// `input` or one of the out-parameter pointers was NULL, or `input`
/// was not valid UTF-8 / not NUL-terminated within `input_len` bytes.
pub const SUPRAMARK_MARKDOWN_ERR_NULL_INPUT: c_int = 2;

// ---------------------------------------------------------------------------
// Public C ABI
// ---------------------------------------------------------------------------

/// Parse a Markdown source string into AST v2 JSON.
///
/// On success returns [`SUPRAMARK_MARKDOWN_OK`] and writes a
/// heap-allocated, non-NUL-terminated UTF-8 JSON byte buffer to
/// `*out_buf` together with its length (in bytes) in `*out_len`. The
/// caller MUST release the buffer with [`supramark_markdown_free`].
///
/// `input` may be either a NUL-terminated C string (pass
/// `input_len = 0`, in which case the wrapper computes the length with
/// `strlen`) or an explicit-length byte buffer (pass `input_len > 0`,
/// in which case the buffer does NOT need to be NUL-terminated). The
/// latter is preferred because it avoids a redundant scan on large
/// inputs.
///
/// The returned JSON matches the schema produced by
/// `@supramark/markdown-web`'s `parse_json` (the wasm-bindgen wrapper),
/// so JS consumers can `JSON.parse` it identically across Web / Node /
/// RN runtimes.
///
/// # Safety
///
/// All pointer arguments are dereferenced. The caller must ensure:
///   * `input` points to at least `input_len` readable bytes (or, when
///     `input_len == 0`, to a NUL-terminated C string).
///   * `out_buf` and `out_len` are valid, writable, non-aliasing.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn supramark_markdown_parse_json(
    input: *const c_char,
    input_len: usize,
    out_buf: *mut *mut c_char,
    out_len: *mut usize,
) -> c_int {
    if out_buf.is_null() || out_len.is_null() {
        return SUPRAMARK_MARKDOWN_ERR_NULL_INPUT;
    }
    // SAFETY: out_buf / out_len null-checked just above; caller
    // contracted them as writable, non-aliasing.
    unsafe {
        *out_buf = ptr::null_mut();
        *out_len = 0;
    }

    if input.is_null() {
        return SUPRAMARK_MARKDOWN_ERR_NULL_INPUT;
    }

    let input_bytes: &[u8] = if input_len == 0 {
        // SAFETY: caller guaranteed NUL-terminated valid C string.
        let cstr = unsafe { CStr::from_ptr(input) };
        match cstr.to_bytes_with_nul().split_last() {
            Some((_nul, body)) => body,
            None => return SUPRAMARK_MARKDOWN_ERR_NULL_INPUT,
        }
    } else {
        // SAFETY: caller guaranteed `input_len` readable bytes at `input`.
        unsafe { slice::from_raw_parts(input as *const u8, input_len) }
    };

    let input_str = match std::str::from_utf8(input_bytes) {
        Ok(s) => s,
        Err(_) => return SUPRAMARK_MARKDOWN_ERR_NULL_INPUT,
    };

    // 主 crate 的 `parse` 不返回 Result：内部解析失败会以 diagnostics
    // 字段的形式挂到 AST 上，不会抛错。所以这里只可能因 serde_json
    // 序列化失败而报错（实际几乎不会发生）。
    let node = supramark_markdown::parse(input_str);
    let json_bytes = match serde_json::to_vec(&node) {
        Ok(bytes) => bytes,
        Err(_) => return SUPRAMARK_MARKDOWN_ERR_SERIALIZE,
    };

    let len = json_bytes.len();
    let boxed: Box<[u8]> = json_bytes.into_boxed_slice();
    let raw: *mut u8 = Box::into_raw(boxed) as *mut u8;
    // SAFETY: out_buf / out_len null-checked at function entry.
    unsafe {
        *out_buf = raw as *mut c_char;
        *out_len = len;
    }
    SUPRAMARK_MARKDOWN_OK
}

/// Release a buffer previously returned by
/// [`supramark_markdown_parse_json`].
///
/// Passing `(NULL, 0)` is a no-op. Passing a buffer that did not come
/// from `supramark_markdown_parse_json`, or a `len` that does not match
/// the original allocation, is undefined behaviour.
///
/// # Safety
///
/// See module-level "Memory ownership" note. `buf` must have been
/// produced by [`supramark_markdown_parse_json`] and not yet freed;
/// `len` must equal the `out_len` value the parse call wrote.
#[unsafe(no_mangle)]
pub unsafe extern "C" fn supramark_markdown_free(buf: *mut c_char, len: usize) {
    if buf.is_null() || len == 0 {
        return;
    }
    let slice_ptr = ptr::slice_from_raw_parts_mut(buf as *mut u8, len);
    // SAFETY: caller contracts buf+len match a prior parse call.
    unsafe { drop(Box::from_raw(slice_ptr)) };
}

/// Returns a static, NUL-terminated UTF-8 C string with this wrapper
/// crate's version (matches the `supramark-markdown` crate version it
/// wraps).
///
/// The returned pointer is valid for the lifetime of the loaded
/// library; callers must NOT free it.
#[unsafe(no_mangle)]
pub extern "C" fn supramark_markdown_version() -> *const c_char {
    static VERSION: &[u8] = concat!(env!("CARGO_PKG_VERSION"), "\0").as_bytes();
    VERSION.as_ptr() as *const c_char
}

// ---------------------------------------------------------------------------
// Tests — exercised via `cargo test -p supramark-markdown-native`.
// ---------------------------------------------------------------------------

#[cfg(test)]
mod tests {
    use super::*;
    use std::ffi::CString;

    /// 最小 Markdown 输入 → 期望返回合法 JSON。
    #[test]
    fn parse_roundtrip_simple() {
        let src = CString::new("# Hello").unwrap();
        let mut out_buf: *mut c_char = ptr::null_mut();
        let mut out_len: usize = 0;

        let rc = unsafe {
            supramark_markdown_parse_json(
                src.as_ptr(),
                0,
                &mut out_buf as *mut *mut c_char,
                &mut out_len as *mut usize,
            )
        };
        assert_eq!(rc, SUPRAMARK_MARKDOWN_OK, "parse returned {rc}");
        assert!(!out_buf.is_null());
        assert!(out_len > 0);

        let json = unsafe { slice::from_raw_parts(out_buf as *const u8, out_len) };
        let json_str = std::str::from_utf8(json).expect("JSON must be UTF-8");
        // AST v2 root 节点带 type 字段
        assert!(json_str.contains("\"type\""), "expected type field in JSON");

        unsafe { supramark_markdown_free(out_buf, out_len) };
    }

    /// 显式长度路径（input 不需要 NUL 结尾）。
    #[test]
    fn parse_with_explicit_length() {
        let src = b"# Hello";
        let mut out_buf: *mut c_char = ptr::null_mut();
        let mut out_len: usize = 0;
        let rc = unsafe {
            supramark_markdown_parse_json(
                src.as_ptr() as *const c_char,
                src.len(),
                &mut out_buf,
                &mut out_len,
            )
        };
        assert_eq!(rc, SUPRAMARK_MARKDOWN_OK);
        assert!(out_len > 0);
        unsafe { supramark_markdown_free(out_buf, out_len) };
    }

    /// NULL input → ERR_NULL_INPUT，out-params 保持原状。
    #[test]
    fn parse_null_input() {
        let mut out_buf: *mut c_char = ptr::null_mut();
        let mut out_len: usize = 0;
        let rc = unsafe {
            supramark_markdown_parse_json(ptr::null(), 0, &mut out_buf, &mut out_len)
        };
        assert_eq!(rc, SUPRAMARK_MARKDOWN_ERR_NULL_INPUT);
        assert!(out_buf.is_null());
        assert_eq!(out_len, 0);
    }

    /// NULL out-params → ERR_NULL_INPUT（不崩溃）。
    #[test]
    fn parse_null_outparams() {
        let src = CString::new("a").unwrap();
        let rc = unsafe {
            supramark_markdown_parse_json(src.as_ptr(), 0, ptr::null_mut(), ptr::null_mut())
        };
        assert_eq!(rc, SUPRAMARK_MARKDOWN_ERR_NULL_INPUT);
    }

    /// Free of (NULL, 0) 是 no-op（不能崩）。
    #[test]
    fn free_null_is_noop() {
        unsafe { supramark_markdown_free(ptr::null_mut(), 0) };
    }

    /// Version 字符串非空，且与 crate 版本一致。
    #[test]
    fn version_string() {
        let p = supramark_markdown_version();
        assert!(!p.is_null());
        let s = unsafe { CStr::from_ptr(p) }.to_str().unwrap();
        assert_eq!(s, env!("CARGO_PKG_VERSION"));
    }

    /// 解析出的 JSON 能被 serde_json 还原成同样的结构（round-trip）。
    #[test]
    fn json_is_parseable() {
        let src = CString::new("# Title\n\nparagraph **bold**").unwrap();
        let mut out_buf: *mut c_char = ptr::null_mut();
        let mut out_len: usize = 0;
        let rc = unsafe {
            supramark_markdown_parse_json(src.as_ptr(), 0, &mut out_buf, &mut out_len)
        };
        assert_eq!(rc, SUPRAMARK_MARKDOWN_OK);

        let json = unsafe { slice::from_raw_parts(out_buf as *const u8, out_len) };
        let value: serde_json::Value = serde_json::from_slice(json).expect("must be valid JSON");
        assert_eq!(value["type"], "root");

        unsafe { supramark_markdown_free(out_buf, out_len) };
    }
}
