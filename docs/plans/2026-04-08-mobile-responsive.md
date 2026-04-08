# Markie Mobile Responsive Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make Markie fully usable on mobile devices (< 1024px) with tab-switching Editor/Preview and bottom sheet panels.

**Architecture:** On screens below 1024px, the side-by-side Editor/Preview layout transforms into a tab-switching view with a tab bar. Panels (Size/Style/Decor/Export) become bottom sheets that slide up with a backdrop overlay. The toolbar compacts to icon-only buttons. All changes use CSS media queries + minimal JS state (no new dependencies).

**Tech Stack:** React 19, TypeScript, CSS Modules, Zustand

---

### Task 1: Add Mobile State to Store and Types

**Files:**
- Modify: `src/types/index.ts` (add MobileTab type, update AppState)
- Modify: `src/stores/useStore.ts` (add mobileTab state)

**Step 1: Update types**

In `src/types/index.ts`, add after the `ExportFormat` line:

```typescript
export type MobileTab = 'editor' | 'preview';
```

In `AppState` interface, add after the `activePanel` line:

```typescript
  // Mobile
  mobileTab: MobileTab;
  setMobileTab: (tab: MobileTab) => void;
```

**Step 2: Update store**

In `src/stores/useStore.ts`, add to the store creation:

```typescript
  mobileTab: 'preview' as MobileTab,
  setMobileTab: (tab) => set({ mobileTab: tab }),
```

Add import for `MobileTab` type.

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No type errors

**Step 4: Commit**

```bash
git add src/types/index.ts src/stores/useStore.ts
git commit -m "feat: add mobileTab state for mobile responsive layout"
```

---

### Task 2: Create useIsMobile Hook

**Files:**
- Create: `src/hooks/useIsMobile.ts`

**Step 1: Create the hook**

```typescript
import { useSyncExternalStore } from 'react';

const MOBILE_QUERY = '(max-width: 1023px)';

function subscribe(cb: () => void) {
  const mql = window.matchMedia(MOBILE_QUERY);
  mql.addEventListener('change', cb);
  return () => mql.removeEventListener('change', cb);
}

function getSnapshot() {
  return window.matchMedia(MOBILE_QUERY).matches;
}

function getServerSnapshot() {
  return false;
}

export function useIsMobile() {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

Uses React 19's `useSyncExternalStore` for tear-free media query tracking. No re-renders when viewport hasn't changed.

**Step 2: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 3: Commit**

```bash
git add src/hooks/useIsMobile.ts
git commit -m "feat: add useIsMobile hook for responsive detection"
```

---

### Task 3: Create BottomSheet Component

**Files:**
- Create: `src/components/BottomSheet/index.tsx`
- Create: `src/components/BottomSheet/BottomSheet.module.css`

**Step 1: Create the CSS**

```css
/* BottomSheet.module.css */
.backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 1000;
  animation: fadeIn 0.2s ease;
}

.sheet {
  position: fixed;
  left: 0;
  right: 0;
  bottom: 0;
  max-height: 70vh;
  background: var(--app-panel-bg);
  border-radius: 20px 20px 0 0;
  z-index: 1001;
  display: flex;
  flex-direction: column;
  animation: slideUp 0.3s cubic-bezier(0.32, 0.72, 0, 1);
  box-shadow: 0 -8px 40px rgba(0, 0, 0, 0.2);
}

.handle {
  display: flex;
  justify-content: center;
  padding: 10px 0 6px;
  flex-shrink: 0;
  cursor: grab;
}

.handleBar {
  width: 36px;
  height: 4px;
  background: var(--app-text-faint);
  border-radius: 2px;
}

