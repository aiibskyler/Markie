import { useStore } from '../../stores/useStore';
import { themes } from '../../themes/presets';
import { t } from '../../i18n';
import styles from './ThemePanel.module.css';

export default function ThemePanel() {
  const { currentThemeId, setCurrentThemeId, setActivePanel, language } = useStore();

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>{t('theme.title', language)}</h3>
        <button className={styles.closeBtn} onClick={() => setActivePanel('none')}>&times;</button>
      </div>
      <div className={styles.grid}>
        {themes.map((theme) => (
          <button
            key={theme.id}
            className={`${styles.themeCard} ${currentThemeId === theme.id ? styles.active : ''}`}
            onClick={() => setCurrentThemeId(theme.id)}
          >
            <div
              className={styles.preview}
              style={{
                background:
                  theme.background.type === 'gradient'
                    ? `linear-gradient(${theme.background.direction}, ${theme.background.color}, ${theme.background.colorEnd})`
                    : theme.background.color,
              }}
            >
              <div className={styles.previewText} style={{ color: theme.text.headingColor }}>
                Aa
              </div>
            </div>
            <div className={styles.info}>
              <span className={styles.name}>{theme.name}</span>
              {theme.recommendFont && (
                <span className={styles.font}>{theme.recommendFont}</span>
              )}
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
