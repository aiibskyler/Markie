import { domToBlob } from 'modern-screenshot';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MAX_CANVAS_DIMENSION = 16384;
const MAX_CANVAS_AREA = 16384 * 16384;

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

function stitchCanvasChunks(
  chunks: HTMLCanvasElement[],
  totalWidth: number,
  totalHeight: number
): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const canvas = document.createElement('canvas');
    canvas.width = totalWidth;
    canvas.height = totalHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      reject(new Error('Failed to get canvas 2d context'));
      return;
    }
    let currentY = 0;
    for (const chunk of chunks) {
      ctx.drawImage(chunk, 0, currentY);
      currentY += chunk.height;
    }
    canvas.toBlob(
      (b) => b ? resolve(b) : reject(new Error('toBlob returned null')),
      'image/png'
    );
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
  if (!blob) throw new Error('modern-screenshot returned null');
  return blob;
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
            (b) => b ? resolve(b) : reject(new Error('toBlob returned null')),
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
          (b) => b ? resolve(b) : reject(new Error('toBlob returned null')),
          'image/png'
        );
      });
    }

    const maxChunkH = getMaxChunkHeight(width, scale);
    const numChunks = Math.ceil(height / maxChunkH);
    const chunks: HTMLCanvasElement[] = [];

    for (let i = 0; i < numChunks; i++) {
      const y = i * maxChunkH;
      const chunkH = Math.min(maxChunkH, height - y);
      const chunkCanvas = await renderChunk(clone, scale, y, chunkH, width, height, bgColor);
      chunks.push(chunkCanvas);
    }

    const totalScaledWidth = width * scale;
    const totalScaledHeight = height * scale;

    if (totalScaledWidth > MAX_CANVAS_DIMENSION || totalScaledHeight > MAX_CANVAS_DIMENSION) {
      const fitScale = Math.min(
        MAX_CANVAS_DIMENSION / totalScaledWidth,
        MAX_CANVAS_DIMENSION / totalScaledHeight,
        1
      );
      const finalW = Math.floor(totalScaledWidth * fitScale);
      const finalH = Math.floor(totalScaledHeight * fitScale);
      const canvas = document.createElement('canvas');
      canvas.width = finalW;
      canvas.height = finalH;
      const ctx = canvas.getContext('2d')!;
      let currentY = 0;

      for (const chunk of chunks) {
        const drawH = chunk.height * fitScale;
        ctx.drawImage(chunk, 0, currentY, finalW, drawH);
        currentY += drawH;
      }

      return await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('toBlob returned null')),
          'image/png'
        );
      });
    }

    return stitchCanvasChunks(chunks, totalScaledWidth, totalScaledHeight);
  } finally {
    cleanup();
  }
}

function getPageNodes(element: HTMLElement): HTMLElement[] {
  return Array.from(element.querySelectorAll<HTMLElement>('[data-export-page="markie-page"]'));
}

/**
 * Export an element to PNG.
 */
export async function exportToPNG(
  element: HTMLElement,
  scale = 2,
  width?: number
): Promise<string> {
  await document.fonts.ready;

  const fullWidth = width || element.scrollWidth;
  const fullHeight = element.scrollHeight;

  console.log('[export] fullWidth:', fullWidth, 'fullHeight:', fullHeight, 'scale:', scale);
  console.log('[export] element scrollWidth:', element.scrollWidth, 'scrollHeight:', element.scrollHeight);
  console.log('[export] element offsetWidth:', element.offsetWidth, 'offsetHeight:', element.offsetHeight);
  console.log('[export] element getBoundingClientRect:', element.getBoundingClientRect());

  const blob = await renderElementToBlob(element, scale, fullWidth, fullHeight);
  const blobUrl = URL.createObjectURL(blob);
  console.log('[export] blob size:', blob.size);
  return blobUrl;
}

export async function exportToPNGPages(
  element: HTMLElement,
  scale = 2,
  width?: number
): Promise<string[]> {
  await document.fonts.ready;

  const pageNodes = getPageNodes(element);
  if (pageNodes.length === 0) {
    return [await exportToPNG(element, scale, width)];
  }

  const urls: string[] = [];
  for (const pageEl of pageNodes) {
    const pageWidth = width || pageEl.scrollWidth;
    const pageHeight = pageEl.scrollHeight;
    const blob = await renderElementToBlob(pageEl, scale, pageWidth, pageHeight);
    urls.push(URL.createObjectURL(blob));
  }

  return urls;
}

