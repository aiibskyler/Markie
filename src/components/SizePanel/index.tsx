import { useCallback, useEffect } from 'react';
import { useStore } from '../../stores/useStore';
import { t } from '../../i18n';
import styles from '../ExportDialog/ExportDialog.module.css';
import themeStyles from '../ThemePanel/ThemePanel.module.css';
import { themes } from '../../themes/presets';
import type { ElementStyles, ExportMode } from '../../types';

export default function SizePanel() {
  const { exportConfig, setExportConfig, currentThemeId, setCurrentThemeId, setGlobalFont, setActivePanel, previewScale, language } = useStore();

  const L = (key: string) => t(key, language);
  const getThemeLabel = (themeId: string) => L(`theme.${themeId}`);

  const modes: { value: ExportMode; label: string; desc: string }[] = [
    { value: 'free', label: L('export.free'), desc: L('export.freeDesc') },
    { value: 'xiaohongshu', label: L('export.xiaohongshu'), desc: L('export.xiaohongshuDesc') },
    { value: 'moments', label: L('export.moments'), desc: L('export.momentsDesc') },
    { value: 'a4-portrait', label: L('export.a4Portrait'), desc: L('export.a4PortraitDesc') },
    { value: 'a4-landscape', label: L('export.a4Landscape'), desc: L('export.a4LandscapeDesc') },
  ];

  const setPreviewScale = useCallback((scale: number) => {
    useStore.getState().setPreviewScale(scale);
  }, []);

  useEffect(() => {
    const getDefaultQrSize = () => {
      switch (exportConfig.mode) {
        case 'xiaohongshu':
          return 160;
        case 'moments':
          return 160;
        case 'a4-portrait':
          return 160;
        case 'a4-landscape':
          return 160;
        default:
          return 160;
      }
    };

    const { decoration } = useStore.getState();
    const recommendedSize = getDefaultQrSize();

    if (decoration.qrCode.size !== recommendedSize) {
      useStore.getState().updateDecoration({
        qrCode: {
          ...decoration.qrCode,
          size: recommendedSize,
        },
      });
    }
  }, [exportConfig.mode]);

  useEffect(() => {
    if (exportConfig.mode !== 'xiaohongshu' && exportConfig.mode !== 'moments') {
      return;
    }

    const baseStyles = useStore.getState().elementStyles;
    const presetLayout: Partial<ElementStyles> = exportConfig.mode === 'moments'
      ? {
          canvasPadding: 52,
          paragraphIndent: 0,
          paragraphSpacing: 24,
          heading: {
            ...baseStyles.heading,
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 24,
          },
          body: {
            ...baseStyles.body,
            fontSize: 23,
            lineHeight: 2.05,
            letterSpacing: 0.2,
          },
        }
      : {
          canvasPadding: 40,
          paragraphIndent: 0,
          paragraphSpacing: 20,
          heading: {
            ...baseStyles.heading,
            fontSize: 30,
            fontWeight: 900,
            marginBottom: 20,
          },
          body: {
            ...baseStyles.body,
            fontSize: 24,
            lineHeight: 1.9,
            letterSpacing: 0.5,
          },
        };

    useStore.getState().updateElementStyles(presetLayout);
  }, [exportConfig.mode]);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>{L('export.sizeTitle')}</h3>
        <button className={styles.closeBtn} onClick={() => setActivePanel('none')}>&times;</button>
      </div>
      <div className={styles.content}>
        <div className={styles.section}>
          <div className={styles.sectionTitle}>{L('export.sizeMode')}</div>
          <div className={styles.modeGrid}>
            {modes.map((m) => (
              <button key={m.value} className={`${styles.modeCard} ${exportConfig.mode === m.value ? styles.active : ''}`} onClick={() => setExportConfig({ mode: m.value })}>
                <span className={styles.modeLabel}>{m.label}</span>
                <span className={styles.modeDesc}>{m.desc}</span>
              </button>
            ))}
          </div>
          {exportConfig.mode === 'free' && (
            <label className={styles.rangeField}>
              <span>{L('export.width')} · {exportConfig.width || 1080}px</span>
              <input type="range" min={400} max={2000} step={10} value={exportConfig.width || 1080} onChange={(e) => setExportConfig({ width: Number(e.target.value) })} />
            </label>
          )}
          <label className={styles.rangeField}>
            <span>{L('export.quality')} · {exportConfig.scale}x ({Math.round(exportConfig.scale * 100)}%)</span>
            <input type="range" min={1} max={4} step={0.5} value={exportConfig.scale} onChange={(e) => setExportConfig({ scale: Number(e.target.value) })} />
          </label>
          <label className={styles.rangeField}>
            <span>{L('export.previewScale')} · {Math.round(previewScale * 100)}%</span>
            <input type="range" min={0.3} max={1} step={0.05} value={previewScale} onChange={(e) => setPreviewScale(Number(e.target.value))} />
          </label>
        </div>

        <div className={styles.section}>
          <div className={styles.sectionTitle}>{L('theme.title')}</div>
          <div className={themeStyles.grid}>
            {themes.map((theme) => (
              <button
                key={theme.id}
                className={`${themeStyles.themeCard} ${currentThemeId === theme.id ? themeStyles.active : ''}`}
                onClick={() => {
                  setCurrentThemeId(theme.id);
                  if (theme.recommendFont) {
                    setGlobalFont(theme.recommendFont);
                  }
                }}
              >
                <div
                  className={themeStyles.preview}
                  style={{
                    background:
                      theme.background.type === 'gradient'
                        ? `linear-gradient(${theme.background.direction}, ${theme.background.color}, ${theme.background.colorEnd})`
                        : theme.background.color,
                  }}
                >
                  <div className={themeStyles.previewText} style={{ color: theme.text.headingColor }}>
                    Aa
                  </div>
                </div>
                <div className={themeStyles.info}>
                  <span className={themeStyles.name}>{getThemeLabel(theme.id)}</span>
                  {theme.recommendFont && (
                    <span className={themeStyles.font}>{theme.recommendFont}</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
