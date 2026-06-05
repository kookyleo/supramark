# Code Highlight Feature

Enables the code highlight pipeline for ordinary Markdown code fences.

- Syntax: standard Markdown inline code and fenced code blocks.
- AST: reuses the core `code` / `inline_code` nodes.
- Compile: contributes the highlight runtime capability; language and theme assets are supplied by preset or language/theme features.
