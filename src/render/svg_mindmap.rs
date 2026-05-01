//! Mindmap SVG renderer — placeholder.
//!
//! Returns an `Unsupported` error until the cose-bilkent layout port
//! lands. See `src/layout/mindmap.rs` and `tests/known_ignored.txt`
//! for status.

use crate::error::{MermaidError, Result};
use crate::layout::mindmap::MindmapLayout;
use crate::model::mindmap::MindmapDiagram;
use crate::theme::ThemeVariables;

pub fn render(
    _d: &MindmapDiagram,
    _l: &MindmapLayout,
    _theme: &ThemeVariables,
    _id: &str,
) -> Result<String> {
    Err(MermaidError::Unsupported(
        "mindmap rendering requires a cose-bilkent force-directed layout port (see tests/known_ignored.txt)".into(),
    ))
}
