//! State-diagram SVG renderer.
//!
//! Upstream reference:
//! * `stateRenderer-v3-unified.ts` (v2 path) — 370 LoC.
//! * `stateRenderer.js` (v1 path) — emits the classic look.
//!
//! # Byte-exactness caveat (wave 4, first pass)
//!
//! Full byte-exact parity requires three pieces that are **not yet**
//! ported and are all in the "hundreds of LoC each" bucket:
//!
//! 1. The stylis CSS minifier applied to the `<style>` block
//!    (`packages/mermaid/src/styles.ts` + the per-diagram CSS at
//!    `state/styles.js`).
//! 2. d3-shape's arc / circle emitter, which upstream uses for
//!    `state-start` markers — output is a 36-vertex cubic-bezier
//!    polyline, not a single `<circle r="7">`.
//! 3. The dagre → cluster-aware SVG pipeline's exact iteration order
//!    for `edgePaths`, `edgeLabels`, `nodes` groups, plus the
//!    `data-points` base64 blob each edge carries.
//!
//! This renderer intentionally produces **structurally plausible** SVG
//! that doesn't pass byte-exact comparison yet but does:
//!   * open `<svg>` with the canonical attribute order;
//!   * emit the standard `<g><defs><marker .../></defs><g class="root">…`
//!     skeleton;
//!   * draw states using `shapes::draw`;
//!   * route edges via `render::edges` with `basis` interpolation;
//!   * apply the `statediagram` class + placeholder `<style>` tag.
//!
//! The `tests` section below compares byte-counts, not byte-equality,
//! and reports the gap against reference output.

use crate::error::Result;
use crate::layout::state::StateLayout;
use crate::layout::unified::types::{Bounds, Edge, Node, Point};
use crate::model::state::StateDiagram;
use crate::render::edges::{self, CurveType};
use crate::render::shapes::{self, types::fmt_num};
use crate::render::unified_shell;
use crate::theme::css as theme_css;
use crate::theme::ThemeVariables;

