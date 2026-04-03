import { FiGithub } from 'react-icons/fi';
import { useStore } from '../../stores/useStore';
import { t } from '../../i18n';
import styles from './Toolbar.module.css';

export default function Toolbar() {
  const { activePanel, setActivePanel, appTheme, setAppTheme, language, setLanguage } = useStore();

  const buttons = [
    { panel: 'size' as const, label: t('toolbar.size', language), icon: '📐' },
    { panel: 'style' as const, label: t('toolbar.style', language), icon: '✏️' },
    { panel: 'decor' as const, label: t('toolbar.decor', language), icon: '🖼️' },
    { panel: 'export' as const, label: t('toolbar.export', language), icon: '📤' },
  ];

  return (
    <div className={styles.toolbar}>
      <div className={styles.brand}>
        <img className={styles.logo} src="/Markie/logo.svg" alt="Markie" />
      </div>
      <div className={styles.buttons}>
        {buttons.map((btn) => (
          <button
            key={btn.panel}
            className={`${styles.btn} ${activePanel === btn.panel ? styles.active : ''}`}
            onClick={() => setActivePanel(activePanel === btn.panel ? 'none' : btn.panel)}
            title={btn.label}
          >
            <span className={styles.btnIcon}>{btn.icon}</span>
            <span className={styles.btnLabel}>{btn.label}</span>
          </button>
        ))}
      </div>
      <div className={styles.right}>
        <button
          className={styles.langBtn}
          onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}
        >
          {language === 'zh' ? 'EN' : '中'}
        </button>
        <button
          className={styles.themeToggle}
          onClick={() => setAppTheme(appTheme === 'dark' ? 'light' : 'dark')}
          title={appTheme === 'dark' ? t('toolbar.switchToLight', language) : t('toolbar.switchToDark', language)}
        >
          {appTheme === 'dark' ? '☀️' : '🌙'}
        </button>
        <a
          href="https://github.com/aiibskyler/Markie"
          target="_blank"
          rel="noopener noreferrer"
          className={styles.github}
          title="GitHub"
          aria-label="Open GitHub repository"
        >
          <FiGithub />
        </a>
      </div>
    </div>
  );
}
