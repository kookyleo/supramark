//! Host-side text-measurement callback bridge.
//!
//! When the wasm module runs inside a browser or React Native host
//! that already has a real text renderer, the cleanest way to keep
//! Layer 1 (in-wasm layout) consistent with Layer 3 (browser /
//! RN-svg actual rendering) is to defer measurement to the host.
//! The host injects a callback (e.g. wrapping
//! `canvas.getContext('2d').measureText` or
//! `react-native-skia.Skia.Text.Measure`) at module init via
//! wasm-bindgen externs; this struct adapts those externs to the
//! [`crate::Metrics`] trait.
//!
//! # Status
//!
//! Skeleton — the actual extern declarations and JS-side bridge are
//! introduced in the wasm-engines integration pass. For now this
//! file just exists so [`crate::Metrics`] has a wasm-target impl
//! shape on the books, and so consumers can sketch their host-side
//! initialisation against a stable type name.

#![cfg(target_arch = "wasm32")]

use crate::Metrics;

/// Adapter that defers every measurement to a host-supplied
/// callback (e.g. browser `canvas.measureText`).
///
/// Currently a stub: methods return placeholder values until the
/// wasm-bindgen extern bridge lands. See module docs.
#[derive(Debug, Clone, Copy, Default)]
pub struct HostCallbackMetrics;

impl Metrics for HostCallbackMetrics {
    fn char_width(&self, _ch: char, _family: &str, size: f64, _bold: bool, _italic: bool) -> f64 {
        // TODO: wire up wasm-bindgen extern calling host's
        // measureText with the single-character string.
        size * 0.6
    }

    fn text_width(&self, text: &str, _family: &str, size: f64, _bold: bool, _italic: bool) -> f64 {
        // TODO: as above, but on the full string in one call.
        text.chars().count() as f64 * size * 0.6
    }

    fn line_height(&self, _family: &str, size: f64, _bold: bool, _italic: bool) -> f64 {
        size * 1.2
    }

    fn ascent(&self, _family: &str, size: f64, _bold: bool, _italic: bool) -> f64 {
        size * 0.8
    }

    fn descent(&self, _family: &str, size: f64, _bold: bool, _italic: bool) -> f64 {
        size * 0.2
    }

    fn typo_ascent(&self, family: &str, size: f64, bold: bool, italic: bool) -> f64 {
        self.ascent(family, size, bold, italic)
    }
}
