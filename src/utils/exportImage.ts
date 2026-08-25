import { domToBlob } from 'modern-screenshot';
import html2canvas from 'html2canvas';

/**
 * Safe browser canvas limit (dimension and area, in output pixels). A single
 * exported image can never exceed this: modern-screenshot silently returns a
 * 0-byte blob beyond it, and html2canvas/clone clips. Preview and export both
 * use it as the cap for a single page/image.
 */
export const MAX_EXPORT_PIXEL = 16384;

const MAX_CANVAS_DIMENSION = MAX_EXPORT_PIXEL;
const MAX_CANVAS_AREA = MAX_EXPORT_PIXEL * MAX_EXPORT_PIXEL;

function getComputedBackgroundColor(element: HTMLElement, fallback: string | null = '#ffffff') {
  const computedBg = window.getComputedStyle(element).backgroundColor;
  return computedBg && computedBg !== 'transparent' && computedBg !== 'rgba(0, 0, 0, 0)'
    ? computedBg
    : fallback;
}

function wouldExceedCanvasLimits(width: number, height: number, scale: number): boolean {
  const scaledW = width * scale;
  const scaledH = height * scale;
  return (
    scaledW > MAX_CANVAS_DIMENSION ||
    scaledH > MAX_CANVAS_DIMENSION ||
    scaledW * scaledH > MAX_CANVAS_AREA
  );
}

function getMaxChunkHeight(width: number, scale: number): number {
  const scaledW = width * scale;
  let maxH = Math.floor(MAX_CANVAS_DIMENSION / scale);
  const areaLimitH = Math.floor(MAX_CANVAS_AREA / (scaledW * scale));
  maxH = Math.min(maxH, areaLimitH);
  return Math.min(maxH, 4000);
}

async function renderChunk(
  element: HTMLElement,
  scale: number,
  y: number,
  chunkHeight: number,
  fullWidth: number,
  fullHeight: number,
  bgColor: string | null
): Promise<HTMLCanvasElement> {
  return html2canvas(element, {
    scale,
    useCORS: true,
    allowTaint: true,
    backgroundColor: bgColor,
    logging: false,
    x: 0,
    y,
    width: fullWidth,
    height: chunkHeight,
    windowWidth: fullWidth,
    windowHeight: fullHeight,
  });
}

/**
 * Clone element into a clean off-screen context appended to <body>.
 * The clone is made visible briefly to ensure all content is rendered.
 */
