// Theme types
export interface ThemeBackground {
  type: 'solid' | 'gradient' | 'pattern';
  color: string;
  colorEnd?: string;
  direction?: string;
  patternUrl?: string;
}

export interface ThemeText {
  color: string;
  headingColor: string;
  subtextColor: string;
  linkColor: string;
}

export interface ThemeCard {
  bgColor: string;
  borderRadius: string;
  padding: string;
  shadow: string;
}

export interface ThemeCode {
  bgColor: string;
  textColor: string;
  theme: 'light' | 'dark';
}

export interface Theme {
  id: string;
  name: string;
  preview: string; // gradient or color for preview card
  background: ThemeBackground;
  text: ThemeText;
  card: ThemeCard;
  code: ThemeCode;
  accent: string;
  recommendFont?: string;
}

// Element style overrides
export interface HeadingStyle {
  fontSize: number;
  fontWeight: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
  marginBottom: number;
}

export interface BodyStyle {
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
  color: string;
  textAlign: 'left' | 'center' | 'right';
}

export interface BlockquoteStyle {
  bgColor: string;
  borderColor: string;
  borderWidth: number;
  borderRadius: number;
  padding: number;
  color: string;
}

export interface CodeBlockStyle {
  bgColor: string;
  textColor: string;
  borderRadius: number;
  showLineNumbers: boolean;
}

export interface ListStyle {
  indentWidth: number;
  itemSpacing: number;
  markerStyle: 'disc' | 'circle' | 'square' | 'decimal' | 'none';
}

export interface ImageStyle {
  borderRadius: number;
  shadow: string;
  borderWidth: number;
  borderColor: string;
}

export interface DividerStyle {
  style: 'solid' | 'dashed' | 'dotted' | 'gradient';
  color: string;
  width: string; // e.g. '100%' or '50%'
  thickness: number;
}

export interface ElementStyles {
  heading: HeadingStyle;
  body: BodyStyle;
  blockquote: BlockquoteStyle;
  codeBlock: CodeBlockStyle;
  list: ListStyle;
  image: ImageStyle;
  divider: DividerStyle;
  canvasPadding: number;
  paragraphIndent: number;
  paragraphSpacing: number;
}

// Decoration types
export interface WatermarkConfig {
  enabled: boolean;
  type: 'text' | 'image';
  text: string;
  imageUrl?: string;
  opacity: number;
  angle: number;
  spacing: number;
  fontSize: number;
  color: string;
}

export interface LogoConfig {
  enabled: boolean;
  imageUrl: string;
  position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
  size: number;
  opacity: number;
  margin: number;
}

export interface QRCodeConfig {
  enabled: boolean;
  url: string;
  position: 'bottom-center' | 'bottom-left' | 'bottom-right';
  size: number;
  margin: number;
}

export interface PageNumberConfig {
  enabled: boolean;
  format: 'page/total' | 'page' | 'custom';
  customFormat?: string;
  position: 'bottom-center' | 'bottom-right';
  fontSize: number;
  color: string;
}

export interface BorderFrameConfig {
  enabled: boolean;
  style: 'simple' | 'ornate' | 'geometric' | 'none';
  color: string;
  width: number;
  padding: number;
}

export interface DecorationConfig {
  watermark: WatermarkConfig;
  logo: LogoConfig;
  qrCode: QRCodeConfig;
  pageNumber: PageNumberConfig;
  borderFrame: BorderFrameConfig;
}

// Export types
export type ExportMode = 'free' | 'xiaohongshu' | 'moments' | 'a4-portrait' | 'a4-landscape';
export type ExportFormat = 'png' | 'pdf' | 'html';
export type MobileTab = 'editor' | 'preview';

export interface ExportConfig {
  mode: ExportMode;
  format: ExportFormat;
  width?: number;
  height?: number;
  scale: number; // 缩放比例，值越大图片越清晰（像素越多）
}

// Font types
export interface FontOption {
  id: string;
  name: string;
  family: string;
  source: 'builtin' | 'custom';
  url?: string;
  weights: number[];
}

// Store types
export interface AppState {
  // Editor
  markdown: string;
  setMarkdown: (md: string) => void;

  // App theme (UI, not content theme)
  appTheme: 'dark' | 'light';
  setAppTheme: (theme: 'dark' | 'light') => void;

  // Language
  language: 'zh' | 'en';
  setLanguage: (lang: 'zh' | 'en') => void;

  // Theme
  currentThemeId: string;
  setCurrentThemeId: (id: string) => void;

  // Fonts
  globalFont: string;
  headingFont: string;
  codeFont: string;
  setGlobalFont: (font: string) => void;
  setHeadingFont: (font: string) => void;
  setCodeFont: (font: string) => void;

  // Element styles
  elementStyles: ElementStyles;
  updateElementStyles: (styles: Partial<ElementStyles>) => void;

  // Decorations
  decoration: DecorationConfig;
  updateDecoration: (config: Partial<DecorationConfig>) => void;

  // Export
  exportConfig: ExportConfig;
  setExportConfig: (config: Partial<ExportConfig>) => void;

  // Preview
  previewScale: number;
  setPreviewScale: (scale: number) => void;

  // UI state
  activePanel: 'none' | 'size' | 'style' | 'decor' | 'export';
  setActivePanel: (panel: 'none' | 'size' | 'style' | 'decor' | 'export') => void;

  // Mobile
  mobileTab: MobileTab;
  setMobileTab: (tab: MobileTab) => void;
}
