import { domToBlob } from 'modern-screenshot';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

const MAX_CANVAS_DIMENSION = 16384;
const MAX_CANVAS_AREA = 16384 * 16384;

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
  bgColor: string
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

  // Get computed background color from the original element
  const computedBg = window.getComputedStyle(element).backgroundColor;
  const bgColor = computedBg && computedBg !== 'transparent' && computedBg !== 'rgba(0, 0, 0, 0)'
    ? computedBg
    : '#ffffff';

  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    position: fixed;
    left: 0;
    top: 0;
    z-index: -1;
    pointer-events: none;
    width: ${fullWidth}px;
    height: ${fullHeight}px;
    background: ${bgColor};
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
  // Get background color from element or default to white
  const computedBg = window.getComputedStyle(element).backgroundColor;
  const bgColor = computedBg && computedBg !== 'transparent' && computedBg !== 'rgba(0, 0, 0, 0)'
    ? computedBg
    : '#ffffff';

  const blob = await domToBlob(element, {
    scale,
    width: fullWidth,
    height: fullHeight,
    backgroundColor: bgColor,
  });
  if (!blob) throw new Error('modern-screenshot returned null');
  return blob;
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

  const { clone, cleanup } = await cloneForRender(element, fullWidth, fullHeight);

  console.log('[export] clone dimensions after render:', clone.offsetWidth, 'x', clone.offsetHeight);
  console.log('[export] clone scrollHeight:', clone.scrollHeight);

  // Force layout recalculation so the clone has correct dimensions
  // eslint-disable-next-line @typescript-eslint/no-unused-expressions
  clone.offsetHeight;

  try {
    // Get background color
    const computedBg = window.getComputedStyle(clone).backgroundColor;
    const bgColor = computedBg && computedBg !== 'transparent' && computedBg !== 'rgba(0, 0, 0, 0)'
      ? computedBg
      : '#ffffff';

    // Primary: modern-screenshot (native CSS rendering — handles gradients & variables)
    try {
      const blob = await renderNative(clone, scale, fullWidth, fullHeight);
      const blobUrl = URL.createObjectURL(blob);
      console.log('[export] modern-screenshot blob size:', blob.size);
      return blobUrl;
    } catch (err) {
      console.warn('[export] modern-screenshot failed, falling back to html2canvas:', err);
    }

    // Fallback: html2canvas
    if (!wouldExceedCanvasLimits(fullWidth, fullHeight, scale)) {
      console.log('[export] Using html2canvas');
      try {
        const canvas = await html2canvas(clone, {
          scale,
          useCORS: true,
          allowTaint: true,
          backgroundColor: bgColor,
          logging: false,
          width: fullWidth,
          height: fullHeight,
          windowWidth: fullWidth,
          windowHeight: fullHeight,
        });

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob(
            (b) => b ? resolve(b) : reject(new Error('toBlob returned null')),
            'image/png'
          );
        });

        const blobUrl = URL.createObjectURL(blob);
        console.log('[export] blob size:', blob.size);
        return blobUrl;
      } catch (err) {
        console.warn('[export] html2canvas failed:', err);
      }
    }

    // Fallback 1: html2canvas with supersampling
    const superscale = scale * 2;
    if (!wouldExceedCanvasLimits(fullWidth, fullHeight, superscale)) {
      console.log('[export] Using html2canvas supersampled fallback');

      // Get background color
      const computedBg = window.getComputedStyle(clone).backgroundColor;
      const bgColor = computedBg && computedBg !== 'transparent' && computedBg !== 'rgba(0, 0, 0, 0)'
        ? computedBg
        : '#ffffff';

      const canvas = await html2canvas(clone, {
        scale: superscale,
        useCORS: true,
        allowTaint: true,
        backgroundColor: bgColor,
        logging: false,
        width: fullWidth,
        height: fullHeight,
        windowWidth: fullWidth,
        windowHeight: fullHeight,
      });

      const targetW = fullWidth * scale;
      const targetH = fullHeight * scale;
      const out = document.createElement('canvas');
      out.width = targetW;
      out.height = targetH;
      const ctx = out.getContext('2d')!;
      ctx.imageSmoothingEnabled = true;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(canvas, 0, 0, targetW, targetH);

      const blob = await new Promise<Blob>((resolve, reject) => {
        out.toBlob(
          (b) => b ? resolve(b) : reject(new Error('toBlob returned null')),
          'image/png'
        );
      });

      const blobUrl = URL.createObjectURL(blob);
      console.log('[export] blob size:', blob.size);
      return blobUrl;
    }

    // Fallback 2: chunked html2canvas for very large elements
    console.log('[export] Using chunked html2canvas');
    const maxChunkH = getMaxChunkHeight(fullWidth, scale);
    const numChunks = Math.ceil(fullHeight / maxChunkH);

    // Get background color for chunks
    const chunkBg = window.getComputedStyle(clone).backgroundColor;
    const chunkBgColor = chunkBg && chunkBg !== 'transparent' && chunkBg !== 'rgba(0, 0, 0, 0)'
      ? chunkBg
      : '#ffffff';

    const chunks: HTMLCanvasElement[] = [];
    for (let i = 0; i < numChunks; i++) {
      const y = i * maxChunkH;
      const chunkH = Math.min(maxChunkH, fullHeight - y);
      const chunkCanvas = await renderChunk(clone, scale, y, chunkH, fullWidth, fullHeight, chunkBgColor);
      chunks.push(chunkCanvas);
    }

    const totalScaledWidth = fullWidth * scale;
    const totalScaledHeight = fullHeight * scale;

    let finalBlob: Blob;
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
      finalBlob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob(
          (b) => b ? resolve(b) : reject(new Error('toBlob returned null')),
          'image/png'
        );
      });
    } else {
      finalBlob = await stitchCanvasChunks(chunks, totalScaledWidth, totalScaledHeight);
    }

    const blobUrl = URL.createObjectURL(finalBlob);
    console.log('[export] blob size:', finalBlob.size);
    return blobUrl;
  } finally {
    cleanup();
  }
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
      const pdfBg = window.getComputedStyle(clone).backgroundColor;
      const pdfBgColor = pdfBg && pdfBg !== 'transparent' && pdfBg !== 'rgba(0, 0, 0, 0)'
        ? pdfBg
        : '#ffffff';

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

  const styleEls = document.querySelectorAll('style');
  let styleText = '';
  styleEls.forEach((s) => {
    if (s.textContent) styleText += s.textContent + '\n';
  });

  const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Markie Export</title>
  <style>${styleText}</style>
</head>
<body style="margin:0;padding:0;display:flex;justify-content:center;background:#f0f0f0;">
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
