import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../stores/useStore';
import { useIsMobile } from '../../hooks/useIsMobile';
import { exportToPNG, exportToPNGPages, exportToPDF, exportToHTML, downloadDataUrl, downloadDataUrls, downloadHTML } from '../../utils/exportImage';
import { t } from '../../i18n';
import styles from './ExportDialog.module.css';
import type { ExportFormat, ExportMode } from '../../types';

function isA4Mode(mode: ExportMode) {
  return mode === 'a4-portrait' || mode === 'a4-landscape';
}

export default function ExportDialog() {
  const { exportConfig, setExportConfig, setActivePanel, language } = useStore();
  const isMobile = useIsMobile();
  const [exporting, setExporting] = useState(false);
  const [overlayMounted, setOverlayMounted] = useState(false);
  const [overlayVisible, setOverlayVisible] = useState(false);
  const [exportClone, setExportClone] = useState<HTMLElement | null>(null);
  const overlayContentRef = useRef<HTMLDivElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const scrollResolveRef = useRef<() => void>(() => {});
  const scrollDoneRef = useRef<Promise<void>>(Promise.resolve());

  // Insert clone into overlay
  useEffect(() => {
    if (overlayContentRef.current && exportClone) {
      overlayContentRef.current.innerHTML = '';
      overlayContentRef.current.appendChild(exportClone);
      console.log('[ExportDialog] Clone inserted, dimensions:', exportClone.offsetWidth, 'x', exportClone.offsetHeight);
    }
  }, [exportClone, overlayMounted]);

  // Overlay enter/exit + auto-scroll
  useEffect(() => {
    let rafId: number;

    if (isMobile) {
      setOverlayMounted(false);
      setOverlayVisible(false);
      scrollResolveRef.current();
      return () => undefined;
    }

    if (exporting) {
      setOverlayMounted(true);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          setOverlayVisible(true);
          // Start smooth auto-scroll after enter animation settles
          setTimeout(() => {
            const el = overlayRef.current;
            if (!el) { scrollResolveRef.current(); return; }
            const baseSpeed = 800;
            const accel = 5000;
            let speed = baseSpeed;
            let lastTime: number | null = null;
            const tick = (now: number) => {
              if (lastTime === null) { lastTime = now; }
              const dt = Math.min((now - lastTime) / 1000, 0.05);
              lastTime = now;
              speed += accel * dt;
              if (el.scrollTop < el.scrollHeight - el.clientHeight) {
                el.scrollTop += speed * dt;
                rafId = requestAnimationFrame(tick);
              } else {
                setTimeout(() => scrollResolveRef.current(), 400);
              }
            };
            rafId = requestAnimationFrame(tick);
          }, 600);
        });
      });
    } else {
      setOverlayVisible(false);
      const timer = setTimeout(() => {
        setOverlayMounted(false);
        setExportClone(null);
      }, 500);
      return () => clearTimeout(timer);
    }

    return () => {
      cancelAnimationFrame(rafId);
      // Safety: resolve if animation was cancelled before reaching bottom
      scrollResolveRef.current();
    };
  }, [exporting, isMobile]);

  const L = (key: string) => t(key, language);

  const formats: { value: ExportFormat; label: string }[] = [
    { value: 'png', label: 'PNG' },
    { value: 'pdf', label: 'PDF' },
    { value: 'html', label: 'HTML' },
  ];

  const getExportWidth = useCallback(() => {
    switch (exportConfig.mode) {
      case 'xiaohongshu': return 540;
      case 'moments': return 540;
      case 'a4-portrait': return 794;
      case 'a4-landscape': return 1123;
      default: return exportConfig.width || 1080;
    }
  }, [exportConfig.mode, exportConfig.width]);

  const handleExport = useCallback(async () => {
    const el = document.querySelector('[data-export="markie-content"]') as HTMLElement;
    if (!el) return;

    const clone = el.cloneNode(true) as HTMLElement;
    setExportClone(clone);

    // Create promise BEFORE setting exporting, so the effect can resolve it
    scrollDoneRef.current = new Promise<void>(resolve => {
      scrollResolveRef.current = resolve;
    });
    setExporting(true);

    try {
      const exportWidth = getExportWidth();
      const exportPromise = exportConfig.format === 'png'
        ? isA4Mode(exportConfig.mode)
          ? exportToPNGPages(el, exportConfig.scale, exportWidth).then((urls) =>
              downloadDataUrls(urls, (index) => `markie-export-page-${index + 1}.png`)
            )
          : exportToPNG(el, exportConfig.scale, exportWidth).then(url => downloadDataUrl(url, 'markie-export.png'))
        : exportConfig.format === 'pdf'
          ? exportToPDF(el, exportConfig.scale, exportWidth)
          : Promise.resolve(downloadHTML(exportToHTML(el), 'markie-export.html'));

      // Wait for BOTH the export AND the scroll animation to finish
      await Promise.all([exportPromise, scrollDoneRef.current]);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setExporting(false);
    }
  }, [exportConfig, getExportWidth]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>{L('export.title')}</h3>
        <button className={styles.closeBtn} onClick={() => setActivePanel('none')}>&times;</button>
      </div>
      <div className={styles.content}>
        <Section title={L('export.format')}>
          <div className={styles.formatRow}>
            {formats.map((f) => (
              <button key={f.value} className={`${styles.formatBtn} ${exportConfig.format === f.value ? styles.active : ''}`} onClick={() => setExportConfig({ format: f.value })}>
                {f.label}
              </button>
            ))}
          </div>
        </Section>

        <div className={styles.exportActions}>
          <button className={styles.exportBtn} onClick={handleExport} disabled={exporting}>
            {exporting ? L('export.exporting') : L('export.exportBtn')}
          </button>
        </div>
      </div>

      {!isMobile && overlayMounted && createPortal(
        <div ref={overlayRef} className={`${styles.overlay} ${overlayVisible ? styles.overlayActive : ''}`}>
          <div
            className={styles.overlayContentWrap}
            style={{
              transform: overlayVisible ? 'none' : 'scale(0.92)',
              opacity: overlayVisible ? 1 : 0,
            }}
          >
            <div ref={overlayContentRef} />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <div className={styles.sectionTitle}>{title}</div>
      {children}
    </div>
  );
}
