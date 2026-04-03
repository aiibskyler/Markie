import { useRef, useMemo, useState, useEffect } from 'react';
import { marked } from 'marked';
import katex from 'katex';
import { QRCodeSVG } from 'qrcode.react';
import { useStore } from '../../stores/useStore';
import { themes } from '../../themes/presets';
import { t } from '../../i18n';
import styles from './Preview.module.css';
import type { DecorationConfig } from '../../types';

marked.setOptions({ gfm: true, breaks: true });

function renderMathInText(text: string): string {
  text = text.replace(/\$\$([\s\S]*?)\$\$/g, (_, formula) => {
    try {
      return katex.renderToString(formula.trim(), { displayMode: true, throwOnError: false });
    } catch {
      return `<code>${formula}</code>`;
    }
  });
  text = text.replace(/\$([^$\n]+?)\$/g, (_, formula) => {
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

function getEffectiveLogoMargin(
  decoration: DecorationConfig,
  canvasPadding: number,
) {
  const basePadding = canvasPadding;
  const borderOffset = decoration.borderFrame.enabled
    ? decoration.borderFrame.width + decoration.borderFrame.padding
    : 0;

  return basePadding + borderOffset;
}

function getReservedSpace(decoration: DecorationConfig) {
  const reserved = { top: 0, right: 0, bottom: 0, left: 0 };

  if (decoration.borderFrame.enabled) {
    return reserved;
  }

  if (decoration.logo.enabled && decoration.logo.imageUrl) {
    const logoGap = Math.max(18, Math.round(decoration.logo.size * 0.16));
    const logoSpace = Math.round(decoration.logo.size * 0.58) + decoration.logo.margin + logoGap;
    if (decoration.logo.position.startsWith('top')) {
      reserved.top = Math.max(reserved.top, logoSpace);
    } else {
      reserved.bottom = Math.max(reserved.bottom, logoSpace);
    }
  }

  if (decoration.qrCode.enabled && decoration.qrCode.url) {
    reserved.bottom = Math.max(reserved.bottom, decoration.qrCode.size + decoration.qrCode.margin + 32);
  }

  return reserved;
}

function getFrameInsets(decoration: DecorationConfig) {
  const inset = { top: 0, right: 0, bottom: 0, left: 0 };

  if (decoration.logo.enabled && decoration.logo.imageUrl) {
    const frameLogoGap = Math.max(16, Math.round(decoration.logo.size * 0.12));
    const logoInset = decoration.logo.size + decoration.logo.margin + frameLogoGap;
    switch (decoration.logo.position) {
      case 'top-left':
        inset.top = Math.max(inset.top, logoInset);
        break;
      case 'top-right':
        inset.top = Math.max(inset.top, logoInset);
        break;
      case 'bottom-left':
        inset.bottom = Math.max(inset.bottom, logoInset);
        break;
      case 'bottom-right':
        inset.bottom = Math.max(inset.bottom, logoInset);
        break;
    }
  }

  if (decoration.qrCode.enabled && decoration.qrCode.url) {
    const qrInset = decoration.qrCode.size + decoration.qrCode.margin + 28;
    inset.bottom = Math.max(inset.bottom, qrInset);

    if (decoration.qrCode.position === 'bottom-left') {
      inset.left = Math.max(inset.left, decoration.qrCode.size + decoration.qrCode.margin + 16);
    }

    if (decoration.qrCode.position === 'bottom-right') {
      inset.right = Math.max(inset.right, decoration.qrCode.size + decoration.qrCode.margin + 16);
    }
  }

  return inset;
}

function isA4Mode(mode: string) {
  return mode === 'a4-portrait' || mode === 'a4-landscape';
}

function getPageNumberLabel(
  format: DecorationConfig['pageNumber']['format'],
  page: number,
  total: number,
  customFormat?: string,
) {
  switch (format) {
    case 'page':
      return String(page);
    case 'custom':
      return customFormat
        ? customFormat.replace(/\{page\}/g, String(page)).replace(/\{total\}/g, String(total))
        : `${page}`;
    case 'page/total':
    default:
      return `${page}/${total}`;
  }
}

function getAdaptiveWatermarkColor(
  watermarkColor: string,
  fallbackLight: string,
  fallbackDark: string,
  isDarkTheme: boolean,
) {
  const normalized = watermarkColor.trim().toLowerCase();
  const isDefaultBlack = normalized === '#000000' || normalized === '#000' || normalized === 'rgb(0, 0, 0)';

  if (!normalized || isDefaultBlack) {
    return isDarkTheme ? fallbackDark : fallbackLight;
  }

  return watermarkColor;
}

export default function Preview() {
  const { markdown, currentThemeId, globalFont, headingFont, codeFont, elementStyles, decoration, previewScale, exportConfig, language, appTheme } = useStore();

  const contentRef = useRef<HTMLDivElement>(null);
  const measureRef = useRef<HTMLDivElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [pages, setPages] = useState<string[]>([]);

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
  const isDarkContentTheme = useMemo(() => {
    return theme.code.theme === 'dark';
  }, [theme]);

  const bgStyle = useMemo(() => {
    if (exportConfig.mode === 'moments') {
      if (theme.background.type === 'gradient') {
        return {
          background: `linear-gradient(${theme.background.direction}, ${theme.background.color}, ${theme.background.colorEnd})`,
          backgroundAttachment: 'local',
        };
      }

      return {
        backgroundColor: theme.background.color,
      };
    }

    if (theme.background.type === 'gradient') {
      return { background: `linear-gradient(${theme.background.direction}, ${theme.background.color}, ${theme.background.colorEnd})` };
    }
    return { backgroundColor: theme.background.color };
  }, [theme, exportConfig.mode]);

  const cardStyle = useMemo(() => {
    if (exportConfig.mode === 'moments') {
      return {
        backgroundColor: typeof theme.card.bgColor === 'string' && theme.card.bgColor.includes('rgba')
          ? theme.card.bgColor.replace(/0\.(\d+)/, '0.92')
          : 'rgba(255,255,255,0.92)',
        borderRadius: '28px',
        boxShadow: '0 18px 42px rgba(15, 23, 42, 0.10)',
      };
    }

    return {
      backgroundColor: theme.card.bgColor,
      borderRadius: theme.card.borderRadius,
      boxShadow: theme.card.shadow,
    };
  }, [theme, exportConfig.mode]);

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

  const elementStyleVars = useMemo((): React.CSSProperties => {
    const headingSize = exportConfig.mode === 'moments'
      ? Math.max(24, elementStyles.heading.fontSize)
      : elementStyles.heading.fontSize;
    const headingWeight = exportConfig.mode === 'moments'
      ? Math.min(800, elementStyles.heading.fontWeight)
      : elementStyles.heading.fontWeight;
    const headingMarginBottom = exportConfig.mode === 'moments'
      ? Math.max(24, elementStyles.heading.marginBottom)
      : elementStyles.heading.marginBottom;
    const bodySize = exportConfig.mode === 'moments'
      ? Math.max(22, elementStyles.body.fontSize)
      : elementStyles.body.fontSize;
    const bodyLineHeight = exportConfig.mode === 'moments'
      ? Math.max(2, elementStyles.body.lineHeight)
      : elementStyles.body.lineHeight;
    const bodyLetterSpacing = exportConfig.mode === 'moments'
      ? Math.min(0.3, elementStyles.body.letterSpacing)
      : elementStyles.body.letterSpacing;
    const paragraphSpacing = exportConfig.mode === 'moments'
      ? Math.max(24, elementStyles.paragraphSpacing)
      : elementStyles.paragraphSpacing;

    return ({
    '--heading-font': headingFont || globalFont,
    '--body-font': globalFont,
    '--code-font': codeFont,
    '--heading-size': `${headingSize}px`,
    '--heading-weight': headingWeight,
    '--heading-color': elementStyles.heading.color || theme.text.headingColor,
    '--heading-align': elementStyles.heading.textAlign,
    '--heading-margin-bottom': `${headingMarginBottom}px`,
    '--body-size': `${bodySize}px`,
    '--body-line-height': bodyLineHeight,
    '--body-letter-spacing': `${bodyLetterSpacing}px`,
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
    '--paragraph-spacing': `${paragraphSpacing}px`,
  } as React.CSSProperties);
  }, [elementStyles, theme, headingFont, globalFont, codeFont, exportConfig.mode]);

  const watermarkStyle = useMemo((): React.CSSProperties | null => {
    const wm = decoration.watermark;
    if (!wm.enabled) return null;
    const fallbackText = language === 'zh' ? '水印' : 'WATERMARK';
    const watermarkText = wm.text.trim() || fallbackText;

    const base: React.CSSProperties = {
      position: 'absolute',
      top: '-90%',
      right: '-90%',
      bottom: '-90%',
      left: '-90%',
      opacity: wm.opacity,
      pointerEvents: 'none',
      zIndex: 0,
      transform: `rotate(${wm.angle}deg)`,
      transformOrigin: 'center',
    };

    if (wm.type === 'text') {
      const watermarkColor = getAdaptiveWatermarkColor(
        wm.color,
        'rgba(0,0,0,0.18)',
        'rgba(255,255,255,0.28)',
        isDarkContentTheme,
      );
      const charWidth = wm.fontSize * 0.6;
      const textWidth = watermarkText.length * charWidth;
      const patternW = Math.max(Math.round(textWidth + wm.spacing), 50);
      const patternH = Math.max(Math.round(wm.fontSize * 1.8 + wm.spacing), 30);

      const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${patternW}' height='${patternH}'>`
        + `<text x='${patternW / 2}' y='${patternH / 2}' font-size='${wm.fontSize}' fill='${watermarkColor}' `
        + `text-anchor='middle' dominant-baseline='central' font-family='sans-serif'>`
        + `${escapeXml(watermarkText)}</text></svg>`;

      return {
        ...base,
        backgroundImage: `url("data:image/svg+xml,${encodeURIComponent(svg)}")`,
        backgroundRepeat: 'repeat',
        backgroundPosition: 'center',
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
        backgroundPosition: 'center',
      };
    }

    return null;
  }, [decoration.watermark, isDarkContentTheme, language]);

  const reservedSpace = useMemo(() => getReservedSpace(decoration), [decoration]);
  const frameInsets = useMemo(() => getFrameInsets(decoration), [decoration]);
  const logoMargin = useMemo(
    () => getEffectiveLogoMargin(decoration, elementStyles.canvasPadding),
    [decoration, elementStyles.canvasPadding]
  );
  const qrCardStyle = useMemo((): React.CSSProperties => {
    if (isDarkContentTheme) {
      return {
        background: 'rgba(17, 24, 39, 0.72)',
        border: '1px solid rgba(255,255,255,0.12)',
        boxShadow: '0 18px 40px rgba(0, 0, 0, 0.28)',
        backdropFilter: 'blur(12px)',
      };
    }

    return {
      background: 'rgba(255, 255, 255, 0.94)',
      border: '1px solid rgba(255, 255, 255, 0.7)',
      boxShadow: '0 16px 40px rgba(0, 0, 0, 0.14)',
      backdropFilter: 'blur(12px)',
    };
  }, [isDarkContentTheme]);

  const contentAreaMetrics = useMemo(() => {
    const canvasPadding = elementStyles.canvasPadding;
    const borderExtra = decoration.borderFrame.enabled
      ? decoration.borderFrame.padding + decoration.borderFrame.width
      : 0;

    const horizontalInset = canvasPadding * 2
      + frameInsets.left
      + frameInsets.right
      + reservedSpace.left
      + reservedSpace.right
      + borderExtra * 2;

    const verticalInset = canvasPadding * 2
      + frameInsets.top
      + frameInsets.bottom
      + reservedSpace.top
      + reservedSpace.bottom
      + borderExtra * 2;

    return {
      width: Math.max(120, contentWidth - horizontalInset),
      height: contentHeight != null
        ? Math.max(120, contentHeight - verticalInset)
        : undefined,
    };
  }, [contentWidth, contentHeight, decoration.borderFrame.enabled, decoration.borderFrame.padding, decoration.borderFrame.width, elementStyles.canvasPadding, frameInsets.bottom, frameInsets.left, frameInsets.right, frameInsets.top, reservedSpace.bottom, reservedSpace.left, reservedSpace.right, reservedSpace.top]);

  useEffect(() => {
    if (!isA4Mode(exportConfig.mode) || !contentAreaMetrics.height) {
      setPages([]);
      return;
    }

    const measureEl = measureRef.current;
    if (!measureEl) {
      return;
    }

    const children = Array.from(measureEl.children) as HTMLElement[];
    if (children.length === 0) {
      setPages(['']);
      return;
    }

    const nextPages: string[] = [];
    let startIndex = 0;

    while (startIndex < children.length) {
      const pageStartTop = children[startIndex].offsetTop;
      let endIndex = startIndex;

      while (endIndex < children.length) {
        const child = children[endIndex];
        const childBottom = child.offsetTop + child.offsetHeight;

        if (childBottom - pageStartTop > contentAreaMetrics.height) {
          if (endIndex === startIndex) {
            endIndex += 1;
          }
          break;
        }

        endIndex += 1;
      }

      const pageHtml = children
        .slice(startIndex, endIndex)
        .map((child) => child.outerHTML)
        .join('');
      nextPages.push(pageHtml);
      startIndex = endIndex;
    }

    setPages(nextPages);
  }, [contentAreaMetrics.height, exportConfig.mode, renderedHtml, elementStyleVars]);

  const renderMainContent = (pageHtml: string, pageIndex: number, pageCount: number) => (
    <>
      {decoration.borderFrame.enabled ? (
        <div style={{
          border: `${decoration.borderFrame.width}px solid ${decoration.borderFrame.color}`,
          borderRadius:
            decoration.borderFrame.style === 'ornate' ? '24px' :
            decoration.borderFrame.style === 'geometric' ? '0px' : '4px',
          marginTop: frameInsets.top,
          marginRight: frameInsets.right,
          marginBottom: frameInsets.bottom,
          marginLeft: frameInsets.left,
          paddingTop: decoration.borderFrame.padding + reservedSpace.top,
          paddingRight: decoration.borderFrame.padding + reservedSpace.right,
          paddingBottom: decoration.borderFrame.padding + reservedSpace.bottom,
          paddingLeft: decoration.borderFrame.padding + reservedSpace.left,
        }}>
          <div dangerouslySetInnerHTML={{ __html: pageHtml }} />
        </div>
      ) : (
        <div
          style={{
            paddingTop: reservedSpace.top,
            paddingRight: reservedSpace.right,
            paddingBottom: reservedSpace.bottom,
            paddingLeft: reservedSpace.left,
          }}
          dangerouslySetInnerHTML={{ __html: pageHtml }}
        />
      )}

      {decoration.pageNumber.enabled && pageCount > 1 && (
        <div
          style={{
            position: 'absolute',
            bottom: Math.max(18, elementStyles.canvasPadding * 0.35),
            right: decoration.pageNumber.position === 'bottom-right'
              ? elementStyles.canvasPadding
              : undefined,
            left: decoration.pageNumber.position === 'bottom-center' ? 0 : undefined,
            width: decoration.pageNumber.position === 'bottom-center' ? '100%' : undefined,
            textAlign: decoration.pageNumber.position === 'bottom-center' ? 'center' : 'right',
            color: decoration.pageNumber.color,
            fontSize: decoration.pageNumber.fontSize,
            zIndex: 4,
          }}
        >
          {getPageNumberLabel(
            decoration.pageNumber.format,
            pageIndex + 1,
            pageCount,
            decoration.pageNumber.customFormat,
          )}
        </div>
      )}
    </>
  );

  const renderPageShell = (pageHtml: string, pageIndex: number, pageCount: number) => (
    <div
      key={`page-${pageIndex}`}
      className={styles.content}
      style={{
        ...bgStyle,
        ...cardStyle,
        ...elementStyleVars,
        width: contentWidth,
        ...(contentHeight != null
          ? exportConfig.mode === 'xiaohongshu'
            ? { minHeight: contentHeight }
            : { minHeight: contentHeight, height: contentHeight }
          : {}),
        position: 'relative',
        padding: elementStyles.canvasPadding,
        overflow: 'hidden',
        flexShrink: 0,
      }}
      data-export-page={isA4Mode(exportConfig.mode) ? 'markie-page' : undefined}
    >
      {watermarkStyle && <div style={watermarkStyle} />}

      {decoration.logo.enabled && decoration.logo.imageUrl && (
        <div
          style={{
            ...getLogoPosition(decoration.logo.position, logoMargin),
            width: decoration.logo.size,
            height: decoration.logo.size,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
          }}
        >
          <img
            src={decoration.logo.imageUrl}
            alt="logo"
            style={{
              width: '100%',
              height: '100%',
              opacity: decoration.logo.opacity,
              objectFit: 'contain',
              filter: appTheme === 'dark'
                ? 'drop-shadow(0 0 2px rgba(255,255,255,0.9)) drop-shadow(0 0 18px rgba(255,255,255,0.24)) drop-shadow(0 10px 22px rgba(15,23,42,0.22))'
                : 'drop-shadow(0 1px 0 rgba(255,255,255,0.72)) drop-shadow(0 8px 20px rgba(15,23,42,0.18))',
            }}
          />
        </div>
      )}

      {renderMainContent(pageHtml, pageIndex, pageCount)}

      {decoration.qrCode.enabled && decoration.qrCode.url && (
        <div style={{
          display: 'flex',
          justifyContent:
            decoration.qrCode.position === 'bottom-left' ? 'flex-start' :
            decoration.qrCode.position === 'bottom-right' ? 'flex-end' : 'center',
          position: 'absolute',
          left: decoration.qrCode.position === 'bottom-left' ? decoration.qrCode.margin : 0,
          right: decoration.qrCode.position === 'bottom-right' ? decoration.qrCode.margin : 0,
          bottom: decoration.qrCode.margin,
          width: decoration.qrCode.position === 'bottom-center' ? '100%' : 'auto',
        }}>
          <div className={styles.qrCard} style={qrCardStyle}>
            <QRCodeSVG
              value={decoration.qrCode.url}
              size={decoration.qrCode.size}
              bgColor="#ffffff"
              fgColor={isDarkContentTheme ? '#111111' : theme.text.color}
              level="H"
              marginSize={2}
            />
          </div>
        </div>
      )}
    </div>
  );

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
            className={isA4Mode(exportConfig.mode) ? styles.document : undefined}
            data-export="markie-content"
          >
            {isA4Mode(exportConfig.mode)
              ? (pages.length > 0 ? pages : ['']).map((pageHtml, index, arr) => renderPageShell(pageHtml, index, arr.length))
              : renderPageShell(renderedHtml, 0, 1)}
          </div>
        </div>
      </div>
      {isA4Mode(exportConfig.mode) && (
        <div className={styles.measureLayer} aria-hidden="true">
          <div
            ref={measureRef}
            className={styles.content}
            style={{
              ...elementStyleVars,
              width: contentAreaMetrics.width,
              position: 'absolute',
              left: -99999,
              top: 0,
              visibility: 'hidden',
              pointerEvents: 'none',
            }}
            dangerouslySetInnerHTML={{ __html: renderedHtml }}
          />
        </div>
      )}
    </div>
  );
}
