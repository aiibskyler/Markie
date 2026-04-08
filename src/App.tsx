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