/**
 * Export an element to PDF.
 */
export async function exportToPDF(
  element: HTMLElement,
  scale = 2,
  width?: number
): Promise<void> {
  await document.fonts.ready;

  const pageNodes = getPageNodes(element);

  if (pageNodes.length > 0) {
    const renderedPages: Array<{ dataUrl: string; width: number; height: number }> = [];

    for (const pageEl of pageNodes) {
      const pageWidth = width || pageEl.scrollWidth;
      const pageHeight = pageEl.scrollHeight;
      const { clone, cleanup } = await cloneForRender(pageEl, pageWidth, pageHeight);

      try {
        try {
          const blob = await renderNative(clone, scale, pageWidth, pageHeight);
          renderedPages.push({
            dataUrl: await blobToDataUrl(blob),
            width: pageWidth,
            height: pageHeight,
          });
        } catch {
          const pdfBgColor = getComputedBackgroundColor(clone, '#ffffff');

          const canvas = await html2canvas(clone, {
            scale,
            useCORS: true,
            allowTaint: true,
            backgroundColor: pdfBgColor,
            logging: false,
            width: pageWidth,
            height: pageHeight,
            windowWidth: pageWidth,
            windowHeight: pageHeight,
          });

          renderedPages.push({
            dataUrl: canvas.toDataURL('image/png'),
            width: canvas.width / scale,
            height: canvas.height / scale,
          });
        }
      } finally {
        cleanup();
      }
    }

    const firstPage = renderedPages[0];
    const pdf = new jsPDF({
      orientation: firstPage.width > firstPage.height ? 'landscape' : 'portrait',
      unit: 'px',
      format: [firstPage.width, firstPage.height],
    });

    renderedPages.forEach((page, index) => {
      if (index > 0) {
        pdf.addPage([page.width, page.height], page.width > page.height ? 'landscape' : 'portrait');
      }
      pdf.addImage(page.dataUrl, 'PNG', 0, 0, page.width, page.height);
    });

    pdf.save('markie-export.pdf');
    return;
  }

  const fullWidth = width || element.scrollWidth;
  const fullHeight = element.scrollHeight;

  const { clone, cleanup } = await cloneForRender(element, fullWidth, fullHeight);

  try {
    let imgDataUrl: string;
    let imgWidth: number;
    let imgHeight: number;

    // Try modern-screenshot first
    try {
      const blob = await renderNative(clone, scale, fullWidth, fullHeight);
      imgDataUrl = await blobToDataUrl(blob);
      imgWidth = fullWidth * scale;
      imgHeight = fullHeight * scale;
    } catch {
      // Fallback to html2canvas
      const pdfBgColor = getComputedBackgroundColor(clone, '#ffffff');

      const canvas = await html2canvas(clone, {
        scale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: pdfBgColor,
        logging: false,
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
      });
      imgDataUrl = canvas.toDataURL('image/png');
      imgWidth = canvas.width;
      imgHeight = canvas.height;
    }

    const isLandscape = imgWidth > imgHeight;
    const pdf = new jsPDF({
      orientation: isLandscape ? 'landscape' : 'portrait',
      unit: 'px',
      format: [imgWidth / scale, imgHeight / scale],
    });

    pdf.addImage(imgDataUrl, 'PNG', 0, 0, imgWidth / scale, imgHeight / scale);
    pdf.save('markie-export.pdf');
  } finally {
    cleanup();
  }
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

export function exportToHTML(element: HTMLElement): string {
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

  const styleEls = document.querySelectorAll('style');
  let styleText = '';
  styleEls.forEach((s) => {
    if (s.textContent) styleText += s.textContent + '\n';
  });

  const exportLayoutOverrides = `
html, body {
  width: 100% !important;
  height: auto !important;
  min-height: 100% !important;
  overflow: auto !important;
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
`;

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markie Export</title>
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
