import { create } from 'zustand';
import type {
  AppState,
  ElementStyles,
  DecorationConfig,
  ExportConfig,
} from '../types';

const defaultElementStyles: ElementStyles = {
  heading: {
    fontSize: 40,
    fontWeight: 700,
    color: '',
    textAlign: 'left',
    marginBottom: 20,
  },
  body: {
    fontSize: 32,
    lineHeight: 1.9,
    letterSpacing: 0.5,
    color: '',
    textAlign: 'left',
  },
  blockquote: {
    bgColor: '',
    borderColor: '',
    borderWidth: 4,
    borderRadius: 12,
    padding: 20,
    color: '',
  },
  codeBlock: {
    bgColor: '',
    textColor: '',
    borderRadius: 10,
    showLineNumbers: false,
  },
  list: {
    indentWidth: 28,
    itemSpacing: 10,
    markerStyle: 'disc',
  },
  image: {
    borderRadius: 12,
    shadow: '0 2px 12px rgba(0,0,0,0.1)',
    borderWidth: 0,
    borderColor: '#000000',
  },
  divider: {
    style: 'solid',
    color: '',
    width: '100%',
    thickness: 1,
  },
  canvasPadding: 80,
  paragraphIndent: 2,
  paragraphSpacing: 20,
};

const defaultDecoration: DecorationConfig = {
  watermark: {
    enabled: false,
    type: 'text',
    text: '',
    opacity: 0.2,
    angle: -30,
    spacing: 40,
    fontSize: 16,
    color: '#000000',
  },
  logo: {
    enabled: false,
    imageUrl: '',
    position: 'top-left',
    size: 80,
    opacity: 1,
    margin: 16,
  },
  qrCode: {
    enabled: false,
    url: '',
    position: 'bottom-center',
    size: 80,
    margin: 16,
  },
  pageNumber: {
    enabled: false,
    format: 'page/total',
    position: 'bottom-center',
    fontSize: 12,
    color: '#888888',
  },
  borderFrame: {
    enabled: false,
    style: 'simple',
    color: '#cccccc',
    width: 2,
    padding: 16,
  },
};

const defaultExportConfig: ExportConfig = {
  mode: 'free',
  format: 'png',
  width: 1080,
  height: 1200,
  scale: 1,
};

const defaultMarkdown = `# Welcome to Markie ✨

> A beautiful Markdown-to-image tool.

## Features

- **Multiple Themes** — Choose from 8+ preset themes
- **Custom Fonts** — Built-in Chinese fonts support
- **Style Control** — Fine-tune every element
- **Decorations** — Watermarks, logos, QR codes

## Code Example

\`\`\`javascript
function hello(name) {
  console.log(\`Hello, \${name}!\`);
}
hello("Markie");
\`\`\`

## Math Formula

Inline: $E = mc^{2}$

Block:
$$\\int_{-\\infty}^{\\infty} e^{-x^2} dx = \\sqrt{\\pi}$$

## Quote

> The only way to do great work is to love what you do.
> — Steve Jobs

---

*Made with Markie*
`;

export const useStore = create<AppState>((set) => ({
  markdown: defaultMarkdown,
  setMarkdown: (md) => set({ markdown: md }),

  appTheme: 'light',
  setAppTheme: (theme) => set({ appTheme: theme }),

  language: 'zh',
  setLanguage: (lang) => set({ language: lang }),

  currentThemeId: 'minimal-white',
  setCurrentThemeId: (id) => set({ currentThemeId: id }),

  globalFont: 'Noto Serif SC',
  headingFont: '',
  codeFont: 'Consolas, Monaco, monospace',
  setGlobalFont: (font) => set({ globalFont: font }),
  setHeadingFont: (font) => set({ headingFont: font }),
  setCodeFont: (font) => set({ codeFont: font }),

  elementStyles: defaultElementStyles,
  updateElementStyles: (styles) =>
    set((state) => ({
      elementStyles: { ...state.elementStyles, ...styles },
    })),

  decoration: defaultDecoration,
  updateDecoration: (config) =>
    set((state) => ({
      decoration: { ...state.decoration, ...config },
    })),

  exportConfig: defaultExportConfig,
  setExportConfig: (config) =>
    set((state) => ({
      exportConfig: { ...state.exportConfig, ...config },
    })),

  previewScale: 0.6,
  setPreviewScale: (scale) => set({ previewScale: scale }),

  activePanel: 'none',
  setActivePanel: (panel) => set({ activePanel: panel }),
}));
