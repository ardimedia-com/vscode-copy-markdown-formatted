const FONT_BODY = "Aptos, 'Segoe UI', Calibri, Arial, sans-serif";
export const FONT_CODE = 'Cascadia Mono, Consolas, Courier New, monospace';
const COLOR_TEXT = '#1f2937';
const COLOR_TEXT_LIGHT = '#374151';
const COLOR_MUTED = '#6b7280';
const COLOR_LINK = '#0066cc';
const COLOR_BORDER = '#d1d5db';
const COLOR_BG_LIGHT = '#f3f4f6';
const COLOR_CODE_BG = '#f6f8fa';
const COLOR_CODE_FG = '#24292e';

/** Inline styles — semantic HTML (margin-based spacing) */
export const STYLES: Record<string, string> = {
  h1: `font-family: ${FONT_BODY}; font-size: 28px; font-weight: 600; color: ${COLOR_TEXT}; margin: 16px 0 8px 0;`,
  h2: `font-family: ${FONT_BODY}; font-size: 22px; font-weight: 600; color: ${COLOR_TEXT}; margin: 14px 0 6px 0;`,
  h3: `font-family: ${FONT_BODY}; font-size: 18px; font-weight: 600; color: ${COLOR_TEXT}; margin: 12px 0 4px 0;`,
  h4: `font-family: ${FONT_BODY}; font-size: 16px; font-weight: 600; color: ${COLOR_TEXT}; margin: 10px 0 2px 0;`,
  h5: `font-family: ${FONT_BODY}; font-size: 14px; font-weight: 600; color: ${COLOR_TEXT}; margin: 8px 0 2px 0;`,
  h6: `font-family: ${FONT_BODY}; font-size: 13px; font-weight: 600; color: ${COLOR_MUTED}; margin: 8px 0 2px 0;`,
  p: `font-family: ${FONT_BODY}; font-size: 14px; line-height: 1.6; color: ${COLOR_TEXT_LIGHT}; margin: 0 0 8px 0;`,
  a: `color: ${COLOR_LINK}; text-decoration: none;`,
  strong: `font-weight: 600;`,
  em: `font-style: italic;`,
  code: `font-family: ${FONT_CODE}; background-color: ${COLOR_BG_LIGHT}; color: ${COLOR_TEXT}; padding: 2px 6px;`,
  'code-block': `background-color: ${COLOR_CODE_BG}; padding: 16px; border: 1px solid ${COLOR_BORDER}; font-family: ${FONT_CODE}; font-size: 10pt; color: ${COLOR_CODE_FG}; line-height: 1.6; margin: 0 0 8px 0;`,
  blockquote: `border-left: 4px solid ${COLOR_BORDER}; padding: 4px 0 4px 16px; margin: 0 0 8px 0; color: ${COLOR_MUTED};`,
  list: `font-family: ${FONT_BODY}; font-size: 14px; color: ${COLOR_TEXT_LIGHT}; line-height: 1.6; margin: 0 0 8px 0; padding-left: 24px;`,
  li: `margin: 0 0 4px 0;`,
  table: `border-collapse: collapse; width: 100%; margin: 0 0 8px 0;`,
  th: `background-color: ${COLOR_BG_LIGHT}; padding: 8px 12px; font-weight: 600; border: 1px solid ${COLOR_BORDER}; text-align: left; font-family: ${FONT_BODY}; font-size: 14px;`,
  td: `padding: 8px 12px; border: 1px solid ${COLOR_BORDER}; font-family: ${FONT_BODY}; font-size: 14px;`,
  hr: `border: none; border-top: 1px solid ${COLOR_BORDER}; margin: 8px 0;`,
  img: `max-width: 100%; height: auto;`,
};
