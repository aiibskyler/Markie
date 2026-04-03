import { useRef, useMemo, useState, useEffect } from 'react';
import { marked } from 'marked';
import katex from 'katex';
import { QRCodeSVG } from 'qrcode.react';
import { useStore } from '../../stores/useStore';
import { themes } from '../../themes/presets';
import { t } from '../../i18n';
import styles from './Preview.module.css';

marked.setOptions({ gfm: true, breaks: true });

function renderMathInText(text: string): string {
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<code>${formula}</code>`;
    }
  });
  text = text.replace(/\$([^\$\n]+?)\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: false, throwOnError: false });
    } catch {
      return `<code>${formula}</code>`;
    }
  });
  return text;
}

function escapeXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function getLogoPosition(pos: string, margin: number): React.CSSProperties {
  const base = { position: 'absolute' as const, zIndex: 10 };
  switch (pos) {
    case 'top-left': return { ...base, top: margin, left: margin };
    case 'top-right': return { ...base, top: margin, right: margin };
    case 'bottom-left': return { ...base, bottom: margin, left: margin };
    case 'bottom-right': return { ...base, bottom: margin, right: margin };
    default: return { ...base, top: margin, right: margin };
  }
}

export default function Preview() {
  const { markdown, currentThemeId, globalFont, headingFont, codeFont, elementStyles, decoration, previewScale, exportConfig, language } = useStore();

  const contentRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Observe the scroll container width
  useEffect(() => {
    const el = scrollContainerRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => {
      for (const entry of entries) {
        // Use contentRect.width (excludes padding) minus our 24px padding on each side
        setContainerWidth(entry.contentRect.width - 48);
      }
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const theme = useMemo(() => themes.find((t) => t.id === currentThemeId) || themes[0], [currentThemeId]);
  const renderedHtml = useMemo(() => marked.parse(renderMathInText(markdown)) as string, [markdown]);

  const bgStyle = useMemo(() => {
    if (theme.background.type === 'gradient') {
      return { background: `linear-gradient(${theme.background.direction}, ${theme.background.color}, ${theme.background.colorEnd})` };
    }
    return { backgroundColor: theme.background.color };
  }, [theme]);

  const cardStyle = useMemo(() => ({
    backgroundColor: theme.card.bgColor,
    borderRadius: theme.card.borderRadius,
    boxShadow: theme.card.shadow,
  }), [theme]);

  const contentWidth = useMemo(() => {
    switch (exportConfig.mode) {
      case 'xiaohongshu': return 540;
      case 'moments': return 540;
      case 'a4-portrait': return 794;
      case 'a4-landscape': return 1123;
      default: return exportConfig.width || 1080;
    }
  }, [exportConfig.mode, exportConfig.width]);

  // Auto-fit: recalculate previewScale when container or content width changes
  useEffect(() => {
    if (containerWidth <= 0) return;
    const fit = Math.max(0.3, Math.min(1, containerWidth / contentWidth));
    // Round to nearest 5% step
    const stepped = Math.round(fit * 20) / 20;
    useStore.getState().setPreviewScale(stepped);
  }, [containerWidth, contentWidth]);

  // In free mode, height is auto (determined by content). Other modes use fixed heights.
  const contentHeight = useMemo((): number | undefined => {
    switch (exportConfig.mode) {
      case 'xiaohongshu': return Math.max(720, contentWidth * (4 / 3));
      case 'a4-portrait': return 1123;
      case 'a4-landscape': return 794;
      default: return undefined; // free mode: auto height
    }
  }, [exportConfig, contentWidth]);

  const elementStyleVars = useMemo((): React.CSSProperties => ({
    '--heading-font': headingFont || globalFont,
    '--body-font': globalFont,
    '--code-font': codeFont,
    '--heading-size': `${elementStyles.heading.fontSize}px`,
    '--heading-weight': elementStyles.heading.fontWeight,
    '--heading-color': elementStyles.heading.color || theme.text.headingColor,
    '--heading-align': elementStyles.heading.textAlign,
    '--heading-margin-bottom': `${elementStyles.heading.marginBottom}px`,
    '--body-size': `${elementStyles.body.fontSize}px`,
    '--body-line-height': elementStyles.body.lineHeight,
    '--body-letter-spacing': `${elementStyles.body.letterSpacing}px`,
    '--body-color': elementStyles.body.color || theme.text.color,
    '--body-align': elementStyles.body.textAlign,
    '--blockquote-bg': elementStyles.blockquote.bgColor || 'rgba(0,0,0,0.04)',
    '--blockquote-border': elementStyles.blockquote.borderColor || theme.accent,
    '--blockquote-border-width': `${elementStyles.blockquote.borderWidth}px`,
    '--blockquote-radius': `${elementStyles.blockquote.borderRadius}px`,
    '--blockquote-padding': `${elementStyles.blockquote.padding}px`,
    '--blockquote-color': elementStyles.blockquote.color || theme.text.subtextColor,
    '--code-bg': elementStyles.codeBlock.bgColor || theme.code.bgColor,
    '--code-color': elementStyles.codeBlock.textColor || theme.code.textColor,
    '--code-radius': `${elementStyles.codeBlock.borderRadius}px`,
    '--list-indent': `${elementStyles.list.indentWidth}px`,
    '--list-item-spacing': `${elementStyles.list.itemSpacing}px`,
    '--list-marker': elementStyles.list.markerStyle,
    '--img-radius': `${elementStyles.image.borderRadius}px`,
    '--img-shadow': elementStyles.image.shadow,
    '--img-border-width': `${elementStyles.image.borderWidth}px`,
    '--img-border-color': elementStyles.image.borderColor,
    '--divider-color': elementStyles.divider.color || theme.text.subtextColor,
    '--divider-width': elementStyles.divider.width,
    '--divider-thickness': `${elementStyles.divider.thickness}px`,
    '--link-color': theme.text.linkColor,
    '--subtext-color': theme.text.subtextColor,
    '--accent-color': theme.accent,
    '--paragraph-indent': `${elementStyles.paragraphIndent}em`,
    '--paragraph-spacing': `${elementStyles.paragraphSpacing}px`,
  } as React.CSSProperties), [elementStyles, theme, headingFont, globalFont, codeFont]);

  const watermarkStyle = useMemo((): React.CSSProperties | null => {
    const wm = decoration.watermark;
    if (!wm.enabled) return null;

    const base: React.CSSProperties = {
      position: 'absolute',
      top: '-50%',
      left: '-50%',
      width: '200%',
      height: '200%',
      opacity: wm.opacity,
      pointerEvents: 'none',
      zIndex: 10,
      transform: `rotate(${wm.angle}deg)`,
    };

    if (wm.type === 'text' && wm.text) {
      const charWidth = wm.fontSize * 0.6;
      const textWidth = wm.text.length * charWidth;
      const patternW = Math.max(Math.round(textWidth + wm.spacing), 50);
      const patternH = Math.max(Math.round(wm.fontSize * 1.8 + wm.spacing), 30);

      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${patternW}' height='${patternH}'>`
        + `<text x='${patternW / 2}' y='${patternH / 2}' font-size='${wm.fontSize}' fill='${wm.color}' `
        + `text-anchor='middle' dominant-baseline='central' font-family='sans-serif'>`
        + `${escapeXml(wm.text)}</text></svg>`;

      return {
        ...base,
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundRepeat: 'repeat',
      };
    }

    if (wm.type === 'image' && wm.imageUrl) {
      const imgSize = 100;
      const bgSize = imgSize + wm.spacing;

      return {
        ...base,
        backgroundImage: `url(${wm.imageUrl})`,
        backgroundRepeat: 'repeat',
        backgroundSize: `${bgSize}px ${bgSize}px`,
      };
    }

    return null;
  }, [decoration.watermark]);

  return (
    <div className={styles.preview}>
      <div className={styles.header}>
        <span className={styles.title}>{t('preview.title', language)}</span>
        <div className={styles.scaleControls}>
          <button className={styles.scaleBtn} onClick={() => useStore.getState().setPreviewScale(Math.max(0.3, Math.round((previewScale - 0.05) * 100) / 100))}>−</button>
          <span className={styles.scaleValue}>{Math.round(previewScale * 100)}%</span>
          <button className={styles.scaleBtn} onClick={() => useStore.getState().setPreviewScale(Math.min(1, Math.round((previewScale + 0.05) * 100) / 100))}>+</button>
        </div>
      </div>
      <div className={styles.scrollContainer} ref={scrollContainerRef}>
        <div className={styles.scaleWrapper} style={{ transform: `scale(${previewScale})`, transformOrigin: 'top center' }}>
          <div
            ref={contentRef}
            className={styles.content}
            style={{
              ...bgStyle,
              ...cardStyle,
              ...elementStyleVars,
              width: contentWidth,
              ...(contentHeight != null ? { minHeight: contentHeight } : {}),
              position: 'relative',
              padding: elementStyles.canvasPadding,
            }}
            data-export="markie-content"
          >
            {/* Watermark */}
            {watermarkStyle && <div style={watermarkStyle} />}

            {/* Logo */}
            {decoration.logo.enabled && decoration.logo.imageUrl && (
              <img
                src={decoration.logo.imageUrl}
                alt="logo"
                style={{
                  ...getLogoPosition(decoration.logo.position, decoration.logo.margin),
                  width: decoration.logo.size,
                  height: decoration.logo.size,
                  opacity: decoration.logo.opacity,
                  objectFit: 'contain',
                }}
              />
            )}

            {/* Main content (wrapped in border frame if enabled) */}
            {decoration.borderFrame.enabled ? (
              <div style={{
                border: `${decoration.borderFrame.width}px solid ${decoration.borderFrame.color}`,
                borderRadius:
                  decoration.borderFrame.style === 'ornate' ? '24px' :
                  decoration.borderFrame.style === 'geometric' ? '0px' : '4px',
                padding: decoration.borderFrame.padding,
              }}>
                <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
              </div>
            ) : (
              <div dangerouslySetInnerHTML={{ __html: renderedHtml }} />
            )}

            {/* QR Code */}
            {decoration.qrCode.enabled && decoration.qrCode.url && (
              <div style={{
                display: 'flex',
                justifyContent:
                  decoration.qrCode.position === 'bottom-left' ? 'flex-start' :
                  decoration.qrCode.position === 'bottom-right' ? 'flex-end' : 'center',
                marginTop: 16,
                paddingBottom: decoration.qrCode.margin,
              }}>
                <QRCodeSVG
                  value={decoration.qrCode.url}
                  size={decoration.qrCode.size}
                  bgColor="transparent"
                  fgColor={theme.text.color}
                />
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
