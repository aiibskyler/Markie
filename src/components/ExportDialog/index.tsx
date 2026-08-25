import { useState, useCallback } from 'react';
import { useStore } from '../../stores/useStore';
import { exportToPNG, exportToPNGPages, exportToPDF, exportToHTML, downloadDataUrl, downloadDataUrls, downloadHTML } from '../../utils/exportImage';
import { getExportName } from '../../utils/exportFilename';
import { t } from '../../i18n';
import styles from './ExportDialog.module.css';
import type { ExportFormat } from '../../types';

export default function ExportDialog() {
  const { exportConfig, setExportConfig, setActivePanel, language, markdown } = useStore();
  const [exporting, setExporting] = useState(false);
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);

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

    setExporting(true);
    setProgress({ done: 0, total: 0 });

    try {
      const exportWidth = getExportWidth();
      // File name derived from the article title (first heading) or the
      // leading words of the content.
      const exportBaseName = getExportName(markdown);
      // A4 modes and automatically paginated long content both render page
      // shells with data-export-page; detect them from the DOM so a single
      // image is exported when the content fits.
      const hasPageNodes = el.querySelectorAll('[data-export-page="markie-page"]').length > 0;
      const onProgress = (done: number, total: number) => setProgress({ done, total });

      const exportPromise = exportConfig.format === 'png'
        ? hasPageNodes
          ? exportToPNGPages(el, exportConfig.scale, exportWidth, onProgress).then((urls) =>
              downloadDataUrls(urls, (index) => `${exportBaseName}-page-${index + 1}.png`)
            )
          : exportToPNG(el, exportConfig.scale, exportWidth, onProgress).then(url => downloadDataUrl(url, `${exportBaseName}.png`))
        : exportConfig.format === 'pdf'
          ? exportToPDF(el, `${exportBaseName}.pdf`, onProgress)
          : Promise.resolve(downloadHTML(exportToHTML(el), `${exportBaseName}.html`));

      await exportPromise;
    } catch (err) {
      console.error('Export failed:', err);
      const message = err instanceof Error ? err.message : String(err);
      window.alert(`${t('export.failed', language)}\n${message}`);
    } finally {
      setExporting(false);
      setProgress(null);
    }
  }, [exportConfig, getExportWidth, language, markdown]);

  const showProgress = exporting && progress !== null;
  const isMulti = showProgress && progress!.total > 1;

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

          {showProgress && (
            <div className={styles.progressWrap} role="status" aria-live="polite">
              <div className={styles.progressTrack}>
                <div
                  className={`${styles.progressBar} ${isMulti ? '' : styles.progressBarIndeterminate}`}
                  style={isMulti ? { width: `${Math.round((progress!.done / progress!.total) * 100)}%` } : undefined}
                />
              </div>
              <span className={styles.progressText}>
                {isMulti
                  ? L('export.progress').replace('{done}', String(progress!.done)).replace('{total}', String(progress!.total))
                  : L('export.rendering')}
              </span>
            </div>
          )}
        </div>
      </div>
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
