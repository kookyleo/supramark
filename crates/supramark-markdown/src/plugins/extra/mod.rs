//! Markdown extensions beyond CommonMark.
//!
//! GFM extras: strikethrough, tables, linkify (feature-gated) and `syntect`
//! code highlighting (feature-gated). Supramark block extensions: math,
//! footnote, definition lists, and the `:::`/`%%%` blocks in `ext`.

#[cfg(feature = "linkify")]
pub mod linkify;
pub mod deflist;
pub mod ext;
pub mod footnote;
pub mod math;
pub mod strikethrough;
#[cfg(feature = "syntect")]
pub mod syntect;
pub mod tables;
