import { Marked, type Renderer, type Tokens } from 'marked';
import { STYLES, FONT_CODE, FONT_SIZE_CODE } from './styles';
import { highlightCode } from './highlighter';

function s(tag: string): string {
  return STYLES[tag] ?? '';
}

const renderer: Partial<Renderer> = {
  heading({ tokens, depth }: Tokens.Heading): string {
    const tag = `h${depth}`;
    const text = this.parser.parseInline(tokens);
    return `<${tag} style="${s(tag)}">${text}</${tag}>\n`;
  },

  paragraph({ tokens }: Tokens.Paragraph): string {
    const text = this.parser.parseInline(tokens);
    return `<p style="${s('p')}">${text}</p>\n`;
  },

  strong({ tokens }: Tokens.Strong): string {
    const text = this.parser.parseInline(tokens);
    return `<strong style="${s('strong')}">${text}</strong>`;
  },

  em({ tokens }: Tokens.Em): string {
    const text = this.parser.parseInline(tokens);
    return `<em style="${s('em')}">${text}</em>`;
  },

  link({ href, title, tokens }: Tokens.Link): string {
    const text = this.parser.parseInline(tokens);
    const titleAttr = title ? ` title="${title}"` : '';
    return `<a href="${href}" style="${s('a')}"${titleAttr}>${text}</a>`;
  },

  image({ href, title, text }: Tokens.Image): string {
    const titleAttr = title ? ` title="${title}"` : '';
    return `<img src="${href}" alt="${text}" style="${s('img')}"${titleAttr} />`;
  },

  code({ text, lang }: Tokens.Code): string {
    const highlightedLines = highlightCode(text, lang);

    let lines: string;
    if (highlightedLines) {
      // Highlighted: hljs already HTML-escapes the source text.
      lines = highlightedLines.map(
        (line) => `<p style="margin:0;font-family:${FONT_CODE};font-size:${FONT_SIZE_CODE}">${line || '&nbsp;'}</p>`
      ).join('');
    } else {
      // No class=MsoNormal — New Outlook resets MsoNormal font-family to Calibri.
      // Pure inline styles work for both Classic and New Outlook.
      const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
      lines = escaped.split('\n').map(
        (line) => `<p style="margin:0;font-family:${FONT_CODE};font-size:${FONT_SIZE_CODE}"><span style="font-family:${FONT_CODE};font-size:${FONT_SIZE_CODE}">${line || '&nbsp;'}</span></p>`
      ).join('');
    }

    return `<div style="${s('code-block')}">${lines}</div>\n`;
  },

  codespan({ text }: Tokens.Codespan): string {
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `<span style="${s('code')}">${escaped}</span>`;
  },

  blockquote({ tokens }: Tokens.Blockquote): string {
    const innerHtml = this.parser.parse(tokens);
    return `<blockquote style="${s('blockquote')}">${innerHtml}</blockquote>\n`;
  },

  list({ ordered, start, items }: Tokens.List): string {
    const tag = ordered ? 'ol' : 'ul';
    const isTaskList = items.length > 0 && items.every((it) => it.task);
    const listStyle = isTaskList ? `${s('list')} list-style: none;` : s('list');
    const startAttr = ordered && start !== 1 && start !== undefined ? ` start="${start}"` : '';

    const itemsHtml = items.map((item) => {
      // Get inline content from the first paragraph (or text) token
      const firstToken = item.tokens[0];
      const inlineTokens = firstToken?.type === 'paragraph'
        ? (firstToken as Tokens.Paragraph).tokens
        : firstToken?.type === 'text' ? [firstToken] : [];
      const body = this.parser.parseInline(inlineTokens);

      // Render any block-level tokens after the first paragraph
      // (nested lists, code blocks, blockquotes, etc.)
      const blockTokens = item.tokens.slice(
        firstToken?.type === 'paragraph' || firstToken?.type === 'text' ? 1 : 0
      );
      const nestedContent = blockTokens.length > 0
        ? this.parser.parse(blockTokens)
        : '';

      const checkbox = item.task ? (item.checked ? '&#9745; ' : '&#9744; ') : '';

      return `<li style="${s('li')}">${checkbox}${body}${nestedContent}</li>`;
    }).join('\n');

    return `<${tag} style="${listStyle}"${startAttr}>\n${itemsHtml}\n</${tag}>\n`;
  },

  table({ header, rows: tableRows }: Tokens.Table): string {
    const headerCells = header
      .map((cell) => {
        const text = this.parser.parseInline(cell.tokens);
        const align = cell.align ? ` text-align: ${cell.align};` : '';
        return `<th style="${s('th')}${align}">${text}</th>`;
      })
      .join('');

    const bodyRows = tableRows
      .map((tableRow) => {
        const cells = tableRow
          .map((cell) => {
            const text = this.parser.parseInline(cell.tokens);
            const align = cell.align ? ` text-align: ${cell.align};` : '';
            return `<td style="${s('td')}${align}">${text}</td>`;
          })
          .join('');
        return `<tr>${cells}</tr>`;
      })
      .join('\n');

    return `<table cellpadding="0" cellspacing="0" border="0" style="${s('table')}"><thead><tr>${headerCells}</tr></thead><tbody>${bodyRows}</tbody></table>\n`;
  },

  hr(_token: Tokens.Hr): string {
    return `<hr style="${s('hr')}" />\n`;
  },
};

const marked = new Marked({ renderer });

/** Strip YAML frontmatter (---\n...\n---) so it is not rendered as <hr> */
function stripFrontmatter(md: string): string {
  return md.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n?/, '');
}

export function convertMarkdownToStyledHtml(markdown: string): string {
  return marked.parse(stripFrontmatter(markdown)) as string;
}
