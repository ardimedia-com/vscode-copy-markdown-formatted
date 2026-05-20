export interface StyleConfig {
  fontBody: string;
  fontBodySize: number;
  fontCode: string;
  fontCodeSize: number;
}

export const DEFAULT_STYLE_CONFIG: StyleConfig = {
  fontBody: "Aptos, 'Segoe UI', Calibri, Arial, sans-serif",
  fontBodySize: 11,
  fontCode: 'Cascadia Mono, Consolas, Courier New, monospace',
  fontCodeSize: 10,
};

const COLOR_TEXT = '#1f2937';
const COLOR_TEXT_LIGHT = '#374151';
const COLOR_MUTED = '#6b7280';
const COLOR_LINK = '#0066cc';
const COLOR_BORDER = '#d1d5db';
const COLOR_BG_LIGHT = '#f3f4f6';
const COLOR_CODE_BG = '#f6f8fa';
const COLOR_CODE_FG = '#24292e';

// Heading offsets in pt from the body size. Matches the legacy 24/18/16/14/13/12pt
// scale when bodySize = 11pt (the Outlook / Microsoft 365 default).
const HEADING_OFFSETS_PT = [13, 7, 5, 3, 2, 1] as const;

export interface StyleBundle {
  /** Inline CSS strings per tag. */
  styles: Record<string, string>;
  /** Code font family (used by converter.ts when wrapping code lines). */
  fontCode: string;
  /** Code font size with unit (e.g. "10pt") — used by converter.ts. */
  fontCodeSize: string;
}

export function buildStyles(config: StyleConfig = DEFAULT_STYLE_CONFIG): StyleBundle {
  const body = config.fontBody;
  const bodySize = `${config.fontBodySize}pt`;
  const code = config.fontCode;
  const codeSize = `${config.fontCodeSize}pt`;
  const h = (idx: number) => `${config.fontBodySize + HEADING_OFFSETS_PT[idx]}pt`;

  const styles: Record<string, string> = {
    h1: `font-family: ${body}; font-size: ${h(0)}; font-weight: 600; color: ${COLOR_TEXT}; margin: 16px 0 8px 0;`,
    h2: `font-family: ${body}; font-size: ${h(1)}; font-weight: 600; color: ${COLOR_TEXT}; margin: 14px 0 6px 0;`,
    h3: `font-family: ${body}; font-size: ${h(2)}; font-weight: 600; color: ${COLOR_TEXT}; margin: 12px 0 4px 0;`,
    h4: `font-family: ${body}; font-size: ${h(3)}; font-weight: 600; color: ${COLOR_TEXT}; margin: 10px 0 2px 0;`,
    h5: `font-family: ${body}; font-size: ${h(4)}; font-weight: 600; color: ${COLOR_TEXT}; margin: 8px 0 2px 0;`,
    h6: `font-family: ${body}; font-size: ${h(5)}; font-weight: 600; color: ${COLOR_MUTED}; margin: 8px 0 2px 0;`,
    p: `font-family: ${body}; font-size: ${bodySize}; line-height: 1.6; color: ${COLOR_TEXT_LIGHT}; margin: 0 0 8px 0;`,
    a: `color: ${COLOR_LINK}; text-decoration: none;`,
    strong: `font-weight: 600;`,
    em: `font-style: italic;`,
    code: `font-family: ${code}; background-color: ${COLOR_BG_LIGHT}; color: ${COLOR_TEXT}; padding: 2px 6px;`,
    'code-block': `background-color: ${COLOR_CODE_BG}; padding: 16px; border: 1px solid ${COLOR_BORDER}; font-family: ${code}; font-size: ${codeSize}; color: ${COLOR_CODE_FG}; line-height: 1.6; margin: 0 0 8px 0;`,
    blockquote: `border-left: 4px solid ${COLOR_BORDER}; padding: 4px 0 4px 16px; margin: 0 0 8px 0; color: ${COLOR_MUTED};`,
    list: `font-family: ${body}; font-size: ${bodySize}; color: ${COLOR_TEXT_LIGHT}; line-height: 1.6; margin: 0 0 8px 0; padding-left: 24px;`,
    li: `margin: 0 0 4px 0;`,
    table: `border-collapse: collapse; width: 100%; margin: 0 0 8px 0;`,
    th: `background-color: ${COLOR_BG_LIGHT}; padding: 8px 12px; font-weight: 600; border: 1px solid ${COLOR_BORDER}; text-align: left; font-family: ${body}; font-size: ${bodySize};`,
    td: `padding: 8px 12px; border: 1px solid ${COLOR_BORDER}; font-family: ${body}; font-size: ${bodySize};`,
    hr: `border: none; border-top: 1px solid ${COLOR_BORDER}; margin: 8px 0;`,
    img: `max-width: 100%; height: auto;`,
  };

  return { styles, fontCode: code, fontCodeSize: codeSize };
}