.sheetContent {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  overscroll-behavior: contain;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
```

**Step 2: Create the component**

```tsx
import { useEffect, type ReactNode } from 'react';
import styles from './BottomSheet.module.css';

interface BottomSheetProps {
  children: ReactNode;
  onClose: () => void;
}

export default function BottomSheet({ children, onClose }: BottomSheetProps) {
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  return (
    <>
      <div className={styles.backdrop} onClick={onClose} />
      <div className={styles.sheet}>
        <div className={styles.handle}>
          <div className={styles.handleBar} />
        </div>
        <div className={styles.sheetContent}>
          {children}
        </div>
      </div>
    </>
  );
}
```

**Step 3: Verify build**

Run: `npx tsc --noEmit`
Expected: No errors

**Step 4: Commit**

```bash
git add src/components/BottomSheet/
git commit -m "feat: add BottomSheet component for mobile panels"
```

---

### Task 4: Create MobileTabBar Component

**Files:**
- Create: `src/components/MobileTabBar/index.tsx`
- Create: `src/components/MobileTabBar/MobileTabBar.module.css`

**Step 1: Create the CSS**

```css
/* MobileTabBar.module.css */
.tabBar {
  display: none;
}

.tabBarVisible {
  display: flex;
  align-items: center;
  height: 42px;
  background: var(--app-toolbar-bg);
  border-bottom: 1px solid var(--app-border);
  flex-shrink: 0;
  padding: 0 12px;
  gap: 4px;
  backdrop-filter: blur(18px);
}

.tab {
  flex: 1;
  height: 30px;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 8px;
  color: var(--app-text-muted);
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  transition: all 0.2s ease;
}

.tabActive {
  background: var(--app-accent-soft);
  border-color: var(--app-accent-border);
  color: var(--app-accent-text);
}

.tabIcon {
  font-size: 14px;
}
```

**Step 2: Create the component**

```tsx
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
    <div className={`${styles.tabBar} ${styles.tabBarVisible}`}>
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
```

Note: The `tabBar` base class has `display: none` so it's hidden on desktop. The `tabBarVisible` class overrides with `display: flex`. On desktop, App.tsx won't render MobileTabBar at all (controlled via `useIsMobile`), but the CSS provides a safety net.

**Step 3: Verify build**

Run: `npx tsc --noEmit`

**Step 4: Commit**

```bash
git add src/components/MobileTabBar/
git commit -m "feat: add MobileTabBar component for Editor/Preview switching"
```

---

### Task 5: Update App.tsx for Mobile Layout

**Files:**
- Modify: `src/App.tsx`
- Modify: `src/App.css`

**Step 1: Update App.tsx**

Replace the entire App.tsx with:

```tsx
import { useStore } from './stores/useStore';
import { useIsMobile } from './hooks/useIsMobile';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import Preview from './components/Preview';
import SizePanel from './components/SizePanel';
import StylePanel from './components/StylePanel';
import DecorPanel from './components/DecorPanel';
import ExportDialog from './components/ExportDialog';
import MobileTabBar from './components/MobileTabBar';
import BottomSheet from './components/BottomSheet';
import './App.css';

function App() {
  const { activePanel, setActivePanel, appTheme, mobileTab } = useStore();
  const isMobile = useIsMobile();

  const panelComponents: Record<string, React.ReactNode> = {
    size: <SizePanel />,
    style: <StylePanel />,
    decor: <DecorPanel />,
    export: <ExportDialog />,
  };

  const activePanelContent = activePanel !== 'none' ? panelComponents[activePanel] : null;

  return (
    <div className={`app ${appTheme}`}>
      <Toolbar />
      {isMobile && <MobileTabBar />}
      <div className={`main ${isMobile ? 'mainMobile' : ''}`}>
        {/* Desktop: panels as sidebar */}
        {!isMobile && activePanelContent}

        {/* Desktop: both editor+preview side by side */}
        {!isMobile && <Editor />}
        {!isMobile && <Preview />}

        {/* Mobile: show only active tab */}
        {isMobile && mobileTab === 'editor' && <Editor />}
        {isMobile && mobileTab === 'preview' && <Preview />}
      </div>

      {/* Mobile: panels as bottom sheet */}
      {isMobile && activePanelContent && (
        <BottomSheet onClose={() => setActivePanel('none')}>
          {activePanelContent}
        </BottomSheet>
      )}
    </div>
  );
}

export default App;
```

**Step 2: Update App.css**

Add mobile layout styles after the existing `.main` block:

```css
.mainMobile {
  flex-direction: column;
}
```

**Step 3: Verify it works**

Run: `npm run dev`
- Desktop: should look identical to before
- Resize to < 1024px: should see tab bar, only one panel visible
- Click panel buttons: bottom sheet should appear

**Step 4: Commit**

```bash
git add src/App.tsx src/App.css
git commit -m "feat: integrate mobile responsive layout into App"
```

---

### Task 6: Responsive Toolbar CSS

**Files:**
- Modify: `src/components/Toolbar/Toolbar.module.css`

**Step 1: Add mobile styles at end of file**

```css
/* ====== Mobile Responsive ====== */
@media (max-width: 1023px) {
  .toolbar {
    height: 48px;
    padding: 0 10px;
  }

  .brand {
    margin-right: 12px;
  }

  .logo {
    height: 26px;
  }

  .buttons {
    gap: 2px;
    padding: 2px;
    border-radius: 10px;
  }

  .btn {
    height: 32px;
    padding: 0 10px;
    gap: 4px;
  }

  .btnLabel {
    display: none;
  }

  .btnIcon {
    font-size: 17px;
  }

  .right {
    gap: 6px;
  }

  .langBtn {
    height: 30px;
    min-width: 34px;
    padding: 0 8px;
    font-size: 11px;
  }

  .themeToggle {
    width: 30px;
    height: 30px;
    font-size: 14px;
  }

  .github {
    width: 30px;
    height: 30px;
    font-size: 14px;
  }
}
```

Key changes: hides button labels (icon-only), reduces heights/paddings.

**Step 2: Verify visually**

Run: `npm run dev`, resize to < 1024px
Expected: Compact toolbar with icon-only buttons, logo smaller

**Step 3: Commit**

```bash
git add src/components/Toolbar/Toolbar.module.css
git commit -m "feat: responsive toolbar with compact mobile layout"
```

---

### Task 7: Responsive Panel CSS (Bottom Sheet Override)

**Files:**
- Modify: `src/components/ExportDialog/ExportDialog.module.css`
- Modify: `src/components/StylePanel/StylePanel.module.css`
- Modify: `src/components/DecorPanel/DecorPanel.module.css`

**Step 1: Add mobile overrides to each panel CSS file**

Add at the end of each file:

```css
/* ====== Mobile Responsive ====== */
@media (max-width: 1023px) {
  .panel {
    width: 100%;
    height: auto;
    border-right: none;
    box-shadow: none;
  }

  .content {
    max-height: calc(70vh - 60px);
  }
}
```

Note: On mobile the panel is inside the BottomSheet, so it needs to be full-width, auto height, no border-right, no box-shadow (the BottomSheet handles those).

**Step 2: Verify visually**

Click panel buttons on mobile, confirm bottom sheets look correct.

**Step 3: Commit**

```bash
git add src/components/ExportDialog/ExportDialog.module.css src/components/StylePanel/StylePanel.module.css src/components/DecorPanel/DecorPanel.module.css
git commit -m "feat: responsive panel styles for bottom sheet on mobile"
```

---

### Task 8: Responsive Editor and Preview CSS

**Files:**
- Modify: `src/components/Editor/Editor.module.css`
- Modify: `src/components/Preview/Preview.module.css`

**Step 1: Add mobile overrides to Editor CSS**

```css
/* ====== Mobile Responsive ====== */
@media (max-width: 1023px) {
  .header {
    display: none;
  }

  .textarea {
    padding: 16px;
    font-size: 15px;
  }
}
```

The header is hidden because the MobileTabBar replaces it.

**Step 2: Add mobile overrides to Preview CSS**

```css
/* ====== Mobile Responsive ====== */
@media (max-width: 1023px) {
  .header {
    display: none;
  }

  .scrollContainer {
    padding: 16px;
  }
}
```

**Step 3: Verify visually**

Switch between Editor and Preview tabs on mobile. Both should fill the full area.

**Step 4: Commit**

```bash
git add src/components/Editor/Editor.module.css src/components/Preview/Preview.module.css
git commit -m "feat: responsive Editor and Preview for mobile tab layout"
```

---

### Task 9: Final Polish and Verification

**Step 1: Full visual QA**

Run: `npm run dev`
Test on multiple viewport sizes:
- 375px (iPhone SE)
- 390px (iPhone 14)
- 768px (iPad Mini)
- 1023px (just under breakpoint)
- 1024px (desktop — should be unchanged)

Check:
- [ ] Tab switching works smoothly
- [ ] Bottom sheets open/close correctly
- [ ] Toolbar buttons are tappable (min 44px touch targets)
- [ ] No horizontal overflow
- [ ] Editor text is readable on small screens
- [ ] Preview renders correctly
- [ ] Desktop layout is completely unchanged

**Step 2: Build check**

Run: `npm run build`
Expected: Build succeeds with no errors

**Step 3: Commit**

```bash
git add -A
git commit -m "feat: complete mobile responsive layout for Markie"
```
