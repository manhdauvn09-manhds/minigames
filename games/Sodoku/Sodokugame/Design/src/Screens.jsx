/* Home, Win, Stats, Settings screens. Plus the Game screen composition. */
(function () {
  'use strict';

  const { useState, useEffect, useMemo, useRef } = React;
  const Icon = window.Icon;

  // ---------------- Level metadata ----------------
  const LEVELS = [
    { id: 'beginner', name: 'Beginner', kanji: '新人', desc: 'Learn the rhythm.', best: '3:12', dots: 1 },
    { id: 'easy',     name: 'Easy',     kanji: '簡単', desc: 'A calm warm-up.',   best: '5:47', dots: 2 },
    { id: 'medium',   name: 'Medium',   kanji: '普通', desc: 'Standard fare.',    best: '9:04', dots: 3 },
    { id: 'hard',     name: 'Hard',     kanji: '難しい', desc: 'Requires patience.', best: '14:22', dots: 4 },
    { id: 'master',   name: 'Master',   kanji: '達人', desc: 'Techniques only.',  best: '—',    dots: 5 },
  ];

  window.LEVELS = LEVELS;
  window.LEVEL_BY_ID = Object.fromEntries(LEVELS.map(l => [l.id, l]));

  // ---------------- Status bar (custom, matches iOS frame aesthetics) ----------------

  // ---------------- Home Screen ----------------
  function HomeScreen({ onPlay, onOpenTab, activeTab, continueGame }) {
    return (
      <div className="screen">
        <div className="screen-body">
          <div className="home-header">
            <div className="greeting">Tuesday, April 28</div>
            <div className="title">
              <img src="assets/kaya-mark.svg" alt="" className="mark" />
              Sudoku
            </div>
          </div>

          {continueGame && (
            <>
              <div className="section-label">Continue</div>
              <div className="continue-card" onClick={() => onPlay(continueGame.level, true)}>
                <div className="mini-board">
                  {Array.from({ length: 9 }).map((_, i) => (
                    <div key={i} className={i < 6 ? 'filled' : ''} />
                  ))}
                </div>
                <div className="info">
                  <div className="row1">{window.LEVEL_BY_ID[continueGame.level].name}</div>
                  <div className="row2">{continueGame.progress}% · {continueGame.time}</div>
                </div>
                <ProgressRing percent={continueGame.progress} />
              </div>
            </>
          )}

          <div className="section-label">Choose a level</div>
          <div className="level-list">
            {LEVELS.map((l) => (
              <div key={l.id} className="level-card" onClick={() => onPlay(l.id, false)}>
                <div className="pip">
                  <div className="kanji">{l.kanji}</div>
                  <div className="pip-dots">
                    {[0,1,2,3,4].map((i) => (
                      <span key={i} className={i < l.dots ? 'on' : ''} />
                    ))}
                  </div>
                </div>
                <div className="meta">
                  <div className="name">{l.name}</div>
                  <div className="desc">{l.desc}</div>
                </div>
                <div className="stat">
                  <b>{l.best}</b>
                  Best time
                </div>
              </div>
            ))}
          </div>

          <div className="section-label">Featured</div>
          <div className="daily-card" onClick={() => onPlay('medium', false)}>
            <div className="cal">
              <div className="mo">Apr</div>
              <div className="day">28</div>
            </div>
            <div className="info">
              <div className="t">Daily challenge</div>
              <div className="s">12,483 players solved today</div>
            </div>
            <div className="chev"><Icon.ChevronRight size={18} /></div>
          </div>

          <div style={{ height: 24 }} />
        </div>

        <TabBar activeTab={activeTab} onChange={onOpenTab} />
      </div>
    );
  }

  function ProgressRing({ percent }) {
    const r = 14, C = 2 * Math.PI * r;
    const off = C * (1 - percent / 100);
    return (
      <svg className="progress-ring" width="36" height="36" viewBox="0 0 36 36">
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--paper-3)" strokeWidth="2.5" />
        <circle
          cx="18" cy="18" r={r}
          fill="none"
          stroke="var(--sumi)"
          strokeWidth="2.5"
          strokeDasharray={C}
          strokeDashoffset={off}
          strokeLinecap="round"
          transform="rotate(-90 18 18)"
        />
        <text x="18" y="21" textAnchor="middle" fontSize="10" fontWeight="600" fill="var(--fg)" fontFamily="var(--font-mono)">
          {percent}
        </text>
      </svg>
    );
  }

  function TabBar({ activeTab, onChange }) {
    const tabs = [
      { id: 'home', label: 'Play', icon: <Icon.Home size={22} /> },
      { id: 'stats', label: 'Stats', icon: <Icon.Chart size={22} /> },
      { id: 'settings', label: 'Settings', icon: <Icon.Settings size={22} /> },
    ];
    return (
      <div className="tabbar">
        {tabs.map((t) => (
          <button key={t.id} className={`tab ${activeTab === t.id ? 'active' : ''}`} onClick={() => onChange(t.id)}>
            {t.icon}
            <span>{t.label}</span>
          </button>
        ))}
      </div>
    );
  }

  // ---------------- Stats Screen ----------------
  function StatsScreen({ activeTab, onOpenTab }) {
    const [levelTab, setLevelTab] = useState('medium');
    const data = {
      beginner: { played: 18, winRate: 100, best: '2:41', avg: '3:18', streak: 6 },
      easy:     { played: 42, winRate: 95, best: '5:47', avg: '6:52', streak: 4 },
      medium:   { played: 73, winRate: 81, best: '9:04', avg: '12:38', streak: 2 },
      hard:     { played: 22, winRate: 64, best: '14:22', avg: '22:10', streak: 1 },
      master:   { played: 4, winRate: 25, best: '—', avg: '—', streak: 0 },
    }[levelTab];

    // Recent times chart data (minutes)
    const recent = {
      beginner: [3.2, 3.5, 3.0, 2.8, 3.1, 2.9, 3.3, 2.8, 2.6, 2.7],
      easy:     [7.1, 6.8, 6.5, 6.2, 5.9, 6.1, 5.8, 5.7, 6.0, 5.8],
      medium:   [14.2, 13.1, 12.4, 15.8, 11.9, 12.2, 10.8, 11.5, 10.2, 9.1],
      hard:     [25.1, 23.2, 28.0, 21.5, 22.8, 19.4, 21.2, 20.1, 18.3, 16.7],
      master:   [48, 55, 42, 0, 0, 0, 0, 0, 0, 0],
    }[levelTab];

    return (
      <div className="screen">
        <div className="screen-body">
          <div className="stats-hero">
            <div className="section-label" style={{ padding: 0, marginBottom: 6 }}>Statistics</div>
            <div style={{ fontFamily: 'var(--font-serif)', fontSize: 32, fontWeight: 500, letterSpacing: '-0.02em', lineHeight: 1.05 }}>
              Your progress
            </div>
          </div>
          <div className="stats-tabs">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                className={`t ${levelTab === l.id ? 'active' : ''}`}
                onClick={() => setLevelTab(l.id)}
              >
                {l.name}
              </button>
            ))}
          </div>
          <div className="stats-grid">
            <StatCard l="Played" n={data.played} s="games" />
            <StatCard l="Win rate" n={`${data.winRate}%`} s={`${Math.round(data.played * data.winRate/100)} solved`} />
            <StatCard l="Best time" n={data.best} s="personal record" />
            <StatCard l="Average" n={data.avg} s="last 10 games" />
            <StatCard
              l="Current streak"
              n={<span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                {data.streak} <Icon.Flame size={18} style={{ color: 'var(--sumi)' }} />
              </span>}
              s={data.streak > 0 ? 'keep it going' : 'start fresh'}
              wide
            />
          </div>

          <div style={{ padding: '14px 20px 0' }}>
            <div className="stat-card chart-card">
              <div className="title">
                <span>Recent times</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--fg-subtle)' }}>LAST 10</span>
              </div>
              <RecentChart values={recent} />
            </div>
          </div>

          <div className="section-label">Achievements</div>
          <div className="achievements">
            <Ach unlocked icon={<Icon.Sparkles />} name="First win" />
            <Ach unlocked icon={<Icon.Flame />} name="7-day" />
            <Ach unlocked icon={<Icon.Clock />} name="Sub-10" />
            <Ach unlocked icon={<Icon.Target />} name="No mistake" />
            <Ach icon={<Icon.Trophy />} name="100 solved" />
            <Ach icon={<Icon.Star />} name="Master" />
            <Ach icon={<Icon.Lock />} name="30-day" />
            <Ach icon={<Icon.Lock />} name="Speed" />
          </div>
        </div>
        <TabBar activeTab={activeTab} onChange={onOpenTab} />
      </div>
    );
  }

  function StatCard({ l, n, s, wide }) {
    return (
      <div className={`stat-card ${wide ? 'wide' : ''}`}>
        <div className="l">{l}</div>
        <div className="n">{n}</div>
        <div className="s">{s}</div>
      </div>
    );
  }

  function Ach({ unlocked, icon, name }) {
    return (
      <div className={`ach ${unlocked ? 'unlocked' : 'locked'}`}>
        {icon}
        <div className="name">{name}</div>
      </div>
    );
  }

  function RecentChart({ values }) {
    const w = 300, h = 80, pad = 8;
    const vals = values.filter((v) => v > 0);
    if (vals.length === 0) return <div style={{ color: 'var(--fg-subtle)', fontSize: 12, padding: 20 }}>No games yet.</div>;
    const min = Math.min(...vals) * 0.9;
    const max = Math.max(...vals) * 1.05;
    const range = max - min || 1;
    const pts = values.map((v, i) => {
      const x = pad + (i / (values.length - 1)) * (w - pad * 2);
      const y = v > 0 ? h - pad - ((v - min) / range) * (h - pad * 2) : null;
      return { x, y, v };
    });
    const lineD = pts.filter(p => p.y != null).map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaD = lineD + ` L${pts.filter(p=>p.y!=null).slice(-1)[0].x},${h - pad} L${pts.find(p=>p.y!=null).x},${h - pad} Z`;
    return (
      <svg viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
        <path d={areaD} fill="var(--sumi-ghost)" />
        <path d={lineD} fill="none" stroke="var(--sumi)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        {pts.filter(p => p.y != null).map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill="var(--paper-0)" stroke="var(--sumi)" strokeWidth="1.5" />
        ))}
      </svg>
    );
  }

  // ---------------- Settings Screen ----------------
  function SettingsScreen({ activeTab, onOpenTab, settings, onChange, onResetStats }) {
    function toggle(k) { onChange({ ...settings, [k]: !settings[k] }); }
    function set(k, v) { onChange({ ...settings, [k]: v }); }
    return (
      <div className="screen">
        <div className="screen-body settings-body">
          <div className="home-header">
            <div className="greeting">Preferences</div>
            <div className="title">Settings</div>
          </div>

          <div className="settings-group">
            <div className="group-label">Appearance</div>
            <div className="row">
              <div>
                <div className="lbl">Theme</div>
                <div className="help">Match system, or override.</div>
              </div>
              <div className="seg-small">
                {['auto', 'light', 'dark'].map((t) => (
                  <button key={t} className={settings.theme === t ? 'active' : ''} onClick={() => set('theme', t)}>
                    {t === 'auto' ? 'System' : t[0].toUpperCase()+t.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            <div className="row">
              <div>
                <div className="lbl">Highlight same number</div>
                <div className="help">Tint cells that share the selected digit.</div>
              </div>
              <button className={`switch ${settings.highlightSame ? 'on' : ''}`} onClick={() => toggle('highlightSame')} />
            </div>
            <div className="row">
              <div>
                <div className="lbl">Highlight row · column · box</div>
                <div className="help">Shade the active unit softly.</div>
              </div>
              <button className={`switch ${settings.highlightUnit ? 'on' : ''}`} onClick={() => toggle('highlightUnit')} />
            </div>
          </div>

          <div className="settings-group">
            <div className="group-label">Gameplay</div>
            <div className="row">
              <div>
                <div className="lbl">Auto notes</div>
                <div className="help">Fill pencil marks automatically.</div>
              </div>
              <button className={`switch ${settings.autoNotes ? 'on' : ''}`} onClick={() => toggle('autoNotes')} />
            </div>
            <div className="row">
              <div>
                <div className="lbl">Mistake limit</div>
                <div className="help">Game ends after three wrong entries.</div>
              </div>
              <button className={`switch ${settings.mistakeLimit ? 'on' : ''}`} onClick={() => toggle('mistakeLimit')} />
            </div>
            <div className="row">
              <div>
                <div className="lbl">Sound</div>
                <div className="help">Tap and place tones.</div>
              </div>
              <button className={`switch ${settings.sound ? 'on' : ''}`} onClick={() => toggle('sound')} />
            </div>
          </div>

          <div className="settings-group">
            <div className="group-label">Data</div>
            <div className="row danger" onClick={onResetStats} style={{ cursor: 'pointer' }}>
              <div>
                <div className="lbl">Reset statistics</div>
                <div className="help">Clears all saved times and streaks.</div>
              </div>
              <Icon.ChevronRight size={18} />
            </div>
          </div>

          <div style={{ padding: '24px 20px', textAlign: 'center', color: 'var(--fg-subtle)', fontSize: 11, letterSpacing: '0.04em' }}>
            Sudoku · built on Kaya · v1.0
          </div>
        </div>
        <TabBar activeTab={activeTab} onChange={onOpenTab} />
      </div>
    );
  }

  // ---------------- Win Screen ----------------
  function WinScreen({ stats, onNext, onReplay, onHome }) {
    return (
      <div className="screen">
        <div className="win-screen">
          <div className="ink-wash" />
          <div className="eyebrow">Solved</div>
          <h1>Well done.</h1>
          <div className="sub">{window.LEVEL_BY_ID[stats.level].name} · {window.LEVEL_BY_ID[stats.level].kanji}</div>

          <div className="win-stats">
            <div className="cell-stat">
              <div className="n">{stats.time}</div>
              <div className="l">Time</div>
            </div>
            <div className="cell-stat">
              <div className="n">{stats.mistakes}</div>
              <div className="l">Mistakes</div>
            </div>
            <div className="cell-stat">
              <div className="n">{stats.hints}</div>
              <div className="l">Hints</div>
            </div>
            <div className="cell-stat">
              <div className="n">{stats.best ? 'NEW' : '—'}</div>
              <div className="l">{stats.best ? 'Best time' : 'Personal'}</div>
            </div>
          </div>

          {stats.badge && (
            <div className="badge-unlock">
              <Icon.Sparkles size={14} />
              Achievement unlocked · {stats.badge}
            </div>
          )}

          <div className="actions">
            <button className="btn-block primary" onClick={onNext}>Next puzzle</button>
            <button className="btn-block ghost" onClick={onReplay}>Play again</button>
            <button className="btn-block ghost" onClick={onHome}>Back to home</button>
          </div>
        </div>
      </div>
    );
  }

  window.HomeScreen = HomeScreen;
  window.StatsScreen = StatsScreen;
  window.SettingsScreen = SettingsScreen;
  window.WinScreen = WinScreen;
  window.TabBar = TabBar;
})();
