# Copy Markdown Formatted

Copy Markdown as **formatted HTML** to the clipboard. Paste it into Outlook, Teams, Word, or any rich text editor with full styling preserved.

## Features

- **Copy Selection as Formatted HTML** — select text in a Markdown file and copy it with formatting
- **Copy File as Formatted HTML** — copy the entire Markdown file with formatting
- **Configure Copy Formatted…** — opens the settings filtered to this extension

All three commands are available via:
- **Right-click context menu** (in Markdown files)
- **Command Palette** (`Ctrl+Shift+P` > "Markdown: ...")

## Usage

1. Open a Markdown file in VS Code
2. Optionally select a portion of text
3. Right-click and choose **"Copy Selection as Formatted HTML"** or **"Copy File as Formatted HTML"**
4. Paste into Outlook, Teams, Word, or any application that accepts rich text (`Ctrl+V`)

To change fonts, sizes, or the blockquote-stripping behavior, use **"Configure Copy Formatted…"** from the same context menu (see [Settings](#settings)).

The pasted content will include styled headings, bold/italic text, code blocks, tables, lists, blockquotes, and links.

## Paste as **"Keep Source Formatting"**

Most application require **"Keep Source Formatting"** to preserve fonts, colors, backgrounds, and spacing.

### Outlook Classic

After `Ctrl+V`, click the small paste-options icon that appears and select **"Keep Source Formatting"**.

### New Outlook

Two options:

1. **Per paste:** Click the **Paste** icon (or `Ctrl+V`), select **"Keep Source Formatting"**, then confirm with **"Paste anyway"** in the dialog that appears.
2. **Permanent setting:** Go to **Settings** > **Mail** > **Compose and reply** > set **"Paste from other programs"** to **"Keep Source Formatting"**. After this, `Ctrl+V` always preserves the formatting.

## Supported Elements

| Markdown | Rendered as |
|---|---|
| `# Heading` | Styled headings (H1–H6) |
| `**bold**` / `*italic*` | Bold and italic text |
| `` `code` `` | Inline code with background |
| ```` ```lang ```` | Fenced code blocks with syntax highlighting (highlight.js, GitHub light theme) |
| `> Quote` | Styled blockquotes (or stripped to normal paragraphs when the entire input is quoted — see `stripBlockquote` in [Settings](#settings)) |
| Tables | Bordered tables with header styling |
| `- item` / `1. item` | Unordered and ordered lists (with custom `start` number) |
| `- [x] / - [ ]` | Task lists with checkbox characters |
| `[link](url)` | Clickable links |
| `![alt](url)` | Inline images (external URLs only — see Known Limitations) |
| `---` | Horizontal rules |
| `--- ... ---` frontmatter | YAML frontmatter is stripped automatically |

Body text uses the **Aptos** font at **11pt** (with `Segoe UI` / `Calibri` / `Arial` fallbacks) to match the default font and size of new Outlook / Microsoft 365. Fonts and sizes are configurable — see [Settings](#settings).

## Settings

Open via the command **"Markdown: Configure Copy Formatted…"** or VS Code Settings (filter `@ext:ardimedia.copy-markdown-formatted`):

| Setting | Default | Description |
|---|---|---|
| `copyMarkdownFormatted.stripBlockquote` | `true` | If every non-empty line starts with `>` (e.g. quoted email reply), strip one level of blockquote marker before converting. Renders as normal paragraphs instead of a blockquote. |
| `copyMarkdownFormatted.font.body` | `Aptos, 'Segoe UI', Calibri, Arial, sans-serif` | Font family stack for body text, headings, lists, and tables. |
| `copyMarkdownFormatted.font.bodySize` | `11` | Body font size in points. Headings scale automatically (h1 = body + 13pt down to h6 = body + 1pt). |
| `copyMarkdownFormatted.font.code` | `Cascadia Mono, Consolas, Courier New, monospace` | Font family stack for inline code and fenced code blocks. |
| `copyMarkdownFormatted.font.codeSize` | `10` | Code font size in points. |
| `copyMarkdownFormatted.windows.clipboardMode` | `persistentHost` | **Windows only.** `persistentHost` keeps a background PowerShell process ready so copies after the first are near-instant; `oneShot` starts a fresh PowerShell per copy (slower, no background process). |

## Platform Support

| Platform | Status | Clipboard tool |
|---|---|---|
| Windows | Supported | PowerShell 7 (`pwsh`) if installed, else Windows PowerShell (built-in) |
| macOS | Supported | Swift (built-in) |
| Linux (X11) | Supported | `xclip` (install: `sudo apt install xclip`) |
| Linux (Wayland) | Supported | `wl-copy` (install: `sudo apt install wl-clipboard`) |

## Requirements

- VS Code 1.85.0 or newer
- **Windows**: Windows PowerShell (pre-installed). PowerShell 7 (`pwsh`) is used automatically when installed — clipboard copies are noticeably faster with it
- **macOS**: Swift runtime (pre-installed with Xcode CLI tools)
- **Linux**: `xclip` (X11) or `wl-clipboard` (Wayland)

## Known Limitations

- **Images**: Web image URLs (`https://...`) work — Outlook fetches them when rendering. Local file paths (`./image.png`) will not display because the recipient has no access to your filesystem. Embedding images via base64 data URIs is not possible because Outlook strips `data:` URIs for security reasons. CID embedding requires MIME multipart, which the clipboard format does not support.
- **Language / spell check**: The HTML output does not include a `lang` attribute, so email clients may flag words as misspelled when the content language differs from the application's default. Automatic language detection would add a dependency with uncertain accuracy — especially on short texts — and Outlook Classic primarily relies on its own proofing language settings rather than the HTML `lang` attribute.
- macOS and Linux clipboard support has not yet been tested on those platforms.

## License

MIT
