//! Rounded rectangle shape.
//!
//! Upstream reference:
//! `packages/mermaid/src/rendering-util/rendering-elements/shapes/roundedRect.ts` +
//! `packages/mermaid/src/rendering-util/rendering-elements/shapes/labelRect.ts`
//! (both funnel into `drawRect` with `rx`/`ry` > 0).
//!
//! Upstream's radius source: `themeVariables.radius ?? 5` — here we
//! take `node.rx` if set, otherwise default to `5` (matching the
//! stable-v11 default when no theme override is supplied).

use super::types::{fmt_num, get_node_classes, xml_escape};
use crate::error::Result;
use crate::layout::unified::types::Node;
use crate::theme::ThemeVariables;

pub fn draw(node: &Node, _theme: &ThemeVariables) -> Result<String> {
    let w = node.width.unwrap_or(0.0);
    let h = node.height.unwrap_or(0.0);
    let x = -w / 2.0;
    let y = -h / 2.0;
    let r = node.rx.unwrap_or(5.0);
    let classes = get_node_classes(node.look.as_deref(), node.css_classes.as_deref(), None);
    let id = node.dom_id.clone().unwrap_or_else(|| node.id.clone());
    let tx = node.x.unwrap_or(0.0);
    let ty = node.y.unwrap_or(0.0);
    let label = node.label.clone().unwrap_or_default();

    // When `node.look` is set (e.g. "classic"), emit `data-look` attribute
    // on the outer `<g>`, matching upstream's rendering pipeline.
    let data_look = match node.look.as_deref() {
        Some(look) if !look.is_empty() => format!(r#" data-look="{}""#, look),
        _ => String::new(),
    };

    let mut out = String::new();
    out.push_str(&format!(
        r#"<g class="{classes}" id="{id}"{data_look} transform="translate({tx}, {ty})">"#,
        classes = classes,
        id = xml_escape(&id),
        data_look = data_look,
        tx = fmt_num(tx),
        ty = fmt_num(ty),
    ));
    out.push_str(&format!(
        r#"<rect class="basic label-container" style="" rx="{r}" ry="{r}" x="{x}" y="{y}" width="{w}" height="{h}"></rect>"#,
        r = fmt_num(r),
        x = fmt_num(x),
        y = fmt_num(y),
        w = fmt_num(w),
        h = fmt_num(h),
    ));
    if !label.is_empty() {
        let is_markdown = node.label_type.as_deref() == Some("markdown");
        let label_style = node.label_style.as_deref().unwrap_or("");
        let escaped = xml_escape(&label);
        let (lw, lh) = crate::render::foreign_object::measure_html_label(
            &escaped,
            &crate::render::foreign_object::HtmlLabelFont::default(),
            200.0,
            true,
        );
        let opts = crate::render::foreign_object::LabelOpts {
            extra_span_classes: if is_markdown { "markdown-node-label" } else { "" },
            group_style: if label_style.is_empty() { Some("") } else { Some(label_style) },
            ..crate::render::foreign_object::LabelOpts::default()
        };
        out.push_str(&crate::render::foreign_object::render_node_label(
            &escaped, lw, lh, &opts,
        ));
    }
    out.push_str("</g>");
    Ok(out)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn rounded_rect_emits_radius() {
        let mut n = Node::default();
        n.id = "n".into();
        n.width = Some(80.0);
        n.height = Some(40.0);
        n.rx = Some(5.0);
        let theme = ThemeVariables::default();
        let got = draw(&n, &theme).unwrap();
        assert!(got.contains(r#"rx="5""#));
        assert!(got.contains(r#"ry="5""#));
        assert!(got.contains(r#"x="-40""#));
    }

    #[test]
    fn rounded_rect_emits_data_look() {
        let mut n = Node::default();
        n.id = "n".into();
        n.width = Some(80.0);
        n.height = Some(40.0);
        n.look = Some("classic".into());
        let theme = ThemeVariables::default();
        let got = draw(&n, &theme).unwrap();
        assert!(got.contains(r#"data-look="classic""#));
    }

    #[test]
    fn rounded_rect_uses_markdown_node_label() {
        let mut n = Node::default();
        n.id = "n".into();
        n.width = Some(80.0);
        n.height = Some(40.0);
        n.label = Some("State1".into());
        n.label_type = Some("markdown".into());
        let theme = ThemeVariables::default();
        let got = draw(&n, &theme).unwrap();
        assert!(got.contains(r#"markdown-node-label"#));
    }
}