async function cloneForRender(element: HTMLElement, fullWidth: number, fullHeight: number): Promise<{ clone: HTMLElement; cleanup: () => void }> {
  const clone = element.cloneNode(true) as HTMLElement;

  const bgColor = getComputedBackgroundColor(element, null);

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    z-index: -1;
    pointer-events: none;
    width: ${fullWidth}px;
    height: ${fullHeight}px;
    background: ${bgColor ?? 'transparent'};
    overflow: hidden;
  `;

  clone.style.width = `${fullWidth}px`;
  clone.style.height = `${fullHeight}px`;
  clone.style.minWidth = `${fullWidth}px`;
  clone.style.minHeight = `${fullHeight}px`;
  clone.style.transform = 'none';
  clone.style.position = 'relative';
  clone.style.top = '0';
  clone.style.left = '0';
  clone.style.overflow = 'visible';

  wrapper.appendChild(clone);
  document.body.appendChild(wrapper);

  // Force render by making visible briefly and scrolling through
  // This ensures off-screen content is properly rendered
  const viewportHeight = window.innerHeight;
  const scrollSteps = Math.ceil(fullHeight / viewportHeight);

  for (let i = 0; i < scrollSteps; i++) {
    const scrollY = i * viewportHeight;
    wrapper.style.transform = `translateY(-${scrollY}px)`;
    // Force layout recalculation
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    wrapper.offsetHeight;
    await new Promise(r => setTimeout(r, 10));
  }

  // Reset position
  wrapper.style.transform = 'none';
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  wrapper.offsetHeight;

  return {
    clone,
    cleanup: () => {
      document.body.removeChild(wrapper);
    },
  };
}

/**
 * Render using modern-screenshot (SVG foreignObject).
 * Captures the browser's native rendering — text is rendered by the
 * HTML engine with full hinting & antialiasing, not re-drawn by Canvas fillText.
 */
async function renderNative(element: HTMLElement, scale: number, fullWidth: number, fullHeight: number): Promise<Blob> {
  const bgColor = getComputedBackgroundColor(element, null);

  const blob = await domToBlob(element, {
    scale,
    width: fullWidth,
    height: fullHeight,
    ...(bgColor ? { backgroundColor: bgColor } : {}),
  });
  // modern-screenshot silently produces a 0-byte blob when the canvas exceeds
  // the browser's dimension/area limits (e.g. a 540 × ~100k px long image) —
  // treat that as a failure so the chunked fallback below can handle it.
  if (!blob || blob.size === 0) {
    throw new Error('modern-screenshot produced an empty image (canvas limits exceeded)');
  }
  return blob;
}

// TEMP DEBUG: stash last rendered export blob as data URL for diagnosis
async function debugStashBlob(blob: Blob) {
  try {
    const dataUrl = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
    (window as unknown as Record<string, unknown>).__markieLastExport = dataUrl;
  } catch {
    /* ignore */
  }
}

async function renderElementToBlob(
  element: HTMLElement,
  scale: number,
  width: number,
  height: number
): Promise<Blob> {
  const { clone, cleanup } = await cloneForRender(element, width, height);

  try {
    const bgColor = getComputedBackgroundColor(clone, null);

    try {
      return await renderNative(clone, scale, width, height);
    } catch (err) {
      console.warn('[export] modern-screenshot failed, falling back to html2canvas:', err);
    }

    if (!wouldExceedCanvasLimits(width, height, scale)) {
      try {
        const canvas = await html2canvas(clone, {
          scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: bgColor,
          logging: false,
          width,
          height,
          windowWidth: width,
          windowHeight: height,
        });

        return await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => (b && b.size > 0 ? resolve(b) : reject(new Error('toBlob returned an empty image'))),
            'image/png'
          );
        });
      } catch (err) {
        console.warn('[export] html2canvas failed:', err);
      }
    }

    const superscale = scale * 2;
    if (!wouldExceedCanvasLimits(width, height, superscale)) {
      const canvas = await html2canvas(clone, {
        scale: superscale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: bgColor,
        logging: false,
        width,
        height,
        windowWidth: width,
        windowHeight: height,
      });

      const targetW = width * scale;
      const targetH = height * scale;
      const out = document.createElement('canvas');
      out.width = targetW;
      out.height = targetH;
      const ctx = out.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, targetW, targetH);

      return await new Promise<Blob>((resolve, reject) => {
        out.toBlob(
          (b) => (b && b.size > 0 ? resolve(b) : reject(new Error('toBlob returned an empty image'))),
          'image/png'
        );
      });
    }

    const maxChunkH = getMaxChunkHeight(width, scale);
    const numChunks = Math.ceil(height / maxChunkH);
    const chunks: HTMLCanvasElement[] = [];

    const totalScaledWidth = width * scale;
    const totalScaledHeight = height * scale;

    // When the full-size canvas would exceed browser limits (16384px per
    // dimension / 16384² px area), render at a reduced scale so the output is
    // still a complete image instead of a 0-byte download.
    const exceedsLimits = totalScaledWidth > MAX_CANVAS_DIMENSION
      || totalScaledHeight > MAX_CANVAS_DIMENSION
      || totalScaledWidth * totalScaledHeight > MAX_CANVAS_AREA;

    let finalW = totalScaledWidth;
    let finalH = totalScaledHeight;
    let renderScale = scale;

    if (exceedsLimits) {
      const fitScale = Math.min(
        MAX_CANVAS_DIMENSION / totalScaledWidth,
        MAX_CANVAS_DIMENSION / totalScaledHeight,
        Math.sqrt(MAX_CANVAS_AREA / (totalScaledWidth * totalScaledHeight)),
        1
      );
      finalW = Math.max(1, Math.floor(totalScaledWidth * fitScale));
      finalH = Math.max(1, Math.floor(totalScaledHeight * fitScale));
      renderScale = scale * fitScale;
      console.warn(
        `[export] content exceeds canvas limits (${totalScaledWidth}x${totalScaledHeight}), output scaled to ${finalW}x${finalH} — consider shorter content or a smaller export width`
      );
    }

    const chunkH = Math.min(maxChunkH, getMaxChunkHeight(width, renderScale));

    for (let i = 0; i < numChunks; i++) {
      const y = i * chunkH;
      const h = Math.min(chunkH, height - y);
      const chunkCanvas = await renderChunk(clone, renderScale, y, h, width, height, bgColor);
      chunks.push(chunkCanvas);
    }

    const canvas = document.createElement('canvas');
    canvas.width = finalW;
    canvas.height = finalH;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get canvas 2d context');
    }
    let currentY = 0;
    for (const chunk of chunks) {
      ctx.drawImage(chunk, 0, currentY);
      currentY += chunk.height;
    }

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (b) => (b && b.size > 0 ? resolve(b) : reject(new Error('toBlob returned an empty image'))),
        'image/png'
      );
    });
    return blob;
  } finally {
    cleanup();
  }
}

function getPageNodes(element: HTMLElement): HTMLElement[] {
  return Array.from(element.querySelectorAll<HTMLElement>('[data-export-page="markie-page"]'));
}

export type ExportProgress = (done: number, total: number) => void;

/**
 * The visible (layout) height of an element.
 *
 * Absolute decorations — watermark (inset -90%), logo, QR code — and content
 * that overflows a fixed-height page can inflate `scrollHeight` far beyond the
 * element's laid-out box. The preview clips the element at its box
 * (`overflow: hidden`), so the exported image must be captured at the layout
 * height as well; otherwise exports (e.g. A4 pages with a watermark) come out
 * much taller than what the preview shows.
 */
function getExportHeight(element: HTMLElement): number {
  return Math.min(element.scrollHeight, element.offsetHeight || element.scrollHeight);
}

/**
 * Export an element to PNG.
 */
export async function exportToPNG(
  element: HTMLElement,
  scale = 2,
  width?: number,
  onProgress?: ExportProgress
): Promise<string> {
  await document.fonts.ready;

  onProgress?.(1, 1);

  const fullWidth = width || element.scrollWidth;
  const fullHeight = getExportHeight(element);

  const blob = await renderElementToBlob(element, scale, fullWidth, fullHeight);
  await debugStashBlob(blob); // TEMP DEBUG
  return URL.createObjectURL(blob);
}

export async function exportToPNGPages(
  element: HTMLElement,
  scale = 2,
  width?: number,
  onProgress?: ExportProgress
): Promise<string[]> {
  await document.fonts.ready;

  const pageNodes = getPageNodes(element);
  if (pageNodes.length === 0) {
    return [await exportToPNG(element, scale, width, onProgress)];
  }

  const urls: string[] = [];
  for (let i = 0; i < pageNodes.length; i++) {
    const pageEl = pageNodes[i];
    const pageWidth = width || pageEl.scrollWidth;
    const pageHeight = getExportHeight(pageEl);
    const blob = await renderElementToBlob(pageEl, scale, pageWidth, pageHeight);
    urls.push(URL.createObjectURL(blob));
    onProgress?.(i + 1, pageNodes.length);
  }

  return urls;
}

/**
 * Open a hidden same-origin iframe prepared for printing, wait until fonts,
 * stylesheets and images are rendered, then trigger the browser's print
 * dialog. The user saves it as PDF — producing a real, selectable-text PDF
 * with vector fonts instead of a flattened PNG screenshot.
 */
async function printElementToPDF(html: string): Promise<void> {
  const frame = document.createElement('iframe');
  frame.style.cssText = 'position: fixed; left: -10000px; top: 0; width: 1200px; height: 900px; border: 0; opacity: 0; pointer-events: none;';
  document.body.appendChild(frame);
  frame.srcdoc = html;

  const doc = frame.contentDocument;
  const win = frame.contentWindow;
  if (!doc || !win) {
    frame.remove();
    throw new Error('Failed to create print window');
  }

  const withTimeout = <T,>(p: Promise<T>, ms: number) => Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('timeout')), ms))]);

  try {
    // Let stylesheets, fonts and images finish loading before printing.
    await withTimeout(new Promise<void>((resolve) => {
      if (doc.readyState === 'complete') {
        resolve();
      } else {
        doc.addEventListener('load', () => resolve(), { once: true });
      }
    }), 8000);
    try {
      await withTimeout(doc.fonts.ready, 8000);
    } catch { /* fonts may never settle */ }
    await withTimeout(Promise.all(Array.from(doc.images).map((img) => {
      if (img.complete) return Promise.resolve();
      return new Promise<void>((resolve) => {
        img.onload = () => resolve();
        img.onerror = () => resolve();
      });
    })), 8000);

    // Keep the frame alive while the print dialog is up; clean up after.
    const cleanup = () => frame.remove();
    win.addEventListener('afterprint', () => cleanup(), { once: true });
    setTimeout(cleanup, 120000);

    win.focus();
    win.print();
  } catch (err) {
    frame.remove();
    throw err;
  }
}

/**
 * Export an element to PDF via the browser's print dialog (real text PDF):
 * the fully styled export HTML is loaded into a hidden iframe and printed.
 * In Chrome/Edge the user picks "Save as PDF" in the print preview; the
 * suggested file name comes from the exported document title.
 */
export async function exportToPDF(
  element: HTMLElement,
  filename = 'markie-export.pdf',
  onProgress?: ExportProgress
): Promise<void> {
  onProgress?.(1, 1);
  const title = filename.replace(/\.pdf$/i, '') || 'Markie Export';
  const html = exportToHTML(element, title);
  await printElementToPDF(html);
  onProgress?.(1, 1);
}

export function exportToHTML(element: HTMLElement, title = 'Markie Export'): string {
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.transform = 'none';
  clone.style.width = 'auto';
  clone.style.maxWidth = 'none';
  clone.style.margin = '0 auto';

  const pageNodes = Array.from(clone.querySelectorAll<HTMLElement>('[data-export-page="markie-page"]'));
  if (pageNodes.length > 0) {
    clone.style.display = 'flex';
    clone.style.flexDirection = 'column';
    clone.style.alignItems = 'center';
    clone.style.gap = '28px';
    clone.style.padding = '32px 0';
  }

  // Collect styles: production builds load CSS via <link>, dev injections use
  // <style> nodes, and cross-origin sheets (e.g. KaTeX CDN) cannot be read but
  // can be re-linked.
  const styleTexts: string[] = [];
  const linkTags: string[] = [];
  document.querySelectorAll('style').forEach((s) => {
    if (s.textContent) styleTexts.push(s.textContent);
  });
  for (const sheet of Array.from(document.styleSheets)) {
    const owner = sheet.ownerNode as HTMLElement | null;
    if (owner && owner.tagName === 'STYLE') continue; // already collected above
    try {
      for (const rule of Array.from(sheet.cssRules)) styleTexts.push(rule.cssText);
    } catch {
      // Cross-origin stylesheet — re-declare it as a <link> instead.
      if (owner instanceof HTMLLinkElement && owner.rel === 'stylesheet' && owner.href) {
        linkTags.push(`<link rel="stylesheet" href="${owner.href}">`);
      }
    }
  }
  const styleText = styleTexts.join('\n');
  const extraLinks = linkTags.join('\n');

  const exportLayoutOverrides = `
html, body {
  width: 100% !important;
  height: auto !important;
  min-height: 100% !important;
  overflow: visible !important;
}

body {
  margin: 0 !important;
  padding: 24px !important;
  background: #f0f0f0 !important;
  box-sizing: border-box !important;
  display: flex !important;
  justify-content: center !important;
}

#root {
  width: auto !important;
  height: auto !important;
  overflow: visible !important;
}

/* Keep colors, gradients and the watermark when printing to PDF */
@media print {
  html, body {
    padding: 0 !important;
    background: #ffffff !important;
    overflow: visible !important;
  }
  * {
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }
}
`;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title.replace(/</g, '&lt;')}</title>
  ${extraLinks}
  <style>${styleText}\n${exportLayoutOverrides}</style>
</head>
<body>
  ${clone.outerHTML}
</body>
</html>`;

  return html;
}

export function downloadDataUrl(dataUrl: string, filename: string) {
  const link = document.createElement('a');
  link.download = filename;
  link.href = dataUrl;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  if (dataUrl.startsWith('blob:')) {
    setTimeout(() => URL.revokeObjectURL(dataUrl), 1000);
  }
}

export function downloadDataUrls(dataUrls: string[], getFilename: (index: number) => string) {
  dataUrls.forEach((dataUrl, index) => {
    window.setTimeout(() => {
      downloadDataUrl(dataUrl, getFilename(index));
    }, index * 200);
  });
}

export function downloadHTML(html: string, filename: string) {
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = filename;
  link.href = url;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
