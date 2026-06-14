# supramark-markdown

Rust-first Markdown parser for Supramark.

Input: Markdown source.

Output: Supramark AST v2.

This crate owns the parser core, AST v2 schema, source map contract, and parse orchestration in one place. Some parser-core implementation code was adapted from `markdown-it-rust/markdown-it` as a code-level reference; Supramark does not preserve upstream API compatibility.

Public API is intentionally narrow: `parse(&str) -> SupramarkNode` plus the AST v2 data types. Internal `MarkdownParser`, `Node`, rule, and plugin APIs are implementation details.

Current guarantees:

- Outputs a serde-serializable Supramark AST v2.
- Every mapped node carries source `position` when the parser core provides `srcmap`.
- Positions include both UTF-8 byte offsets and UTF-16 offsets for JS/RN editor integration.
- Core CommonMark nodes, GFM tables, strikethrough, and diagram fences are mapped.

Parsing model:

- A single block/inline pass produces the AST v2; each node builds its own v2
  form in-rule, so there is no centralized post-walk mapper.
- Math, footnote, definition-list, and `:::`/`%%%` extension blocks are native
  block rules, so they compose and nest inside lists, blockquotes, and one
  another like any other CommonMark block.
- Extension containers/inputs capture opaque content and dispatch by name; an
  unclosed opener surfaces a diagnostic on the root node.
