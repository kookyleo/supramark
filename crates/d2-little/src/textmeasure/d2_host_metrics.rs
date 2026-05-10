//! D2HostMetrics — wasm-only [`D2Metrics`] adapter.
//!
//! Stub introduced in C1 so the `cfg(target_arch = "wasm32") pub mod`
//! declaration in `super::mod` resolves on every build target. The real
//! implementation (caller-side multi-line composition over
//! [`font_metrics_core::host_callback::HostCallbackMetrics`]) lands in C3.

#![cfg(target_arch = "wasm32")]

use super::{D2Metrics, MarkdownOptions};
use crate::fonts::Font;
use font_metrics_core::{Measured, Metrics, host_callback::HostCallbackMetrics};
use std::cell::Cell;

/// Adapter that bridges d2's [`D2Metrics`] surface to the host
/// `canvas.measureText` callback. See [`super`] module docs.
pub struct D2HostMetrics {
    inner: HostCallbackMetrics,
    line_height_factor: Cell<f64>,
}

impl Default for D2HostMetrics {
    fn default() -> Self {
        Self::new()
    }
}

impl D2HostMetrics {
    pub fn new() -> Self {
        Self {
            inner: HostCallbackMetrics,
            line_height_factor: Cell::new(1.0),
        }
    }
}

impl Metrics for D2HostMetrics {
    fn measure(
        &self,
        text: &str,
        family: &str,
        size: f64,
        bold: bool,
        italic: bool,
    ) -> Measured {
        // C1 stub: delegate single-line; multi-line composition is C3.
        self.inner.measure(text, family, size, bold, italic)
    }
}

impl D2Metrics for D2HostMetrics {
    fn line_height_factor(&self) -> f64 {
        self.line_height_factor.get()
    }

    fn set_line_height_factor(&self, value: f64) {
        self.line_height_factor.set(value);
    }

    fn measure_text(&self, _font: Font, _s: &str) -> (i32, i32) {
        // C1 stub — replaced in C3.
        (0, 0)
    }

    fn measure_mono(&self, _font: Font, _s: &str) -> (i32, i32) {
        (0, 0)
    }

    fn measure_precise(&self, _font: Font, _s: &str) -> (f64, f64) {
        (0.0, 0.0)
    }

    fn space_width(&self, _font: Font) -> f64 {
        0.0
    }

    fn scale_unicode(&self, w: f64, _font: Font, _s: &str) -> f64 {
        w
    }

    fn measure_markdown(
        &self,
        _md_text: &str,
        _opts: MarkdownOptions,
        _font_size: i32,
    ) -> Result<(i32, i32), String> {
        Err("D2HostMetrics::measure_markdown stub (C1) — implemented in C3".into())
    }
}
