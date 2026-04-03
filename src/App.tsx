import { useStore } from './stores/useStore';
import Toolbar from './components/Toolbar';
import Editor from './components/Editor';
import Preview from './components/Preview';
import ThemePanel from './components/ThemePanel';
import StylePanel from './components/StylePanel';
import DecorPanel from './components/DecorPanel';
import ExportDialog from './components/ExportDialog';
import './App.css';

function App() {
  const activePanel = useStore((s) => s.activePanel);
  const appTheme = useStore((s) => s.appTheme);

  return (
    <div className={`app ${appTheme}`}>
      <Toolbar />
      <div className="main">
        {activePanel === 'theme' && <ThemePanel />}
        {activePanel === 'style' && <StylePanel />}
        {activePanel === 'decor' && <DecorPanel />}
        {activePanel === 'export' && <ExportDialog />}
        <Editor />
        <Preview />
      </div>
    </div>
  );
}

export default App;
