#![allow(non_camel_case_types)]

use std::os::raw::c_char;

pub const GV_OK: i32 = 0;
pub const GV_ERR_NULL_INPUT: i32 = -1;
pub const GV_ERR_INVALID_DOT: i32 = -2;
pub const GV_ERR_LAYOUT_FAILED: i32 = -3;
pub const GV_ERR_RENDER_FAILED: i32 = -4;
pub const GV_ERR_INVALID_ENGINE: i32 = -5;
pub const GV_ERR_INVALID_FORMAT: i32 = -6;
pub const GV_ERR_OUT_OF_MEMORY: i32 = -7;
pub const GV_ERR_NOT_INITIALIZED: i32 = -8;

pub type gv_error_t = i32;

#[repr(C)]
pub struct gv_context_t {
    _opaque: [u8; 0],
}

extern "C" {
    pub fn gv_context_new() -> *mut gv_context_t;
    pub fn gv_context_free(ctx: *mut gv_context_t);
    pub fn gv_render(
        ctx: *mut gv_context_t,
        dot: *const c_char,
        engine: *const c_char,
        format: *const c_char,
        out_data: *mut *mut c_char,
        out_length: *mut usize,
    ) -> gv_error_t;
    pub fn gv_free_render_data(data: *mut c_char);
    pub fn gv_strerror(err: gv_error_t) -> *const c_char;
    pub fn gv_version() -> *const c_char;
}
