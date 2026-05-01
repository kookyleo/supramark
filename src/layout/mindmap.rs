//! Mindmap layout — placeholder.
//!
//! Upstream renders mindmaps with the cose-bilkent force-directed
//! layout (cytoscape extension, ~3000 LOC of physics simulation).
//! Byte-exact reproduction is out of reach for the MVP — every fixture
//! is currently routed through `tests/known_ignored.txt`. This module
//! exists so the dispatch in `lib.rs::convert_with_id` compiles, and
//! to anchor a future port.

use crate::error::Result;
use crate::model::mindmap::MindmapDiagram;
use crate::theme::ThemeVariables;

#[derive(Debug, Clone, Default)]
pub struct MindmapLayout {
    /// Final node geometry would land here once layout is ported.
    pub nodes: Vec<PositionedNode>,
}

#[derive(Debug, Clone)]
pub struct PositionedNode {
    pub id: usize,
    pub x: f64,
    pub y: f64,
    pub width: f64,
    pub height: f64,
}

/// Stub layout that simply returns an empty geometry. Callers should
/// not invoke the renderer until a real implementation lands.
pub fn layout(_d: &MindmapDiagram, _theme: &ThemeVariables) -> Result<MindmapLayout> {
    Ok(MindmapLayout::default())
}
