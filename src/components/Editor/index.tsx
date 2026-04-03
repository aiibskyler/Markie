import { useRef, useCallback } from 'react';
import { useStore } from '../../stores/useStore';
import { t } from '../../i18n';
import styles from './Editor.module.css';

export default function Editor() {
  const { markdown, setMarkdown, language } = useStore();
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      setMarkdown(e.target.value);
    },
    [setMarkdown]
  );

  const handleTab = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === 'Tab') {
        e.preventDefault();
        const textarea = textareaRef.current;
        if (!textarea) return;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const value = textarea.value;
        const newValue = value.substring(0, start) + '  ' + value.substring(end);
        setMarkdown(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    },
    [setMarkdown]
  );

  return (
    <div className={styles.editor}>
      <div className={styles.header}>
        <span className={styles.title}>{t('editor.title', language)}</span>
      </div>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        value={markdown}
        onChange={handleChange}
        onKeyDown={handleTab}
        placeholder={t('editor.placeholder', language)}
        spellCheck={false}
      />
    </div>
  );
}
