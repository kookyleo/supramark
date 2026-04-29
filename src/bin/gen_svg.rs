use std::fs;

fn main() {
    let args: Vec<String> = std::env::args().collect();
    if args.len() < 3 {
        eprintln!("Usage: gen_svg <fixture_rel> <output_path>");
        std::process::exit(1);
    }
    let rel = &args[1];
    let out_path = &args[2];
    let base = std::path::PathBuf::from(".");
    let mmd = base.join("tests").join(format!("{}.mmd", rel));
    let source = fs::read_to_string(&mmd).unwrap();
    let is_elk = source.trim_start().starts_with("flowchart-elk") || source.contains("layout: elk");
    if is_elk {
        eprintln!("ELK source, skipping");
        std::process::exit(0);
    }
    let d = mermaid_little::parser::flowchart::parse(&source).unwrap();
    let pre = mermaid_little::preprocess::preprocess(&source).unwrap();
    let theme_name = pre.config.theme.as_deref().unwrap_or("default");
    let mut th = mermaid_little::theme::get_theme(theme_name);
    if let Some(tv) = pre.config.theme_variables.as_ref() {
        mermaid_little::theme::apply_theme_variables(&mut th, tv);
    }
    let l = mermaid_little::layout::flowchart::layout(&d, &th).unwrap();
    let id = rel.replace("/", "-").replace(".", "-");
    let got = mermaid_little::render::svg_flowchart::render(&d, &l, &th, &id).unwrap();
    fs::write(out_path, &got).unwrap();
}
