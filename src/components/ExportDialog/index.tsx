import { useState, useCallback, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useStore } from '../../stores/useStore';
import { exportToPNG, exportToPDF, exportToHTML, downloadDataUrl, downloadHTML } from '../../utils/exportImage';
import { t } from '../../i18n';
import styles from './ExportDialog.module.css';
import type { ExportMode, ExportFormat } from '../../types';

export default function ExportDialog() {
  const { exportConfig, setExportConfig, setActivePanel, previewScale, language } = useStore();
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
  }, [exporting]);

  const L = (key: string) => t(key, language);

  const modes: { value: ExportMode; label: string; desc: string }[] = [
    { value: 'free', label: L('export.free'), desc: L('export.freeDesc') },
    { value: 'xiaohongshu', label: L('export.xiaohongshu'), desc: L('export.xiaohongshuDesc') },
    { value: 'moments', label: L('export.moments'), desc: L('export.momentsDesc') },
    { value: 'a4-portrait', label: L('export.a4Portrait'), desc: L('export.a4PortraitDesc') },
    { value: 'a4-landscape', label: L('export.a4Landscape'), desc: L('export.a4LandscapeDesc') },
  ];

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
        ? exportToPNG(el, exportConfig.scale, exportWidth).then(url => downloadDataUrl(url, 'markie-export.png'))
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
        <Section title={L('export.sizeMode')}>
          <div className={styles.modeGrid}>
            {modes.map((m) => (
              <button key={m.value} className={`${styles.modeCard} ${exportConfig.mode === m.value ? styles.active : ''}`} onClick={() => setExportConfig({ mode: m.value })}>
                <span className={styles.modeLabel}>{m.label}</span>
                <span className={styles.modeDesc}>{m.desc}</span>
              </button>
            ))}
          </div>
        </Section>

        {exportConfig.mode === 'free' && (
          <Section title={L('export.width')}>
            <label className={styles.rangeField}>
              <span>{exportConfig.width || 1080}px</span>
              <input type="range" min={400} max={2000} step={10} value={exportConfig.width || 1080} onChange={(e) => {
                setExportConfig({ width: Number(e.target.value) });
              }} />
            </label>
          </Section>
        )}

        <Section title={L('export.format')}>
          <div className={styles.formatRow}>
            {formats.map((f) => (
              <button key={f.value} className={`${styles.formatBtn} ${exportConfig.format === f.value ? styles.active : ''}`} onClick={() => setExportConfig({ format: f.value })}>
                {f.label}
              </button>
            ))}
          </div>
        </Section>

        {exportConfig.format !== 'html' && (
          <Section title={L('export.quality')}>
            <label className={styles.rangeField}>
              <span>{exportConfig.scale}x ({Math.round(exportConfig.scale * 100)}% 分辨率)</span>
              <input type="range" min={1} max={4} step={0.5} value={exportConfig.scale} onChange={(e) => setExportConfig({ scale: Number(e.target.value) })} />
            </label>
          </Section>
        )}

        <Section title={L('export.previewScale')}>
          <label className={styles.rangeField}>
            <span>{Math.round(previewScale * 100)}%</span>
            <input type="range" min={0.3} max={1} step={0.05} value={previewScale} onChange={(e) => useStore.getState().setPreviewScale(Number(e.target.value))} />
          </label>
        </Section>

        <div className={styles.exportActions}>
          <button className={styles.exportBtn} onClick={handleExport} disabled={exporting}>
            {exporting ? L('export.exporting') : L('export.exportBtn')}
          </button>
        </div>
      </div>

      {overlayMounted && createPortal(
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
