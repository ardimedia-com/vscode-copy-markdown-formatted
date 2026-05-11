# Changelog

## 0.2.0

**Breaking:** HTML output structure changed from a single outer `<table>` with `<tr><td>` per block to semantic HTML. This is the new default behavior — there is no opt-in setting or fallback to the previous table-based layout.

- Paragraphs now render as `<p style="...">text</p>` instead of `<tr><td>text</td></tr>` — Outlook respects `margin` on `<p>` for spacing
- Body font stack updated to `Aptos, 'Segoe UI', Calibri, Arial, sans-serif` — Aptos is the new Outlook/Office default (replaced Calibri in 2024), with Segoe UI and Calibri as legacy fallbacks
- Headings render as `<h1>`-`<h6>` with margin-based spacing instead of table rows with spacer rows
- Lists render as native `<ul>`/`<ol>` with `<li>` (native bullets / numbers via `start` attribute) instead of table rows with prepended bullet characters
- Task lists render as `<ul style="list-style: none;">` with checkbox unicode characters preserved
- Blockquotes render as `<blockquote>` with left border and margin
- Code blocks render as `<div>` container (no table wrapper) with `<p>` per line, retaining inline font-family for Outlook Classic + New compatibility
- Horizontal rules render as `<hr>` with margin
- Markdown tables continue to render as `<table>` (semantically correct for tabular data)
- No outer wrapper around the document — output starts directly with the first block element

## 0.1.4

- Cross-platform font stack for code blocks (Cascadia Mono, Consolas, Courier New, monospace)
- Fixed crash with nested lists (marked v15 token resolution)
- Fixed crash with code blocks inside list items
- Fixed HTML entity escaping in inline code spans (e.g. `<h1>`, `<div>`)

## 0.1.0

Initial release.

- Copy Markdown selection as formatted HTML
- Copy entire Markdown file as formatted HTML
- Table-based layout for Outlook compatibility (Classic and New)
- Syntax highlighting for fenced code blocks (via highlight.js)
- Consolas font for code blocks (inline + fenced)
- YAML frontmatter stripping
- Windows clipboard via PowerShell (CF_HTML format)
- macOS clipboard via Swift (NSPasteboard)
- Linux clipboard via xclip (X11) or wl-copy (Wayland)
