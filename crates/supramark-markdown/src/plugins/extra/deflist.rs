//! Supramark definition lists.
//!
//! One or more term lines followed by `: description` lines, repeated until a
//! blank line. Migrated from the document-level prescan to a block rule that
//! builds `DefList > DefItem > (DefTerm | DefDesc)` nodes; each node's
//! `to_ast_v2` yields the matching v2 node. Terms hold inline content;
//! descriptions wrap their content in a paragraph (matching prior behaviour).
use crate::parser::block::{BlockRule, BlockState};
use crate::parser::inline::InlineRoot;
use crate::plugins::cmark::block::paragraph::Paragraph;
use crate::{MarkdownParser, Node, NodeValue, Renderer};

macro_rules! def_node {
    ($ty:ident, $variant:ident, $tag:literal) => {
        #[derive(Debug)]
        pub struct $ty;

        impl NodeValue for $ty {
            fn to_ast_v2(
                &self,
                node: &Node,
                ctx: &crate::supramark::AstV2Ctx<'_>,
            ) -> Option<Vec<crate::supramark::SupramarkNode>> {
                Some(vec![crate::supramark::SupramarkNode::$variant {
                    children: ctx.map_children(&node.children),
                    position: ctx.position(node),
                }])
            }

            fn render(&self, node: &Node, fmt: &mut dyn Renderer) {
                fmt.open($tag, &[]);
                fmt.contents(&node.children);
                fmt.close($tag);
            }
        }
    };
}

def_node!(DefList, DefinitionList, "dl");
def_node!(DefItem, DefinitionItem, "div");
def_node!(DefTerm, DefinitionTerm, "dt");
def_node!(DefDesc, DefinitionDescription, "dd");

pub fn add(md: &mut MarkdownParser) {
    md.block.add_rule::<DefListScanner>();
}

#[doc(hidden)]
pub struct DefListScanner;

impl DefListScanner {
    fn is_desc(state: &BlockState, line: usize) -> bool {
        if line >= state.line_max {
            return false;
        }
        state
            .get_line(line)
            .strip_prefix(':')
            .is_some_and(|rest| rest.is_empty() || rest.starts_with(char::is_whitespace))
    }

    fn is_term(state: &BlockState, line: usize) -> bool {
        if line >= state.line_max {
            return false;
        }
        !state.get_line(line).is_empty() && !Self::is_desc(state, line)
    }
}

impl BlockRule for DefListScanner {
    fn check(_: &mut BlockState) -> Option<()> {
        None
    }

    fn run(state: &mut BlockState) -> Option<(Node, usize)> {
        let start = state.line;
        let mut cursor = start;
        let mut items: Vec<Node> = Vec::new();

        loop {
            let term_start = cursor;
            let mut term_lines = Vec::new();
            while Self::is_term(state, cursor) {
                term_lines.push(cursor);
                cursor += 1;
            }

            if term_lines.is_empty() || !Self::is_desc(state, cursor) {
                if items.is_empty() {
                    return None;
                }
                break;
            }

            let mut item_children: Vec<Node> = Vec::new();

            for &tl in &term_lines {
                let content = state.get_line(tl).to_owned();
                let offset = state.line_offsets[tl].first_nonspace;
                let mut term = Node::new(DefTerm);
                term.children
                    .push(Node::new(InlineRoot::new(content, vec![(0, offset)])));
                term.srcmap = state.get_map(tl, tl);
                item_children.push(term);
            }

            let mut last_desc = cursor;
            while Self::is_desc(state, cursor) {
                let line = state.get_line(cursor);
                let after = &line[1..];
                let content_col = 1 + (after.len() - after.trim_start().len());
                let content = line[content_col..].to_owned();
                let offset = state.line_offsets[cursor].first_nonspace + content_col;

                let mut desc = Node::new(DefDesc);
                if !content.is_empty() {
                    let mut para = Node::new(Paragraph);
                    para.children
                        .push(Node::new(InlineRoot::new(content, vec![(0, offset)])));
                    desc.children.push(para);
                }
                desc.srcmap = state.get_map(cursor, cursor);
                item_children.push(desc);
                last_desc = cursor;
                cursor += 1;
            }

            let mut item = Node::new(DefItem);
            item.children = item_children;
            item.srcmap = state.get_map(term_start, last_desc);
            items.push(item);

            if cursor >= state.line_max || state.is_empty(cursor) {
                break;
            }
        }

        let mut list = Node::new(DefList);
        list.children = items;
        Some((list, cursor - start))
    }
}
