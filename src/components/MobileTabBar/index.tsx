import { useStore } from '../../stores/useStore';
import { t } from '../../i18n';
import styles from './MobileTabBar.module.css';

export default function MobileTabBar() {
  const { mobileTab, setMobileTab, language } = useStore();

  const tabs = [
    { id: 'editor' as const, label: t('editor.title', language), icon: '✏️' },
    { id: 'preview' as const, label: t('preview.title', language), icon: '👁️' },
  ];

  return (
    <div className={styles.tabBar}>
      {tabs.map((tab) => (
        <button
          key={tab.id}
          className={`${styles.tab} ${mobileTab === tab.id ? styles.tabActive : ''}`}
          onClick={() => setMobileTab(tab.id)}
        >
          <span className={styles.tabIcon}>{tab.icon}</span>
          {tab.label}
        </button>
      ))}
    </div>
  );
}
