import { useRef } from 'react';
import { useStore } from '../../stores/useStore';
import { t } from '../../i18n';
import styles from './DecorPanel.module.css';

function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <label className={styles.toggle}>
      <span>{label}</span>
      <div className={`${styles.switch} ${checked ? styles.on : ''}`} onClick={() => onChange(!checked)}>
        <div className={styles.knob} />
      </div>
    </label>
  );
}

function RangeField({ value, min, max, step, onChange, label, unit = '' }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void; label: string; unit?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <div className={styles.rangeRow}>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
        <span className={styles.rangeVal}>{value}{unit}</span>
      </div>
    </label>
  );
}

function TextField({ value, onChange, label, placeholder }: {
  value: string; onChange: (v: string) => void; label: string; placeholder?: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} />
    </label>
  );
}

function SelectField<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export default function DecorPanel() {
  const { decoration, updateDecoration, setActivePanel, language } = useStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const defaultWatermarkText = language === 'zh' ? '水印' : 'WATERMARK';

  const handleWatermarkImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      updateDecoration({ watermark: { ...decoration.watermark, imageUrl: ev.target?.result as string, type: 'image' } } as any);
    };
    reader.readAsDataURL(file);
  };

  const L = (key: string) => t(key, language);

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>{L('decor.title')}</h3>
        <button className={styles.closeBtn} onClick={() => setActivePanel('none')}>&times;</button>
      </div>
      <div className={styles.content}>
        <Section title={L('decor.watermark')}>
          <Toggle
            label={L('decor.enable')}
            checked={decoration.watermark.enabled}
            onChange={(v) => updateDecoration({
              watermark: {
                ...decoration.watermark,
                enabled: v,
                text: v && decoration.watermark.type === 'text' && !decoration.watermark.text.trim()
                  ? defaultWatermarkText
                  : decoration.watermark.text,
              }
            } as any)}
          />
          {decoration.watermark.enabled && (
            <div className={styles.sectionBody}>
              <SelectField label={L('decor.type')} value={decoration.watermark.type} options={[
                { value: 'text' as const, label: L('decor.text') },
                { value: 'image' as const, label: L('decor.image') },
              ]} onChange={(v) => updateDecoration({ watermark: { ...decoration.watermark, type: v } } as any)} />
              {decoration.watermark.type === 'text' && (
                <TextField label={L('decor.watermarkText')} value={decoration.watermark.text} onChange={(v) => updateDecoration({ watermark: { ...decoration.watermark, text: v } } as any)} placeholder="e.g. Confidential" />
              )}
              {decoration.watermark.type === 'image' && (
                <div className={styles.uploadField}>
                  <span>{L('decor.uploadImage')}</span>
                  <button className={styles.uploadBtn} onClick={() => fileInputRef.current?.click()}>{L('decor.chooseFile')}</button>
                  <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleWatermarkImageUpload} />
                </div>
              )}
              <RangeField label={L('decor.opacity')} value={decoration.watermark.opacity} min={0.01} max={1} step={0.01} onChange={(v) => updateDecoration({ watermark: { ...decoration.watermark, opacity: v } } as any)} />
              <RangeField label={L('decor.angle')} value={decoration.watermark.angle} min={-90} max={90} step={5} onChange={(v) => updateDecoration({ watermark: { ...decoration.watermark, angle: v } } as any)} unit="°" />
              {decoration.watermark.type === 'text' && (
                <RangeField label={L('decor.fontSize')} value={decoration.watermark.fontSize} min={10} max={40} step={1} onChange={(v) => updateDecoration({ watermark: { ...decoration.watermark, fontSize: v } } as any)} unit="px" />
              )}
              <RangeField label={L('decor.spacing')} value={decoration.watermark.spacing} min={20} max={300} step={10} onChange={(v) => updateDecoration({ watermark: { ...decoration.watermark, spacing: v } } as any)} unit="px" />
            </div>
          )}
        </Section>

        <Section title={L('decor.logo')}>
          <Toggle label={L('decor.enable')} checked={decoration.logo.enabled} onChange={(v) => updateDecoration({ logo: { ...decoration.logo, enabled: v } } as any)} />
          {decoration.logo.enabled && (
            <div className={styles.sectionBody}>
              <div className={styles.uploadField}>
                <span>{L('decor.uploadImage')}</span>
                <button className={styles.uploadBtn} onClick={() => logoInputRef.current?.click()}>{L('decor.chooseFile')}</button>
                <input
                  ref={logoInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => updateDecoration({ logo: { ...decoration.logo, imageUrl: ev.target?.result as string, enabled: true } } as any);
                    reader.readAsDataURL(file);
                  }}
                />
              </div>
              {decoration.logo.imageUrl && <img src={decoration.logo.imageUrl} alt="logo" className={styles.logoPreview} />}
              <SelectField label={L('decor.position')} value={decoration.logo.position} options={[
                { value: 'top-left' as const, label: L('decor.topLeft') },
                { value: 'top-right' as const, label: L('decor.topRight') },
                { value: 'bottom-left' as const, label: L('decor.bottomLeft') },
                { value: 'bottom-right' as const, label: L('decor.bottomRight') },
              ]} onChange={(v) => updateDecoration({ logo: { ...decoration.logo, position: v } } as any)} />
              <RangeField label={L('decor.size')} value={decoration.logo.size} min={50} max={200} step={5} onChange={(v) => updateDecoration({ logo: { ...decoration.logo, size: v } } as any)} unit="px" />
            </div>
          )}
        </Section>

        <Section title={L('decor.qrCode')}>
          <Toggle label={L('decor.enable')} checked={decoration.qrCode.enabled} onChange={(v) => updateDecoration({ qrCode: { ...decoration.qrCode, enabled: v } } as any)} />
          {decoration.qrCode.enabled && (
            <div className={styles.sectionBody}>
              <TextField label={L('decor.url')} value={decoration.qrCode.url} onChange={(v) => updateDecoration({ qrCode: { ...decoration.qrCode, url: v } } as any)} placeholder="https://..." />
              <RangeField label={L('decor.size')} value={decoration.qrCode.size} min={60} max={200} step={10} onChange={(v) => updateDecoration({ qrCode: { ...decoration.qrCode, size: v } } as any)} unit="px" />
            </div>
          )}
        </Section>

        <Section title={L('decor.borderFrame')}>
          <Toggle label={L('decor.enable')} checked={decoration.borderFrame.enabled} onChange={(v) => updateDecoration({ borderFrame: { ...decoration.borderFrame, enabled: v } } as any)} />
          {decoration.borderFrame.enabled && (
            <div className={styles.sectionBody}>
              <SelectField label={L('decor.frameStyle')} value={decoration.borderFrame.style} options={[
                { value: 'simple' as const, label: L('decor.simple') },
                { value: 'ornate' as const, label: L('decor.ornate') },
                { value: 'geometric' as const, label: L('decor.geometric') },
              ]} onChange={(v) => updateDecoration({ borderFrame: { ...decoration.borderFrame, style: v } } as any)} />
              <RangeField label={L('decor.width')} value={decoration.borderFrame.width} min={1} max={6} step={1} onChange={(v) => updateDecoration({ borderFrame: { ...decoration.borderFrame, width: v } } as any)} unit="px" />
            </div>
          )}
        </Section>
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
