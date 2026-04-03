import { useRef, useState } from 'react';
import { useStore } from '../../stores/useStore';
import { builtinFonts, codeFonts } from '../../fonts/builtinFonts';
import { t } from '../../i18n';
import styles from './StylePanel.module.css';

function ColorInput({ value, onChange, label }: {
  value: string; onChange: (v: string) => void; label: string;
}) {
  return (
    <label className={styles.colorField}>
      <span>{label}</span>
      <div className={styles.colorInput}>
        <input type="color" value={value || '#000000'} onChange={(e) => onChange(e.target.value)} />
        <input type="text" value={value} onChange={(e) => onChange(e.target.value)} placeholder="auto" />
      </div>
    </label>
  );
}

function RangeInput({ value, min, max, step, onChange, label, unit = '' }: {
  value: number; min: number; max: number; step: number; onChange: (v: number) => void; label: string; unit?: string;
}) {
  return (
    <label className={styles.rangeField}>
      <span>{label}</span>
      <div className={styles.rangeRow}>
        <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(Number(e.target.value))} />
        <span className={styles.rangeValue}>{value}{unit}</span>
      </div>
    </label>
  );
}

function SelectInput<T extends string>({ value, options, onChange, label }: {
  value: T; options: { value: T; label: string }[]; onChange: (v: T) => void; label: string;
}) {
  return (
    <label className={styles.selectField}>
      <span>{label}</span>
      <select value={value} onChange={(e) => onChange(e.target.value as T)}>
        {options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
      </select>
    </label>
  );
}

export default function StylePanel() {
  const { globalFont, setGlobalFont, headingFont, setHeadingFont, codeFont, setCodeFont, elementStyles, updateElementStyles, setActivePanel, language } = useStore();
  const customFontRef = useRef<HTMLInputElement>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    fonts: false,
    layout: false,
    headings: false,
    body: false,
    blockquote: false,
    code: false,
    image: false,
    divider: false,
  });

  const handleCustomFontUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const fontName = file.name.replace(/\.[^.]+$/, '');
    const fontFamily = `Custom_${fontName.replace(/\s+/g, '_')}`;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      const fontFace = new FontFace(fontFamily, `url(${url})`);
      fontFace.load().then((loaded) => {
        document.fonts.add(loaded);
        setGlobalFont(fontFamily);
      });
    };
    reader.readAsDataURL(file);
  };

  const L = (key: string) => t(key, language);
  const toggleSection = (key: string) => {
    setExpandedSections((state) => ({ ...state, [key]: !state[key] }));
  };

  return (
    <div className={styles.panel}>
      <div className={styles.header}>
        <h3>{L('style.title')}</h3>
        <button className={styles.closeBtn} onClick={() => setActivePanel('none')}>&times;</button>
      </div>
      <div className={styles.content}>
        <Section title={L('style.fonts')} expanded={expandedSections.fonts} onToggle={() => toggleSection('fonts')}>
          <div className={styles.fontUpload}>
            <button className={styles.uploadBtn} onClick={() => customFontRef.current?.click()}>
              {L('style.uploadFont')}
            </button>
            <input ref={customFontRef} type="file" accept=".ttf,.otf,.woff,.woff2" style={{ display: 'none' }} onChange={handleCustomFontUpload} />
          </div>
          <SelectInput label={L('style.bodyFont')} value={globalFont} options={builtinFonts.map(f => ({ value: f.family, label: f.name }))} onChange={setGlobalFont} />
          <SelectInput label={L('style.headingFont')} value={headingFont} options={[{ value: '', label: L('style.sameAsBody') }, ...builtinFonts.map(f => ({ value: f.family, label: f.name }))]} onChange={setHeadingFont} />
          <SelectInput label={L('style.codeFont')} value={codeFont} options={codeFonts.map(f => ({ value: f.family, label: f.name }))} onChange={setCodeFont} />
        </Section>

        <Section title={L('style.layout')} expanded={expandedSections.layout} onToggle={() => toggleSection('layout')}>
          <RangeInput label={L('style.canvasPadding')} value={elementStyles.canvasPadding} min={20} max={100} step={4} onChange={(v) => updateElementStyles({ canvasPadding: v } as any)} unit="px" />
          <RangeInput label={L('style.paragraphIndent')} value={elementStyles.paragraphIndent} min={0} max={4} step={1} onChange={(v) => updateElementStyles({ paragraphIndent: v } as any)} unit="em" />
          <RangeInput label={L('style.paragraphSpacing')} value={elementStyles.paragraphSpacing} min={0} max={60} step={4} onChange={(v) => updateElementStyles({ paragraphSpacing: v } as any)} unit="px" />
        </Section>

        <Section title={L('style.headings')} expanded={expandedSections.headings} onToggle={() => toggleSection('headings')}>
          <RangeInput label={L('style.fontSize')} value={elementStyles.heading.fontSize} min={18} max={48} step={1} onChange={(v) => updateElementStyles({ heading: { ...elementStyles.heading, fontSize: v } as any })} unit="px" />
          <RangeInput label={L('style.fontWeight')} value={elementStyles.heading.fontWeight} min={300} max={900} step={100} onChange={(v) => updateElementStyles({ heading: { ...elementStyles.heading, fontWeight: v } as any })} />
          <ColorInput label={L('style.color')} value={elementStyles.heading.color} onChange={(v) => updateElementStyles({ heading: { ...elementStyles.heading, color: v } as any })} />
          <SelectInput label={L('style.align')} value={elementStyles.heading.textAlign} options={[
            { value: 'left' as const, label: L('style.left') },
            { value: 'center' as const, label: L('style.center') },
            { value: 'right' as const, label: L('style.right') },
          ]} onChange={(v) => updateElementStyles({ heading: { ...elementStyles.heading, textAlign: v } as any })} />
        </Section>

        <Section title={L('style.bodyText')} expanded={expandedSections.body} onToggle={() => toggleSection('body')}>
          <RangeInput label={L('style.fontSize')} value={elementStyles.body.fontSize} min={12} max={36} step={1} onChange={(v) => updateElementStyles({ body: { ...elementStyles.body, fontSize: v } as any })} unit="px" />
          <RangeInput label={L('style.lineHeight')} value={elementStyles.body.lineHeight} min={1.2} max={2.5} step={0.1} onChange={(v) => updateElementStyles({ body: { ...elementStyles.body, lineHeight: v } as any })} />
          <ColorInput label={L('style.color')} value={elementStyles.body.color} onChange={(v) => updateElementStyles({ body: { ...elementStyles.body, color: v } as any })} />
        </Section>

        <Section title={L('style.blockquote')} expanded={expandedSections.blockquote} onToggle={() => toggleSection('blockquote')}>
          <ColorInput label={L('style.background')} value={elementStyles.blockquote.bgColor} onChange={(v) => updateElementStyles({ blockquote: { ...elementStyles.blockquote, bgColor: v } as any })} />
          <ColorInput label={L('style.borderColor')} value={elementStyles.blockquote.borderColor} onChange={(v) => updateElementStyles({ blockquote: { ...elementStyles.blockquote, borderColor: v } as any })} />
          <RangeInput label={L('style.borderWidth')} value={elementStyles.blockquote.borderWidth} min={1} max={8} step={1} onChange={(v) => updateElementStyles({ blockquote: { ...elementStyles.blockquote, borderWidth: v } as any })} unit="px" />
          <RangeInput label={L('style.radius')} value={elementStyles.blockquote.borderRadius} min={0} max={20} step={1} onChange={(v) => updateElementStyles({ blockquote: { ...elementStyles.blockquote, borderRadius: v } as any })} unit="px" />
        </Section>

        <Section title={L('style.codeBlock')} expanded={expandedSections.code} onToggle={() => toggleSection('code')}>
          <ColorInput label={L('style.background')} value={elementStyles.codeBlock.bgColor} onChange={(v) => updateElementStyles({ codeBlock: { ...elementStyles.codeBlock, bgColor: v } as any })} />
          <ColorInput label={L('style.textColor')} value={elementStyles.codeBlock.textColor} onChange={(v) => updateElementStyles({ codeBlock: { ...elementStyles.codeBlock, textColor: v } as any })} />
          <RangeInput label={L('style.radius')} value={elementStyles.codeBlock.borderRadius} min={0} max={20} step={1} onChange={(v) => updateElementStyles({ codeBlock: { ...elementStyles.codeBlock, borderRadius: v } as any })} unit="px" />
        </Section>

        <Section title={L('style.image')} expanded={expandedSections.image} onToggle={() => toggleSection('image')}>
          <RangeInput label={L('style.radius')} value={elementStyles.image.borderRadius} min={0} max={24} step={1} onChange={(v) => updateElementStyles({ image: { ...elementStyles.image, borderRadius: v } as any })} unit="px" />
          <RangeInput label={L('style.borderWidth')} value={elementStyles.image.borderWidth} min={0} max={8} step={1} onChange={(v) => updateElementStyles({ image: { ...elementStyles.image, borderWidth: v } as any })} unit="px" />
        </Section>

        <Section title={L('style.divider')} expanded={expandedSections.divider} onToggle={() => toggleSection('divider')}>
          <SelectInput label={L('style.style')} value={elementStyles.divider.style} options={[
            { value: 'solid' as const, label: L('style.solid') },
            { value: 'dashed' as const, label: L('style.dashed') },
            { value: 'dotted' as const, label: L('style.dotted') },
          ]} onChange={(v) => updateElementStyles({ divider: { ...elementStyles.divider, style: v } as any })} />
          <RangeInput label={L('style.thickness')} value={elementStyles.divider.thickness} min={1} max={4} step={1} onChange={(v) => updateElementStyles({ divider: { ...elementStyles.divider, thickness: v } as any })} unit="px" />
        </Section>
      </div>
    </div>
  );
}

function Section({ title, expanded, onToggle, children }: { title: string; expanded: boolean; onToggle: () => void; children: React.ReactNode }) {
  return (
    <div className={styles.section}>
      <button type="button" className={styles.sectionHeader} onClick={onToggle}>
        <span className={styles.sectionTitle}>{title}</span>
        <span className={`${styles.sectionChevron} ${expanded ? styles.sectionChevronOpen : ''}`}>⌄</span>
      </button>
      {expanded && <div className={styles.sectionBody}>{children}</div>}
    </div>
  );
}