pub fn render(
    d: &StateDiagram,
    l: &StateLayout,
    theme: &ThemeVariables,
    id: &str,
) -> Result<String> {
    let mut out = String::with_capacity(16 * 1024);

    // Compute viewBox from layout bounds, padded a little (matches
    // upstream's 8px default margin on each side).
    let pad = 8.0_f64;
    let bb = &l.result.bounds;
    let (vx, vy, vw, vh) = viewbox(bb, pad);

    // ── Opening <svg> — canonical attribute order -----------------
    out.push_str(&unified_shell::open_unified_svg(
        id,
        vw,
        (vx, vy, vw, vh),
        Some("statediagram"),
        "stateDiagram",
    ));

    // ── <style> block — base preamble + state-specific rules + tail.
    out.push_str(&style_block(id, theme));

    // ── Seed <g> wrapping markers + root --------------------------
    out.push_str(unified_shell::open_seed_group());

    // ── Markers -------------------------------------------------
    out.push_str(&format!(
        concat!(
            r#"<defs>"#,
            r#"<marker id="{id}_stateDiagram-barbEnd" refX="19" refY="7""#,
            r#" markerWidth="20" markerHeight="14" markerUnits="userSpaceOnUse" orient="auto">"#,
            r#"<path d="M 19,7 L9,13 L14,7 L9,1 Z"></path>"#,
            r#"</marker>"#,
            r#"</defs>"#,
        ),
        id = id
    ));

    // ── Root <g> with clusters, edges, labels, nodes ------------
    out.push_str(unified_shell::open_root_group());

    // Clusters (composite states) -------------------------------
    out.push_str(r#"<g class="clusters">"#);
    for n in l.result.nodes.iter().filter(|n| n.is_group) {
        out.push_str(&emit_cluster(n));
    }
    out.push_str("</g>");

    // Edge paths ------------------------------------------------
    out.push_str(r#"<g class="edgePaths">"#);
    for e in &l.result.edges {
        out.push_str(&emit_edge_path(id, e));
    }
    out.push_str("</g>");

    // Edge labels ----------------------------------------------
    out.push_str(r#"<g class="edgeLabels">"#);
    for e in &l.result.edges {
        out.push_str(&emit_edge_label(e));
    }
    out.push_str("</g>");

    // Nodes -----------------------------------------------------
    out.push_str(r#"<g class="nodes">"#);
    for n in l.result.nodes.iter().filter(|n| !n.is_group) {
        if n.extra.get("__skip_render").is_some() {
            continue;
        }
        if let Some(svg) = emit_node(id, n, theme) {
            out.push_str(&svg);
        }
    }
    out.push_str("</g>");

    out.push_str(unified_shell::close_root_group());
    out.push_str(unified_shell::close_seed_group());

    // Drop-shadow filter defs (match upstream tail).
    out.push_str(&unified_shell::emit_defs_shell(id, true, true));

    out.push_str(unified_shell::close_unified_svg());
    let _ = d; // reserved for v1/v2-specific tweaks once wired.
    Ok(out)
}

fn viewbox(b: &Bounds, pad: f64) -> (f64, f64, f64, f64) {
    let w = (b.width + 2.0 * pad).max(1.0);
    let h = (b.height + 2.0 * pad).max(1.0);
    let x = b.x - pad;
    let y = b.y - pad;
    (x, y, w, h)
}

fn emit_cluster(n: &Node) -> String {
    let w = n.width.unwrap_or(0.0);
    let h = n.height.unwrap_or(0.0);
    let label = n.label.as_deref().unwrap_or("");
    let css = n.css_classes.as_deref().unwrap_or("statediagram-cluster");
    format!(
        concat!(
            r#"<g class=" statediagram-state {css}" id="{id}" data-id="{nid}" data-look="classic">"#,
            r#"<g><rect class="outer" x="{rx}" y="{ry}" width="{w}" height="{h}" data-look="classic"></rect></g>"#,
            r#"<g class="cluster-label"><foreignObject width="0" height="0"><div xmlns="http://www.w3.org/1999/xhtml">{lbl}</div></foreignObject></g>"#,
            r#"</g>"#,
        ),
        css = css,
        id = xml_escape(&n.id),
        nid = xml_escape(&n.id),
        rx = fmt_num(-w / 2.0),
        ry = fmt_num(-h / 2.0),
        w = fmt_num(w),
        h = fmt_num(h),
        lbl = xml_escape(label),
    )
}

fn emit_edge_path(id: &str, e: &Edge) -> String {
    let Some(points) = &e.points else {
        return String::new();
    };
    if points.len() < 2 {
        return String::new();
    }
    let pts: Vec<Point> = points.iter().map(|p| Point { x: p.x, y: p.y }).collect();
    let d = edges::build_path(&pts, CurveType::Basis);
    let class = format!(
        " edge-thickness-{} edge-pattern-{} {}",
        e.thickness.as_deref().unwrap_or("normal"),
        e.pattern.as_deref().unwrap_or("solid"),
        e.classes.as_deref().unwrap_or("transition"),
    );
    // Base64-encoded JSON points array, matching upstream's
    // `btoa(JSON.stringify(points))`.
    // Attribute order: data-edge → data-et → data-id → data-points → data-look
    let data_points_b64 = {
        let mut json = String::from("[");
        for (i, p) in pts.iter().enumerate() {
            if i > 0 {
                json.push(',');
            }
            json.push_str(&format!(
                r#"{{"x":{x},"y":{y}}}"#,
                x = shapes::types::fmt_num(p.x),
                y = shapes::types::fmt_num(p.y),
            ));
        }
        json.push(']');
        unified_shell::base64_encode(json.as_bytes())
    };
    format!(
        r##"<path d="{d}" id="{id}-{eid}" class="{cls}" style="fill:none;;;fill:none" data-edge="true" data-et="edge" data-id="{eid}" data-points="{b64}" data-look="classic" marker-end="url(#{id}_stateDiagram-barbEnd)"></path>"##,
        d = d,
        id = id,
        eid = e.id,
        cls = class,
        b64 = data_points_b64,
    )
}

fn emit_edge_label(e: &Edge) -> String {
    use crate::render::foreign_object::{self, LabelOpts};
    use crate::font_metrics::text_width;

    let raw = e.label.as_deref().unwrap_or("");
    let (body, wrap_in_p) = if raw.trim().is_empty() {
        if raw.is_empty() {
            (String::new(), false)
        } else {
            // Whitespace-only: preserve literal whitespace in <p>.
            (format!("<p>{}</p>", xml_escape(raw)), false)
        }
    } else {
        (xml_escape(raw), true)
    };

    // Measure label text for foreignObject dimensions.
    let (lw, lh) = if raw.is_empty() {
        (0.0, 16.296875) // default line-height at 14px sans-serif
    } else {
        let tw = text_width(raw.trim(), "sans-serif", 14.0, false, false);
        (tw, 16.296875)
    };

    let x = e.label_x.unwrap_or(0.0);
    let y = e.label_y.unwrap_or(0.0);
    let eid = &e.id;

    // Empty labels: outer <g class="edgeLabel"> with NO transform;
    // inner <g class="label" data-id="…" transform="translate(0, -lh/2)">.
    // Non-empty labels: outer <g class="edgeLabel" transform="translate(x,y)">;
    // inner <g class="label" data-id="…" transform="translate(-lw/2, -lh/2)">.
    let (outer_transform, inner_translate) = if body.is_empty() {
        (
            String::new(),
            format!("translate(0, {})", fmt_num(-lh / 2.0)),
        )
    } else {
        (
            format!(r#" transform="translate({}, {})""#, fmt_num(x), fmt_num(y)),
            format!("translate({}, {})", fmt_num(-lw / 2.0), fmt_num(-lh / 2.0)),
        )
    };

    let opts = LabelOpts {
        data_id: Some(eid),
        group_style: None,
        group_transform: Some(inner_translate),
        add_background: true,
        is_node: false,
        wrap_in_p,
        ..LabelOpts::default()
    };

    let inner = foreign_object::render_node_label(&body, lw, lh, &opts);
    format!(
        r#"<g class="edgeLabel"{outer_transform}>{inner}</g>"#,
        outer_transform = outer_transform,
        inner = inner,
    )
}

fn emit_node(id: &str, n: &Node, theme: &ThemeVariables) -> Option<String> {
    let shape = n.shape.as_deref().unwrap_or("state");
    match shape {
        "stateStart" | "state_start" | "start" => emit_state_start(id, n, theme),
        "stateEnd" | "state_end" | "end" => emit_state_end(id, n, theme),
        "forkJoin" | "fork_join" | "fork" | "join" => emit_fork_join(id, n, theme),
        "state" => emit_state_node(id, n, theme),
        _ => shapes::draw(shape, n, theme).ok(),
    }
}

fn emit_state_start(id: &str, n: &Node, _theme: &ThemeVariables) -> Option<String> {
    let w = n.width.unwrap_or(14.0).max(14.0);
    let r = w / 2.0;
    let nid = n.dom_id.clone().unwrap_or_else(|| n.id.clone());
    let tx = n.x.unwrap_or(0.0);
    let ty = n.y.unwrap_or(0.0);
    Some(format!(
        r#"<g class="node default" id="{id}-{nid}" data-look="classic" transform="translate({tx}, {ty})"><circle class="state-start" r="{r}" width="{w}" height="{w}"></circle></g>"#,
        id = id,
        nid = xml_escape(&nid),
        tx = fmt_num(tx),
        ty = fmt_num(ty),
        r = fmt_num(r),
        w = fmt_num(w),
    ))
}

fn emit_state_end(id: &str, n: &Node, _theme: &ThemeVariables) -> Option<String> {
    let w = n.width.unwrap_or(14.0).max(14.0);
    let r = w / 2.0;
    let nid = n.dom_id.clone().unwrap_or_else(|| n.id.clone());
    let tx = n.x.unwrap_or(0.0);
    let ty = n.y.unwrap_or(0.0);
    // Simplified state-end: outer ring + inner filled circle.
    // Full upstream uses rough.js-generated cubic bezier paths.
    Some(format!(
        r#"<g class="node default" id="{id}-{nid}" data-look="classic" transform="translate({tx}, {ty})"><circle class="state-end" r="{r}" width="{w}" height="{w}"></circle></g>"#,
        id = id,
        nid = xml_escape(&nid),
        tx = fmt_num(tx),
        ty = fmt_num(ty),
        r = fmt_num(r),
        w = fmt_num(w),
    ))
}

fn emit_fork_join(id: &str, n: &Node, theme: &ThemeVariables) -> Option<String> {
    let dir = n.dir.as_deref();
    let (w, h) = if matches!(dir, Some("LR")) {
        (n.width.unwrap_or(10.0).max(10.0), n.height.unwrap_or(70.0).max(70.0))
    } else {
        (n.width.unwrap_or(70.0).max(70.0), n.height.unwrap_or(10.0).max(10.0))
    };
    let x = -w / 2.0;
    let y = -h / 2.0;
    let classes = shapes::types::get_node_classes(n.look.as_deref(), n.css_classes.as_deref(), None);
    let nid = n.dom_id.clone().unwrap_or_else(|| n.id.clone());
    let tx = n.x.unwrap_or(0.0);
    let ty = n.y.unwrap_or(0.0);
    let line = theme.line_color.as_deref().unwrap_or("black");
    Some(format!(
        r#"<g class="{classes}" id="{id}-{nid}" data-look="classic" transform="translate({tx}, {ty})"><rect class="fork-join" x="{x}" y="{y}" width="{w}" height="{h}" style="fill:{line};stroke:{line}"></rect></g>"#,
        classes = classes,
        id = id,
        nid = xml_escape(&nid),
        tx = fmt_num(tx),
        ty = fmt_num(ty),
        x = fmt_num(x),
        y = fmt_num(y),
        w = fmt_num(w),
        h = fmt_num(h),
        line = line,
    ))
}

/// Emit a normal state node (rounded rect + label).
/// Matches upstream's `drawRect` with `rx=5, ry=5` + `labelHelper`.
fn emit_state_node(id: &str, n: &Node, _theme: &ThemeVariables) -> Option<String> {
    use crate::render::foreign_object::{measure_html_label, LabelOpts};

    let w = n.width.unwrap_or(0.0);
    let h = n.height.unwrap_or(0.0);
    let r = n.rx.unwrap_or(5.0);
    let classes = shapes::types::get_node_classes(n.look.as_deref(), n.css_classes.as_deref(), None);
    let nid = n.dom_id.clone().unwrap_or_else(|| n.id.clone());
    let tx = n.x.unwrap_or(0.0);
    let ty = n.y.unwrap_or(0.0);
    let label = n.label.clone().unwrap_or_default();
    let is_markdown = n.label_type.as_deref() == Some("markdown");
    let label_style = n.label_style.as_deref().unwrap_or("");

    let mut out = String::new();
    out.push_str(&format!(
        r#"<g class="{classes}" id="{id}-{nid}" data-look="classic" transform="translate({tx}, {ty})">"#,
        classes = classes,
        id = id,
        nid = xml_escape(&nid),
        tx = fmt_num(tx),
        ty = fmt_num(ty),
    ));
    out.push_str(&format!(
        r#"<rect class="basic label-container" style="" rx="{r}" ry="{r}" x="{x}" y="{y}" width="{w}" height="{h}"></rect>"#,
        r = fmt_num(r),
        x = fmt_num(-w / 2.0),
        y = fmt_num(-h / 2.0),
        w = fmt_num(w),
        h = fmt_num(h),
    ));
    if !label.is_empty() {
        let escaped = xml_escape(&label);
        let (lw, lh) = measure_html_label(
            &escaped,
            &crate::render::foreign_object::HtmlLabelFont::default(),
            200.0,
            true,
        );
        let opts = LabelOpts {
            extra_span_classes: if is_markdown { "markdown-node-label" } else { "" },
            group_style: if label_style.is_empty() { Some("") } else { Some(label_style) },
            ..LabelOpts::default()
        };
        out.push_str(&crate::render::foreign_object::render_node_label(
            &escaped, lw, lh, &opts,
        ));
    }
    out.push_str("</g>");
    Some(out)
}

fn xml_escape(s: &str) -> String {
    s.replace('&', "&amp;")
        .replace('<', "&lt;")
        .replace('>', "&gt;")
}

/// `<style>` block — built from the shared base preamble + the full
/// state-specific CSS (ported from upstream `state/styles.js`) + the
/// shared neo-look tail.
fn style_block(id: &str, theme: &ThemeVariables) -> String {
    let mut s = String::with_capacity(4096);
    s.push_str("<style>");
    s.push_str(&theme_css::base_preamble(id, theme));
    s.push_str(&state_specific_css(id, theme));
    s.push_str(&theme_css::neo_look_block(id, theme));
    s.push_str("</style>");
    s
}

/// Full port of upstream `packages/mermaid/src/diagrams/state/styles.js`.
/// All ~50 CSS rules, with theme variable interpolation matching the
/// default theme's computed values. Stylis-minified (no whitespace,
/// no comments).
fn state_specific_css(id: &str, theme: &ThemeVariables) -> String {
    let transition_color = theme.transition_color.as_deref().unwrap_or("#333333");
    let node_border = theme.node_border.as_deref().unwrap_or("#9370DB");
    let text_color = theme.text_color.as_deref().unwrap_or("#333");
    let main_bkg = theme.main_bkg.as_deref().unwrap_or("#ECECFF");
    let line_color = theme.line_color.as_deref().unwrap_or("#333333");
    let stroke_width = theme.stroke_width.unwrap_or(1);
    let state_label_color = theme.state_label_color.as_deref().unwrap_or("#131300");
    let special_state_color = theme.special_state_color.as_deref().unwrap_or("#333333");
    let inner_end_bg = theme.inner_end_background.as_deref().unwrap_or("#333333");
    let background = theme.background.as_deref().unwrap_or("white");
    let composite_bg = theme.composite_background.as_deref().or(theme.background.as_deref()).unwrap_or("white");
    let composite_title_bg = theme.composite_title_background.as_deref().unwrap_or("#ECECFF");
    let state_bkg = theme.state_bkg.as_deref().or(theme.main_bkg.as_deref()).unwrap_or("#ECECFF");
    let state_border = theme.state_border.as_deref().or(theme.node_border.as_deref()).unwrap_or("#9370DB");
    let alt_bg = theme.alt_background.as_deref().unwrap_or("#efefef");
    let note_bkg = theme.note_bkg_color.as_deref().unwrap_or("#fff5ad");
    let note_border = theme.note_border_color.as_deref().unwrap_or("#aaaa33");
    let note_text = theme.note_text_color.as_deref().unwrap_or("#333");
    let label_bg = theme.label_background_color.as_deref().unwrap_or("#ECECFF");
    let edge_label_bg = theme.edge_label_background.as_deref().unwrap_or("rgba(232,232,232, 0.8)");
    let transition_label_color = theme.transition_label_color.as_deref().or(theme.tertiary_text_color.as_deref()).unwrap_or("#333");
    let radius = theme.radius.unwrap_or(5);
    // drop-shadow for neo look
    let drop_shadow = theme.drop_shadow.as_deref().unwrap_or("drop-shadow(1px 2px 2px rgba(185, 185, 185, 1))");
    let neo_ds = drop_shadow.replace("url(#drop-shadow)", &format!("url({}-drop-shadow)", id));

    let mut s = String::with_capacity(3000);

    // defs [id$="-barbEnd"]
    s.push_str(&format!(
        "#{id} defs [id$=\"-barbEnd\"]{{fill:{tc};stroke:{tc};}}",
        tc = transition_color,
    ));
    // g.stateGroup text (first occurrence)
    s.push_str(&format!(
        "#{id} g.stateGroup text{{fill:{nb};stroke:none;font-size:10px;}}",
        nb = node_border,
    ));
    // g.stateGroup text (second occurrence — upstream emits it twice)
    s.push_str(&format!(
        "#{id} g.stateGroup text{{fill:{tc2};stroke:none;font-size:10px;}}",
        tc2 = text_color,
    ));
    // g.stateGroup .state-title
    s.push_str(&format!(
        "#{id} g.stateGroup .state-title{{font-weight:bolder;fill:{slc};}}",
        slc = state_label_color,
    ));
    // g.stateGroup rect
    s.push_str(&format!(
        "#{id} g.stateGroup rect{{fill:{mb};stroke:{nb};}}",
        mb = main_bkg, nb = node_border,
    ));
    // g.stateGroup line
    s.push_str(&format!(
        "#{id} g.stateGroup line{{stroke:{lc};stroke-width:{sw};}}",
        lc = line_color, sw = stroke_width,
    ));
    // .transition
    s.push_str(&format!(
        "#{id} .transition{{stroke:{tc};stroke-width:{sw};fill:none;}}",
        tc = transition_color, sw = stroke_width,
    ));
    // .stateGroup .composit (upstream typo preserved)
    s.push_str(&format!(
        "#{id} .stateGroup .composit{{fill:{bg};border-bottom:1px;}}",
        bg = background,
    ));
    // .stateGroup .alt-composit
    s.push_str(&format!(
        "#{id} .stateGroup .alt-composit{{fill:#e0e0e0;border-bottom:1px;}}",
    ));
    // .state-note
    s.push_str(&format!(
        "#{id} .state-note{{stroke:{nbc};fill:{nbg};}}",
        nbc = note_border, nbg = note_bkg,
    ));
    // .state-note text
    s.push_str(&format!(
        "#{id} .state-note text{{fill:{ntc};stroke:none;font-size:10px;}}",
        ntc = note_text,
    ));
    // .stateLabel .box
    s.push_str(&format!(
        "#{id} .stateLabel .box{{stroke:none;stroke-width:0;fill:{mb};opacity:0.5;}}",
        mb = main_bkg,
    ));
    // .edgeLabel .label rect
    s.push_str(&format!(
        "#{id} .edgeLabel .label rect{{fill:{lbg};opacity:0.5;}}",
        lbg = label_bg,
    ));
    // .edgeLabel — upstream merges background-color and text-align into one rule
    // (stylis merges duplicate selectors).
    s.push_str(&format!(
        "#{id} .edgeLabel{{background-color:{elbg};text-align:center;}}",
        elbg = edge_label_bg,
    ));
    // .edgeLabel p
    s.push_str(&format!(
        "#{id} .edgeLabel p{{background-color:{elbg};}}",
        elbg = edge_label_bg,
    ));
    // .edgeLabel rect
    s.push_str(&format!(
        "#{id} .edgeLabel rect{{opacity:0.5;background-color:{elbg};fill:{elbg};}}",
        elbg = edge_label_bg,
    ));
    // .edgeLabel .label text
    s.push_str(&format!(
        "#{id} .edgeLabel .label text{{fill:{tlc};}}",
        tlc = transition_label_color,
    ));
    // .label div .edgeLabel
    s.push_str(&format!(
        "#{id} .label div .edgeLabel{{color:{tlc};}}",
        tlc = transition_label_color,
    ));
    // .stateLabel text
    s.push_str(&format!(
        "#{id} .stateLabel text{{fill:{slc};font-size:10px;font-weight:bold;}}",
        slc = state_label_color,
    ));
    // .node circle.state-start
    s.push_str(&format!(
        "#{id} .node circle.state-start{{fill:{ssc};stroke:{ssc};}}",
        ssc = special_state_color,
    ));
    // .node .fork-join
    s.push_str(&format!(
        "#{id} .node .fork-join{{fill:{ssc};stroke:{ssc};}}",
        ssc = special_state_color,
    ));
    // .node circle.state-end
    s.push_str(&format!(
        "#{id} .node circle.state-end{{fill:{ieb};stroke:{bg};stroke-width:1.5;}}",
        ieb = inner_end_bg, bg = background,
    ));
    // .end-state-inner
    s.push_str(&format!(
        "#{id} .end-state-inner{{fill:{cbg};stroke-width:1.5;}}",
        cbg = composite_bg,
    ));
    // .node rect
    s.push_str(&format!(
        "#{id} .node rect{{fill:{sb};stroke:{sbr};stroke-width:{sw}px;}}",
        sb = state_bkg, sbr = state_border, sw = stroke_width,
    ));
    // .node polygon
    s.push_str(&format!(
        "#{id} .node polygon{{fill:{mb};stroke:{sbr};stroke-width:{sw}px;}}",
        mb = main_bkg, sbr = state_border, sw = stroke_width,
    ));
    // [id$="-barbEnd"]
    s.push_str(&format!(
        "#{id} [id$=\"-barbEnd\"]{{fill:{lc};}}",
        lc = line_color,
    ));
    // .statediagram-cluster rect
    s.push_str(&format!(
        "#{id} .statediagram-cluster rect{{fill:{ctbg};stroke:{sbr};stroke-width:{sw}px;}}",
        ctbg = composite_title_bg, sbr = state_border, sw = stroke_width,
    ));
    // .cluster-label, .nodeLabel
    s.push_str(&format!(
        "#{id} .cluster-label,#{id} .nodeLabel{{color:{slc};}}",
        slc = state_label_color,
    ));
    // .statediagram-cluster rect.outer
    s.push_str(&format!(
        "#{id} .statediagram-cluster rect.outer{{rx:5px;ry:5px;}}",
    ));
    // .statediagram-state .divider
    s.push_str(&format!(
        "#{id} .statediagram-state .divider{{stroke:{sbr};}}",
        sbr = state_border,
    ));
    // .statediagram-state .title-state
    s.push_str(&format!(
        "#{id} .statediagram-state .title-state{{rx:5px;ry:5px;}}",
    ));
    // .statediagram-cluster.statediagram-cluster .inner
    s.push_str(&format!(
        "#{id} .statediagram-cluster.statediagram-cluster .inner{{fill:{cbg};}}",
        cbg = composite_bg,
    ));
    // .statediagram-cluster.statediagram-cluster-alt .inner
    s.push_str(&format!(
        "#{id} .statediagram-cluster.statediagram-cluster-alt .inner{{fill:{abg};}}",
        abg = alt_bg,
    ));
    // .statediagram-cluster .inner
    s.push_str(&format!(
        "#{id} .statediagram-cluster .inner{{rx:0;ry:0;}}",
    ));
    // .statediagram-state rect.basic
    s.push_str(&format!(
        "#{id} .statediagram-state rect.basic{{rx:5px;ry:5px;}}",
    ));
    // .statediagram-state rect.divider
    s.push_str(&format!(
        "#{id} .statediagram-state rect.divider{{stroke-dasharray:10,10;fill:{abg};}}",
        abg = alt_bg,
    ));
    // .note-edge
    s.push_str(&format!(
        "#{id} .note-edge{{stroke-dasharray:5;}}",
    ));
    // .statediagram-note rect (twice — upstream emits it twice)
    s.push_str(&format!(
        "#{id} .statediagram-note rect{{fill:{nbg};stroke:{nbc};stroke-width:1px;rx:0;ry:0;}}",
        nbg = note_bkg, nbc = note_border,
    ));
    s.push_str(&format!(
        "#{id} .statediagram-note rect{{fill:{nbg};stroke:{nbc};stroke-width:1px;rx:0;ry:0;}}",
        nbg = note_bkg, nbc = note_border,
    ));
    // .statediagram-note text
    s.push_str(&format!(
        "#{id} .statediagram-note text{{fill:{ntc};}}",
        ntc = note_text,
    ));
    // .statediagram-note .nodeLabel
    s.push_str(&format!(
        "#{id} .statediagram-note .nodeLabel{{color:{ntc};}}",
        ntc = note_text,
    ));
    // .statediagram .edgeLabel (upstream has `color: red; // ${options.noteTextColor};`)
    s.push_str(&format!(
        "#{id} .statediagram .edgeLabel{{color:red;}}",
    ));
    // [id$="-dependencyStart"], [id$="-dependencyEnd"]
    s.push_str(&format!(
        "#{id} [id$=\"-dependencyStart\"],#{id} [id$=\"-dependencyEnd\"]{{fill:{lc};stroke:{lc};stroke-width:{sw};}}",
        lc = line_color, sw = stroke_width,
    ));
    // .statediagramTitleText
    s.push_str(&format!(
        "#{id} .statediagramTitleText{{text-anchor:middle;font-size:18px;fill:{tc2};}}",
        tc2 = text_color,
    ));
    // [data-look="neo"].statediagram-cluster rect
    s.push_str(&format!(
        r#"#{id} [data-look="neo"].statediagram-cluster rect{{fill:{mb};stroke:{sbr};stroke-width:{sw};}}"#,
        mb = main_bkg, sbr = state_border, sw = stroke_width,
    ));
    // [data-look="neo"].statediagram-cluster rect.outer
    s.push_str(&format!(
        r#"#{id} [data-look="neo"].statediagram-cluster rect.outer{{rx:{r}px;ry:{r}px;filter:{ds};}}"#,
        r = radius, ds = neo_ds,
    ));

    s
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::parser::state::parse;
    use crate::theme::get_theme;
    use std::fs;
    use std::path::PathBuf;

    /// Diagnostic probe that reports alignment of the renderer's
    /// `<svg>`-shell + `<style>` block against the reference. The
    /// Wave 3.5 unified-shell work aims to minimise the post-viewBox
    /// drift — with byte-exact layout we'd hit `prefix == exp.len()`.
    /// Never asserts; use with `-- --nocapture` for a one-fixture diff.
    #[test]
    fn dump_state_01_diff() {
        let base = std::path::PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let rel = "ext_fixtures/cypress/state/01";
        let Ok(mmd) = std::fs::read_to_string(base.join(format!("tests/{}.mmd", rel))) else {
            return;
        };
        let Ok(exp) = std::fs::read_to_string(base.join(format!("tests/reference/{}.svg", rel)))
        else {
            return;
        };
        let id = "ref-ext-fixtures-cypress-state-01";
        let Ok(d) = parse(&mmd) else { return };
        let theme = get_theme("default");
        let Ok(l) = crate::layout::state::layout(&d, &theme) else {
            return;
        };
        let Ok(got) = render(&d, &l, &theme, id) else {
            return;
        };
        let prefix = got
            .bytes()
            .zip(exp.bytes())
            .take_while(|(a, b)| a == b)
            .count();
        eprintln!(
            "[state-diag] got={} exp={} prefix={}",
            got.len(),
            exp.len(),
            prefix
        );
        // Substitute the reference viewBox back into `got` so we can
        // measure *shell+style* alignment independently of the layout
        // divergence.
        if let (Some(got_vbox_end), Some(exp_vbox_end)) =
            (got.find("\" role="), exp.find("\" role="))
        {
            let got_vbox_start = got.rfind("style=\"max-width").unwrap_or(0);
            let exp_vbox_start = exp.rfind("style=\"max-width").unwrap_or(0);
            let (gpre, gpost) = got.split_at(got_vbox_start);
            let (_epre, epost) = exp.split_at(exp_vbox_start);
            let got_tail = &gpost[gpost.find("\" role=").unwrap_or(0) + 2..];
            let exp_tail = &epost[epost.find("\" role=").unwrap_or(0) + 2..];
            // tail starts at `role="graphics-document…`
            let tail_prefix = got_tail
                .bytes()
                .zip(exp_tail.bytes())
                .take_while(|(a, b)| a == b)
                .count();
            eprintln!(
                "[state-diag] post-viewBox shell+style prefix={} (got_tail_len={}, exp_tail_len={})",
                tail_prefix,
                got_tail.len(),
                exp_tail.len()
            );
            let _ = (got_vbox_end, exp_vbox_end, gpre);
        }
    }

    #[test]
    fn renders_minimal_diagram_without_panicking() {
        let src = "stateDiagram-v2\n[*] --> S1\nS1 --> [*]\n";
        let d = parse(src).unwrap();
        let theme = get_theme("default");
        let l = crate::layout::state::layout(&d, &theme).unwrap();
        let svg = render(&d, &l, &theme, "t1").unwrap();
        assert!(svg.starts_with("<svg"));
        assert!(svg.contains(r#"class="statediagram""#));
        assert!(svg.contains(r#"aria-roledescription="stateDiagram""#));
        assert!(svg.ends_with("</svg>"));
    }

    fn fixture_id(rel: &str) -> String {
        let mut id = String::from("ref-");
        let mut last_sep = false;
        for c in rel.chars() {
            if c.is_ascii_alphanumeric() {
                id.push(c);
                last_sep = false;
            } else if !last_sep {
                id.push('-');
                last_sep = true;
            }
        }
        while id.ends_with('-') {
            id.pop();
        }
        id
    }

    /// Smoke test across all fixtures. Reports byte-exact match count,
    /// never panics on mismatch (this renderer isn't byte-exact yet).
    #[test]
    fn reports_byte_exact_pass_count() {
        let base = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
        let mut groups = vec![];
        for sub in ["cypress", "demos"] {
            let dir = base.join(format!("tests/ext_fixtures/{}/state", sub));
            let Ok(entries) = fs::read_dir(&dir) else {
                continue;
            };
            let mut files: Vec<_> = entries.flatten().collect();
            files.sort_by_key(|e| e.file_name());
            for entry in files {
                let p = entry.path();
                if p.extension().and_then(|s| s.to_str()) != Some("mmd") {
                    continue;
                }
                let stem = p
                    .file_stem()
                    .and_then(|s| s.to_str())
                    .unwrap_or("")
                    .to_string();
                let rel = format!("ext_fixtures/{}/state/{}", sub, stem);
                let mmd = match fs::read_to_string(&p) {
                    Ok(s) => s,
                    Err(_) => continue,
                };
                let ref_svg = base.join(format!("tests/reference/{}.svg", rel));
                let expected = match fs::read_to_string(&ref_svg) {
                    Ok(s) => s,
                    Err(_) => continue,
                };
                let id = fixture_id(&rel);
                let theme = get_theme("default");
                let mmd_c = mmd.clone();
                let id_c = id.clone();
                let theme_c = theme.clone();
                let result = std::panic::catch_unwind(std::panic::AssertUnwindSafe(|| {
                    parse(&mmd_c).and_then(|d| {
                        let eff = d
                            .theme_override
                            .as_deref()
                            .map(get_theme)
                            .unwrap_or_else(|| theme_c.clone());
                        let l = crate::layout::state::layout(&d, &eff)?;
                        render(&d, &l, &eff, &id_c)
                    })
                }));
                let got = match result {
                    Ok(Ok(s)) => s,
                    _ => {
                        groups.push((rel, false, false, 0usize));
                        continue;
                    }
                };
                let exact = got == expected;
                // Common-prefix length: load-bearing for tracking how
                // much of the `<svg><style><g>…` shell aligns with the
                // reference. The remainder is the diagram body diff
                // (node/edge geometry, label markup).
                let prefix = got
                    .bytes()
                    .zip(expected.bytes())
                    .take_while(|(a, b)| a == b)
                    .count();
                groups.push((rel, true, exact, prefix));
            }
        }
        let total = groups.len();
        let rendered = groups.iter().filter(|(_, r, _, _)| *r).count();
        let exact = groups.iter().filter(|(_, _, e, _)| *e).count();
        let avg_prefix: usize = if rendered > 0 {
            groups.iter().map(|(_, _, _, p)| *p).sum::<usize>() / rendered
        } else {
            0
        };
        eprintln!(
            "[state] fixtures={} rendered={} byte-exact={} avg-common-prefix={}",
            total, rendered, exact, avg_prefix
        );
        let failed: Vec<&String> = groups
            .iter()
            .filter(|(_, r, _, _)| !*r)
            .map(|(rel, _, _, _)| rel)
            .collect();
        if !failed.is_empty() {
            eprintln!("[state] render-failures ({}):", failed.len());
            for f in failed {
                eprintln!("  - {}", f);
            }
        }
    }
}
