/* App.jsx — root composition. Orchestrates screens inside the iOS frame. */
(function () {
  'use strict';

  const { useState, useEffect, useMemo } = React;

  const TWEAK_DEFAULTS = /*EDITMODE-BEGIN*/{
    "theme": "light",
    "numberFont": "serif",
    "boardTexture": "paper",
    "showDesktop": true,
    "accent": "sumi"
  }/*EDITMODE-END*/;

  function App() {
    const [tw, setTweak] = window.useTweaks(TWEAK_DEFAULTS);

    const [screen, setScreen] = useState('home'); // 'home' | 'game' | 'win' | 'stats' | 'settings'
    const [activeLevel, setActiveLevel] = useState('medium');
    const [tab, setTab] = useState('home');
    const [winStats, setWinStats] = useState(null);

    const [settings, setSettings] = useState({
      theme: 'light',
      highlightSame: true,
      highlightUnit: true,
      autoNotes: false,
      mistakeLimit: true,
      sound: true,
    });

    // Apply theme
    useEffect(() => {
      const theme = tw.theme || settings.theme;
      document.documentElement.setAttribute('data-theme', theme);
    }, [tw.theme, settings.theme]);

    // Apply number font via CSS var
    useEffect(() => {
      const font = {
        serif: 'var(--font-serif)',
        sans: 'var(--font-sans)',
        mono: 'var(--font-mono)',
      }[tw.numberFont] || 'var(--font-sans)';
      document.documentElement.style.setProperty('--num-font', font);
    }, [tw.numberFont]);

    const continueGame = { level: 'medium', progress: 63, time: '08:41' };

    function startGame(level) {
      setActiveLevel(level);
      setScreen('game');
    }

    function handleTab(id) {
      setTab(id);
      if (id === 'home') setScreen('home');
      else if (id === 'stats') setScreen('stats');
      else if (id === 'settings') setScreen('settings');
    }

    let content;
    if (screen === 'home') {
      content = <window.HomeScreen
        onPlay={startGame}
        onOpenTab={handleTab}
        activeTab={tab}
        continueGame={continueGame}
      />;
    } else if (screen === 'game') {
      content = <window.GameScreen
        level={activeLevel}
        settings={settings}
        onExit={() => { setScreen('home'); setTab('home'); }}
        onWin={(stats) => { setWinStats(stats); setScreen('win'); }}
      />;
    } else if (screen === 'win') {
      content = <window.WinScreen
        stats={winStats}
        onNext={() => setScreen('game')}
        onReplay={() => setScreen('game')}
        onHome={() => { setScreen('home'); setTab('home'); }}
      />;
    } else if (screen === 'stats') {
      content = <window.StatsScreen activeTab={tab} onOpenTab={handleTab} />;
    } else if (screen === 'settings') {
      content = <window.SettingsScreen
        activeTab={tab}
        onOpenTab={handleTab}
        settings={settings}
        onChange={setSettings}
        onResetStats={() => {}}
      />;
    }

    return (
      <div className="stage" data-screen-label="Sudoku app">
        <div className="phone-col" data-screen-label="Main phone">
          <div className="label">Sudoku · {screen}</div>
          <window.IOSDevice width={390} height={844}>
            {content}
          </window.IOSDevice>
        </div>

        {tw.showDesktop && (
          <DesktopPreview>
            <window.GameScreen
              level="hard"
              settings={settings}
              onExit={() => {}}
              onWin={() => {}}
            />
          </DesktopPreview>
        )}

        <TweaksUI tw={tw} setTweak={setTweak} />
      </div>
    );
  }

  function DesktopPreview({ children }) {
    // A browser-chrome-less larger viewport variant showing the game screen
    return (
      <div className="phone-col" data-screen-label="Desktop preview">
        <div className="label">Desktop · Game</div>
        <div style={{
          width: 460,
          height: 844,
          borderRadius: 20,
          background: 'var(--bg)',
          boxShadow: '0 30px 80px rgba(40,30,20,0.18), 0 8px 24px rgba(40,30,20,0.10)',
          border: '1px solid var(--border)',
          overflow: 'hidden',
        }}>
          {children}
        </div>
      </div>
    );
  }

  function TweaksUI({ tw, setTweak }) {
    const Panel = window.TweaksPanel;
    const Section = window.TweakSection;
    const Radio = window.TweakRadio;
    const Toggle = window.TweakToggle;
    if (!Panel) return null;
    return (
      <Panel title="Tweaks">
        <Section label="Theme" />
        <Radio
          label="Mode"
          value={tw.theme}
          onChange={(v) => setTweak('theme', v)}
          options={[
            { value: 'light', label: 'Light' },
            { value: 'dark', label: 'Dark' },
          ]}
        />
        <Section label="Number typeface" />
        <Radio
          label="Font"
          value={tw.numberFont}
          onChange={(v) => setTweak('numberFont', v)}
          options={[
            { value: 'serif', label: 'Serif' },
            { value: 'sans', label: 'Sans' },
            { value: 'mono', label: 'Mono' },
          ]}
        />
        <Section label="Layout" />
        <Toggle
          label="Desktop preview"
          value={tw.showDesktop}
          onChange={(v) => setTweak('showDesktop', v)}
        />
      </Panel>
    );
  }

  // Mount
  const root = ReactDOM.createRoot(document.getElementById('root'));
  root.render(<App />);
})();
