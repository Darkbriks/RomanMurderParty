import type { Theme } from '#lib/prefs/prefs.ts';

export interface ThemeTokens {
  bg: string;
  bgPanel: string;
  ink: string;
  accent: string;
  frame: string;
  note: string;
  docPaper: string;
}

// `paper` uses the colours of murderparty.sty: ink 1E1B18, sepia 6B4A2B, paper F7F1E3, frame 8C7457, draft red A4262C.
export const THEMES: Record<Theme, ThemeTokens> = {
  paper: { bg: '#F7F1E3', bgPanel: '#EFE6D0', ink: '#1E1B18', accent: '#6B4A2B', frame: '#8C7457', note: '#A4262C', docPaper: '#FBF7EC' },
  sepia: { bg: '#E9D9B8', bgPanel: '#DFCBA2', ink: '#2B2014', accent: '#5A3A1C', frame: '#7A5F3E', note: '#8F1F25', docPaper: '#F1E4C7' },
  dark: { bg: '#1B1815', bgPanel: '#26221E', ink: '#E8DFCB', accent: '#D1A870', frame: '#8C7457', note: '#E57D82', docPaper: '#2D2822' },
};

const COLOR_SCHEME: Record<Theme, 'light' | 'dark'> = { paper: 'light', sepia: 'light', dark: 'dark' };

function themeVars(name: Theme): string {
  const t = THEMES[name];
  return `  --bg: ${t.bg};\n  --bg-panel: ${t.bgPanel};\n  --ink: ${t.ink};\n  --accent: ${t.accent};\n  --frame: ${t.frame};\n  --note: ${t.note};\n  --doc-paper: ${t.docPaper};\n  color-scheme: ${COLOR_SCHEME[name]};`;
}

/**
 * CSS custom properties for every theme, as used by global.css. Plain `:root` gets the paper theme,
 * so the page has colours before the pre-paint script runs, or without JavaScript.
 */
export function themeCss(): string {
  const themes = (Object.keys(THEMES) as Theme[]).map((name) => `:root[data-theme='${name}'] {\n${themeVars(name)}\n}`);
  return [`:root {\n${themeVars('paper')}\n}`, ...themes].join('\n');
}
