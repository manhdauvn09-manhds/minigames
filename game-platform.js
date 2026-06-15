/**
 * GamePlatform v2.0 — Shared Shell + Overlay framework
 *
 *  - Phone-style status bar (clock, signal bars, wifi, battery)
 *  - Top + Bottom 30px ad slots
 *  - Footer with copyright + fullscreen toggle
 *  - Responsive: mobile / tablet / desktop, auto-fit stage
 *  - IndexedDB-backed local storage (history, top, profile, adv, pause)
 *  - Auto language: ja → 日本語, vi → Tiếng Việt, else → English
 *  - Google Identity Services login (CLIENT_ID via meta tag or window.GP_CONFIG)
 *  - Server sync: POST /api/score, GET /api/leaderboard?game=xxx
 *  - Backwards-compatible API: GamePlatform.init / pause / recordResult / showHome
 *
 * Mobile-friendly: pure web, no native dependency. Wrap in WebView later.
 */
(function () {
  'use strict';

  // ── Config (read from <meta> tags or window.GP_CONFIG, with safe defaults) ──
  function _meta(name, def) {
    const m = document.querySelector(`meta[name="${name}"]`);
    const val = (m && m.content) || def || '';
    if (name === 'gp-google-client-id') {
      console.log('[GamePlatform] gp-google-client-id meta:', m ? 'found' : 'NOT FOUND', 'value:', val.substring(0, 20) + '...');
    }
    return val;
  }
  const CFG = Object.assign({
    googleClientId: _meta('gp-google-client-id', ''),
    apiBase:        _meta('gp-api-base', ''),    // empty → no server sync
    siteName:       'allin1site.com',
    adTopHtml:      '',                          // optional ad HTML (empty = placeholder)
    adBotHtml:      '',
    // ── Interstitial ad after each level ──
    // Default OFF. Set enabled=true when you have an ad provider (e.g. AdSense).
    // providerHtml: raw HTML/JS to inject (e.g. <ins class="adsbygoogle">…</ins><script>…push({})</script>)
    interstitialAd: {
      enabled:      false,
      durationMs:   15000,
      skipAfterMs:  5000,
      providerHtml: '',
    },
    // ── Online presence tracking ──
    heartbeatMs:    30000,   // ping every 30s while game running
  }, window.GP_CONFIG || {});

  console.log('[GamePlatform] Initialized with config:', {
    googleClientId: CFG.googleClientId ? CFG.googleClientId.substring(0, 20) + '...' : 'EMPTY/NOT SET',
    apiBase: CFG.apiBase,
  });

  const MAX_HISTORY = 50;
  const MAX_TOP     = 10;
  const DB_NAME     = 'gp_local_v1';
  const DB_VERSION  = 1;

  // ── i18n: en / ja / vi ───────────────────────────────────────────────────
  const I18N = {
    en: {
      backHub: '⬅ Hub', signIn: '🔑 Sign In',
      langNext: '日本語',
      continueNorm: '▶ Continue (Normal)', continueLv: lv => `▶ Continue (Lv ${lv})`,
      tabNormal: '🏅 Normal', tabAdv: '⚔️ Adventure',
      playNormal: '▶ Play', modeHint: 'Play freely. Scores & history saved locally.',
      playAdv: lv => `⚔️ Play Level ${lv}`,
      btnHistory: '📜 History', btnTop: '🏆 Top', btnHowto: '❓ How to Play',
      btnLeaderboard: '🌐 Online', btnAwards: '🏅 Awards',
      achTitle: 'Achievements', achUnlocked: '🏅 Achievement Unlocked!',
      profileTitle: '👤 Profile', back: '← Back',
      signOut: 'Sign Out', guestHint: 'Play as guest or sign in with Google.',
      namePlaceholder: 'Your name (max 20 chars)', playGuest: 'Play as Guest',
      orDivider: '— or —',
      signInGoogle: 'Sign in with Google',
      histTitle: '📜 My History', clearHist: '🗑 Clear History',
      noHist: 'No history yet. Play a game!',
      topTitle: '🏆 Top (Local)', clearTop: '🗑 Clear Top',
      noTop: 'No scores yet — be the first!',
      ldbTitle: '🌐 Top Online', ldbTabAll: 'All-time', ldbTabWeek: 'This Week',
      ldbOffline: 'Online leaderboard unavailable.',
      ldbLoading: 'Loading top players…',
      howtoTitle: '❓ How to Play',
      langEN: '🇺🇸 English', langJA: '🇯🇵 日本語', langVI: '🇻🇳 Tiếng Việt',
      cleared: lv => `Level ${lv} Clear!`, failed: lv => `Level ${lv} — Failed`, done: lv => `Level ${lv} Done!`,
      gameOver: 'Game Over', scoreLabel: 'Score',
      rankNew: '🥇 New Best!', rankTop: n => `#${n} in Top`,
      nextLv: lv => `▶ Level ${lv}`, retryLv: lv => `🔄 Retry Level ${lv}`, playAgain: '🔄 Play Again',
      homeBtn: '🏠 Home', shareScore: '📤 Share Score',
      fsEnter: 'Fullscreen', fsExit: 'Exit Fullscreen',
      copyright: y => `© ${y} allin1site.com — All rights reserved.`,
      youAtRank: r => `You are ranked #${r}`,
      saving: 'Saving…',
      saved: 'Saved to cloud',
      saveFail: 'Saved locally (cloud unavailable)',
    },
    ja: {
      backHub: '⬅ ハブへ', signIn: '🔑 サインイン',
      langNext: 'Tiếng Việt',
      continueNorm: '▶ 続ける (ノーマル)', continueLv: lv => `▶ 続ける (Lv ${lv})`,
      tabNormal: '🏅 ノーマル', tabAdv: '⚔️ アドベンチャー',
      playNormal: '▶ プレイ', modeHint: '自由にプレイ。スコアと履歴はローカルに保存されます。',
      playAdv: lv => `⚔️ レベル ${lv} をプレイ`,
      btnHistory: '📜 履歴', btnTop: '🏆 トップ', btnHowto: '❓ 遊び方',
      btnLeaderboard: '🌐 オンライン', btnAwards: '🏅 実績',
      achTitle: '実績', achUnlocked: '🏅 実績を解除！',
      profileTitle: '👤 プロフィール', back: '← 戻る',
      signOut: 'サインアウト', guestHint: 'ゲストとしてプレイするか、Googleでサインインしよう。',
      namePlaceholder: 'お名前（最大20文字）', playGuest: 'ゲストでプレイ',
      orDivider: '— または —',
      signInGoogle: 'Googleでサインイン',
      histTitle: '📜 プレイ履歴', clearHist: '🗑 履歴を削除',
      noHist: 'まだ履歴がありません。ゲームを始めよう！',
      topTitle: '🏆 トップ（ローカル）', clearTop: '🗑 削除',
      noTop: 'まだスコアなし — 最初の挑戦者になろう！',
      ldbTitle: '🌐 オンライントップ', ldbTabAll: '総合', ldbTabWeek: '今週',
      ldbOffline: 'オンラインランキング利用不可。',
      ldbLoading: 'ロード中…',
      howtoTitle: '❓ 遊び方',
      langEN: '🇺🇸 English', langJA: '🇯🇵 日本語', langVI: '🇻🇳 Tiếng Việt',
      cleared: lv => `レベル ${lv} クリア！`, failed: lv => `レベル ${lv} — 失敗`, done: lv => `レベル ${lv} 完了`,
      gameOver: 'ゲームオーバー', scoreLabel: 'スコア',
      rankNew: '🥇 自己ベスト更新！', rankTop: n => `トップ ${n} 位`,
      nextLv: lv => `▶ レベル ${lv}`, retryLv: lv => `🔄 レベル ${lv} 再挑戦`, playAgain: '🔄 もう一度',
      homeBtn: '🏠 ホーム', shareScore: '📤 シェア',
      fsEnter: '全画面', fsExit: '全画面終了',
      copyright: y => `© ${y} allin1site.com — 無断複製禁止`,
      youAtRank: r => `あなたは ${r} 位`,
      saving: '保存中…',
      saved: 'クラウドに保存',
      saveFail: 'ローカル保存（クラウド利用不可）',
    },
    vi: {
      backHub: '⬅ Trang chủ', signIn: '🔑 Đăng nhập',
      langNext: 'English',
      continueNorm: '▶ Tiếp tục (Thường)', continueLv: lv => `▶ Tiếp tục (Cấp ${lv})`,
      tabNormal: '🏅 Thường', tabAdv: '⚔️ Phiêu Lưu',
      playNormal: '▶ Chơi', modeHint: 'Chơi tự do. Điểm và lịch sử lưu trên máy.',
      playAdv: lv => `⚔️ Chơi Cấp ${lv}`,
      btnHistory: '📜 Lịch sử', btnTop: '🏆 Top', btnHowto: '❓ Cách chơi',
      btnLeaderboard: '🌐 Online', btnAwards: '🏅 Thành tích',
      achTitle: 'Thành tích', achUnlocked: '🏅 Mở khóa thành tích!',
      profileTitle: '👤 Hồ sơ', back: '← Quay lại',
      signOut: 'Đăng xuất', guestHint: 'Chơi không cần đăng nhập hoặc dùng Google.',
      namePlaceholder: 'Tên của bạn (tối đa 20 ký tự)', playGuest: 'Chơi không đăng nhập',
      orDivider: '— hoặc —',
      signInGoogle: 'Đăng nhập với Google',
      histTitle: '📜 Lịch sử của tôi', clearHist: '🗑 Xóa lịch sử',
      noHist: 'Chưa có lịch sử. Bắt đầu chơi nào!',
      topTitle: '🏆 Top (Máy này)', clearTop: '🗑 Xóa Top',
      noTop: 'Chưa có điểm — bạn là người đầu tiên!',
      ldbTitle: '🌐 Top Online', ldbTabAll: 'Tổng', ldbTabWeek: 'Tuần này',
      ldbOffline: 'Không kết nối được bảng xếp hạng.',
      ldbLoading: 'Đang tải top…',
      howtoTitle: '❓ Cách chơi',
      langEN: '🇺🇸 English', langJA: '🇯🇵 日本語', langVI: '🇻🇳 Tiếng Việt',
      cleared: lv => `Hoàn thành Cấp ${lv}!`, failed: lv => `Cấp ${lv} — Thất bại`, done: lv => `Cấp ${lv} xong!`,
      gameOver: 'Game Over', scoreLabel: 'Điểm',
      rankNew: '🥇 Kỷ lục mới!', rankTop: n => `Hạng ${n}`,
      nextLv: lv => `▶ Cấp ${lv}`, retryLv: lv => `🔄 Thử lại Cấp ${lv}`, playAgain: '🔄 Chơi lại',
      homeBtn: '🏠 Trang chính', shareScore: '📤 Chia sẻ',
      fsEnter: 'Toàn màn hình', fsExit: 'Thoát toàn màn hình',
      copyright: y => `© ${y} allin1site.com — Mọi quyền được bảo lưu.`,
      youAtRank: r => `Bạn xếp hạng #${r}`,
      saving: 'Đang lưu…',
      saved: 'Đã lưu cloud',
      saveFail: 'Lưu cục bộ (cloud lỗi)',
    },
  };

  function _detectLang() {
    const saved = localStorage.getItem('gp_lang');
    if (saved && I18N[saved]) return saved;
    const nav = (navigator.language || 'en').toLowerCase();
    if (nav.startsWith('ja')) return 'ja';
    if (nav.startsWith('vi')) return 'vi';
    return 'en';
  }
  let _lang = _detectLang();
  const _T = key => (I18N[_lang] && I18N[_lang][key]) || I18N.en[key] || key;
  function _setLang(l) {
    if (!I18N[l]) return;
    _lang = l;
    localStorage.setItem('gp_lang', l);
    _showHome();
  }
  function _cycleLang() {
    const order = ['en','ja','vi'];
    _setLang(order[(order.indexOf(_lang) + 1) % order.length]);
  }

  // ── Dark / Light Mode ────────────────────────────────────────────────────
  let _theme = 'auto'; // 'auto' | 'dark' | 'light'
  function _initTheme() {
    const saved = localStorage.getItem('gp_theme');
    _theme = (saved && ['auto','dark','light'].includes(saved)) ? saved : 'auto';
    _applyTheme();
  }
  function _applyTheme() {
    const toApply = _theme;
    if (toApply === 'auto') {
      document.documentElement.removeAttribute('data-theme');
    } else {
      document.documentElement.setAttribute('data-theme', toApply);
    }
    localStorage.setItem('gp_theme', _theme);
  }
  function _cycleTheme() {
    const order = ['auto', 'dark', 'light'];
    _theme = order[(order.indexOf(_theme) + 1) % order.length];
    _applyTheme();
  }
  function _getThemeIcon() {
    if (_theme === 'light') return '☀️';
    if (_theme === 'dark') return '🌙';
    return '⚙️'; // auto
  }

  // ── Sound FX (Web Audio, synthesized — zero asset files) ──────────────────
  const _Sound = (() => {
    let ctx = null;
    let on = (localStorage.getItem('gp_sound') || 'on') !== 'off';
    function _ctx() {
      if (!ctx) {
        const AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try { ctx = new AC(); } catch { return null; }
      }
      if (ctx.state === 'suspended') ctx.resume().catch(() => {});
      return ctx;
    }
    function _tone(freq, dur, type, when, gain) {
      const c = _ctx(); if (!c) return;
      const t0 = c.currentTime + (when || 0);
      const osc = c.createOscillator();
      const g = c.createGain();
      osc.type = type || 'sine';
      osc.frequency.setValueAtTime(freq, t0);
      g.gain.setValueAtTime(0.0001, t0);
      g.gain.exponentialRampToValueAtTime(gain || 0.15, t0 + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
      osc.connect(g); g.connect(c.destination);
      osc.start(t0); osc.stop(t0 + dur + 0.03);
    }
    const SEQ = {
      click:   () => _tone(660, 0.06, 'square', 0, 0.07),
      win:     () => { _tone(523,0.12,'sine',0,0.16); _tone(659,0.12,'sine',0.10,0.16); _tone(784,0.24,'sine',0.20,0.18); },
      lose:    () => { _tone(330,0.18,'sawtooth',0,0.12); _tone(247,0.30,'sawtooth',0.15,0.12); },
      levelup: () => { _tone(523,0.09,'sine',0,0.15); _tone(659,0.09,'sine',0.08,0.15); _tone(784,0.09,'sine',0.16,0.15); _tone(1047,0.22,'sine',0.24,0.18); },
      coin:    () => { _tone(988,0.07,'square',0,0.12); _tone(1319,0.14,'square',0.07,0.12); },
      badge:   () => { _tone(784,0.10,'triangle',0,0.16); _tone(988,0.10,'triangle',0.10,0.16); _tone(1319,0.28,'triangle',0.20,0.18); },
    };
    function play(name) { if (!on) return; const f = SEQ[name]; if (f) { try { f(); } catch {} } }
    function toggle() { on = !on; try { localStorage.setItem('gp_sound', on ? 'on' : 'off'); } catch {} if (on) play('click'); return on; }
    function isOn() { return on; }
    function icon() { return on ? '🔊' : '🔇'; }
    return { play, toggle, isOn, icon };
  })();

  // ── Achievements catalog (local-first, cross-game) ────────────────────────
  const _ACHIEVEMENTS = [
    { id:'first_win', icon:'🎮',
      name:{en:'First Steps',vi:'Bước Đầu',ja:'はじめの一歩'},
      desc:{en:'Play your first game',vi:'Chơi game đầu tiên',ja:'初プレイ達成'},
      check:c=>c.plays>=1 },
    { id:'games_10', icon:'🕹️',
      name:{en:'Getting Hooked',vi:'Nghiện Nhẹ',ja:'ハマってきた'},
      desc:{en:'Play 10 games total',vi:'Chơi tổng cộng 10 ván',ja:'通算10プレイ'},
      check:c=>c.plays>=10 },
    { id:'games_50', icon:'🎯',
      name:{en:'Dedicated',vi:'Tận Tâm',ja:'やり込み'},
      desc:{en:'Play 50 games total',vi:'Chơi tổng cộng 50 ván',ja:'通算50プレイ'},
      check:c=>c.plays>=50 },
    { id:'games_100', icon:'💯',
      name:{en:'Century',vi:'Trăm Trận',ja:'百戦錬磨'},
      desc:{en:'Play 100 games total',vi:'Chơi tổng cộng 100 ván',ja:'通算100プレイ'},
      check:c=>c.plays>=100 },
    { id:'score_1k', icon:'⭐',
      name:{en:'Four Figures',vi:'Nghìn Điểm',ja:'四桁突破'},
      desc:{en:'Score 1,000+ in any game',vi:'Đạt 1.000+ điểm một ván',ja:'1ゲームで1,000点以上'},
      check:c=>c.best>=1000 },
    { id:'score_10k', icon:'🌟',
      name:{en:'High Roller',vi:'Cao Thủ',ja:'ハイスコアラー'},
      desc:{en:'Score 10,000+ in any game',vi:'Đạt 10.000+ điểm một ván',ja:'1ゲームで10,000点以上'},
      check:c=>c.best>=10000 },
    { id:'score_50k', icon:'💫',
      name:{en:'Legendary',vi:'Huyền Thoại',ja:'伝説級'},
      desc:{en:'Score 50,000+ in any game',vi:'Đạt 50.000+ điểm một ván',ja:'1ゲームで50,000点以上'},
      check:c=>c.best>=50000 },
    { id:'lvl_5', icon:'🏅',
      name:{en:'Rising Star',vi:'Sao Mới',ja:'のぼり調子'},
      desc:{en:'Clear Adventure Level 5',vi:'Qua Cấp 5 chế độ Phiêu Lưu',ja:'アドベンチャーLv5クリア'},
      check:c=>c.maxLevel>=5 },
    { id:'lvl_15', icon:'🥈',
      name:{en:'Veteran',vi:'Lão Làng',ja:'熟練者'},
      desc:{en:'Clear Adventure Level 15',vi:'Qua Cấp 15 chế độ Phiêu Lưu',ja:'アドベンチャーLv15クリア'},
      check:c=>c.maxLevel>=15 },
    { id:'finisher', icon:'🏆',
      name:{en:'The Finisher',vi:'Phá Đảo',ja:'完全制覇'},
      desc:{en:'Finish all levels of a game',vi:'Hoàn thành mọi cấp của một game',ja:'全レベルクリア'},
      check:c=>!!c.finishedGame },
    { id:'night_owl', icon:'🦉',
      name:{en:'Night Owl',vi:'Cú Đêm',ja:'夜更かし'},
      desc:{en:'Play between midnight and 5am',vi:'Chơi trong khoảng 0–5h sáng',ja:'深夜0〜5時にプレイ'},
      check:c=>c.hour>=0&&c.hour<5 },
    { id:'polyglot', icon:'🌍',
      name:{en:'Polyglot',vi:'Đa Ngữ',ja:'多言語'},
      desc:{en:'Play in all 3 languages',vi:'Chơi đủ 3 ngôn ngữ',ja:'3言語すべてでプレイ'},
      check:c=>['en','vi','ja'].every(l=>c.langs.includes(l)) },
    { id:'streak_3', icon:'🔥',
      name:{en:'On Fire',vi:'Bốc Cháy',ja:'絶好調'},
      desc:{en:'Reach a 3-day streak',vi:'Đạt chuỗi 3 ngày',ja:'3日連続プレイ'},
      check:c=>c.streak>=3 },
    { id:'streak_7', icon:'⚡',
      name:{en:'Unstoppable',vi:'Bất Bại',ja:'止まらない'},
      desc:{en:'Reach a 7-day streak',vi:'Đạt chuỗi 7 ngày',ja:'7日連続プレイ'},
      check:c=>c.streak>=7 },
  ];
  function _getGStats() { return _getC('gp_global_stats', { plays:0, best:0, maxLevel:0, langs:[] }); }
  function _getAch()    { return _getC('gp_global_achievements', { unlocked:{} }); }
  async function _updateGlobalStats(score, clearedAdvLevel) {
    const s = Object.assign({ plays:0, best:0, maxLevel:0, langs:[] }, _getGStats());
    s.plays += 1;
    s.best = Math.max(s.best || 0, score || 0);
    if (clearedAdvLevel != null) s.maxLevel = Math.max(s.maxLevel || 0, clearedAdvLevel);
    if (!s.langs.includes(_lang)) s.langs = s.langs.concat(_lang);
    await _setC('gp_global_stats', s);
    return s;
  }
  async function _checkAchievements(ctx) {
    const ach = Object.assign({ unlocked:{} }, _getAch());
    ach.unlocked = Object.assign({}, ach.unlocked);
    const newly = [];
    for (const a of _ACHIEVEMENTS) {
      if (ach.unlocked[a.id]) continue;
      let ok = false;
      try { ok = !!a.check(ctx); } catch {}
      if (ok) { ach.unlocked[a.id] = Date.now(); newly.push(a); }
    }
    if (newly.length) {
      await _setC('gp_global_achievements', ach);
      newly.forEach((a, i) => setTimeout(() => { _achToast(a); _Sound.play('badge'); }, i * 1300));
    }
    return newly;
  }
  function _achToast(a) {
    if (!_stageEl) return;
    const name = a.name[_lang] || a.name.en;
    const t = _el('div', 'gp-toast gp-ach-toast',
      `<span class="gp-ach-ic">${a.icon}</span><span class="gp-ach-tx"><b>${_T('achUnlocked')}</b><br>${_esc(name)}</span>`);
    _stageEl.appendChild(t);
    setTimeout(() => t.remove(), 3800);
  }
  function _badgesPreviewHtml() {
    const ach = _getAch();
    const unlocked = _ACHIEVEMENTS.filter(a => ach.unlocked && ach.unlocked[a.id]);
    const icons = unlocked.slice(0, 6).map(a => `<span class="gp-bp-ic">${a.icon}</span>`).join('')
                || `<span class="gp-bp-ic" style="opacity:.4">🔒</span>`;
    return `<button class="gp-badges-preview" id="gpBadgesPrev">
      <span class="gp-bp-row">${icons}</span>
      <span class="gp-bp-label">🏅 ${_T('achTitle')} ${unlocked.length}/${_ACHIEVEMENTS.length} ›</span>
    </button>`;
  }
  function _showAchievements() {
    _Sound.play('click');
    const ach = _getAch();
    const n = Object.keys(ach.unlocked || {}).length;
    const total = _ACHIEVEMENTS.length;
    const screen = _el('div', 'gp-screen');
    screen.innerHTML = `
      <div class="gp-topbar">
        <button class="gp-back-btn" id="gpAchBack">${_T('back')}</button>
        <h2>${_T('achTitle')} <span style="opacity:.55;font-size:.78em;font-weight:600">${n}/${total}</span></h2>
        <span style="width:54px"></span>
      </div>
      <div class="gp-ach-grid">
        ${_ACHIEVEMENTS.map(a => {
          const got = !!(ach.unlocked && ach.unlocked[a.id]);
          return `<div class="gp-ach-card ${got ? 'got' : 'locked'}">
            <div class="gp-ach-card-ic">${got ? a.icon : '🔒'}</div>
            <div class="gp-ach-card-nm">${_esc(a.name[_lang] || a.name.en)}</div>
            <div class="gp-ach-card-ds">${_esc(a.desc[_lang] || a.desc.en)}</div>
          </div>`;
        }).join('')}
      </div>
    `;
    _showScreen(screen);
    screen.querySelector('#gpAchBack').onclick = _showHome;
  }

  // ── Runtime state ────────────────────────────────────────────────────────
  let _cfg = null, _gid = '', _prof = null;
  let _mode = 'normal', _level = 0;
  let _cbs = {};
  let _shellEl = null, _stageEl = null, _stageInner = null, _overlay = null;

  // ── IndexedDB wrapper (with localStorage fallback) ───────────────────────
  let _db = null, _dbReady = null;
  function _openDB() {
    if (_dbReady) return _dbReady;
    _dbReady = new Promise((resolve) => {
      if (!('indexedDB' in window)) { resolve(null); return; }
      const req = indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = (e) => {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('kv')) db.createObjectStore('kv');
      };
      req.onsuccess = () => { _db = req.result; resolve(_db); };
      req.onerror   = () => resolve(null);
    });
    return _dbReady;
  }
  async function _idbGet(key) {
    const db = await _openDB();
    if (!db) { try { const v = localStorage.getItem(key); return v != null ? JSON.parse(v) : null; } catch { return null; } }
    return new Promise((res) => {
      const tx = db.transaction('kv', 'readonly');
      const r = tx.objectStore('kv').get(key);
      r.onsuccess = () => res(r.result == null ? null : r.result);
      r.onerror   = () => res(null);
    });
  }
  async function _idbSet(key, val) {
    const db = await _openDB();
    if (!db) { try { localStorage.setItem(key, JSON.stringify(val)); } catch {} return; }
    return new Promise((res) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').put(val, key);
      tx.oncomplete = () => res(); tx.onerror = () => res();
    });
  }
  async function _idbDel(key) {
    const db = await _openDB();
    if (!db) { try { localStorage.removeItem(key); } catch {} return; }
    return new Promise((res) => {
      const tx = db.transaction('kv', 'readwrite');
      tx.objectStore('kv').delete(key);
      tx.oncomplete = () => res(); tx.onerror = () => res();
    });
  }

  // Cached sync facade (load on init, write-through to IDB)
  const _cache = new Map();
  async function _loadAll(keys) {
    await Promise.all(keys.map(async k => _cache.set(k, await _idbGet(k))));
  }
  function _getC(key, def) { const v = _cache.get(key); return v == null ? def : v; }
  async function _setC(key, val) { _cache.set(key, val); await _idbSet(key, val); }
  async function _delC(key) { _cache.delete(key); await _idbDel(key); }

  // ── Storage keys ─────────────────────────────────────────────────────────
  const _uid  = () => _prof ? _prof.id : 'guest';
  const _ukey = s => `gp_${_gid}_${_uid()}_${s}`;
  const _gkey = s => `gp_${_gid}_${s}`;

  // ── Profile ──────────────────────────────────────────────────────────────
  async function _loadProfile() { _prof = _getC('gp_global_profile', null); }
  async function _saveProfile(p) { _prof = p; await _setC('gp_global_profile', p); _syncUserToServer(); }
  function _guestProf(name) {
    const n = (name || 'Player').trim().slice(0, 20);
    return {
      id: 'guest_' + (n.replace(/\W/g,'').toLowerCase().slice(0,12) || 'player'),
      name: n, avatar: '👤', type: 'guest',
    };
  }

  // ── History / Top (local) ────────────────────────────────────────────────
  function _getHistory() { return _getC(_ukey('history'), []); }
  async function _addHistory(e) {
    const h = _getHistory().slice();
    h.unshift({ ...e, date: Date.now() });
    if (h.length > MAX_HISTORY) h.length = MAX_HISTORY;
    await _setC(_ukey('history'), h);
  }
  function _getTop() { return _getC(_gkey('top'), []); }
  async function _addTop(e) {
    const t = _getTop().slice();
    t.push({ ...e, player: _prof ? _prof.name : 'Guest', date: Date.now() });
    t.sort((a,b) => b.score - a.score);
    if (t.length > MAX_TOP) t.length = MAX_TOP;
    await _setC(_gkey('top'), t);
  }

  // ── Adventure progress ───────────────────────────────────────────────────
  function _getAdv()  { return _getC(_ukey('adv'), { currentLevel:0, maxUnlocked:0, completed:[] }); }
  async function _saveAdv(a) { await _setC(_ukey('adv'), a); }

  // ── Pause ────────────────────────────────────────────────────────────────
  async function _savePause(snapshot) {
    await _setC(_ukey('paused'), { snapshot, mode:_mode, level:_level, ts:Date.now() });
  }
  function _loadPause()  { return _getC(_ukey('paused'), null); }
  async function _clearPause() { await _delC(_ukey('paused')); }

  // ── Utility ──────────────────────────────────────────────────────────────
  function _el(tag, cls, html) {
    const e = document.createElement(tag);
    if (cls)  e.className = cls;
    if (html != null) e.innerHTML = html;
    return e;
  }
  function _fmtDate(ts) {
    const d = new Date(ts);
    const locale = _lang === 'ja' ? 'ja-JP' : (_lang === 'vi' ? 'vi-VN' : 'en-US');
    return d.toLocaleDateString(locale, { month: 'short', day: 'numeric' })
         + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  }
  function _esc(s) {
    return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
                    .replace(/"/g,'&quot;').replace(/'/g,'&#39;');
  }
  function _toast(msg) {
    if (!_stageEl) return;
    const t = _el('div', 'gp-toast', _esc(msg));
    _stageEl.appendChild(t);
    setTimeout(() => t.remove(), 3200);
  }

  // ── Server sync (best-effort) ────────────────────────────────────────────
  function _hasApi() { return !!CFG.apiBase; }
  async function _api(path, opts = {}) {
    if (!_hasApi()) throw new Error('no-api');
    const url = CFG.apiBase.replace(/\/$/, '') + path;
    const init = { method: opts.method || 'GET', headers: { 'Content-Type': 'application/json' } };
    if (opts.body) init.body = JSON.stringify(opts.body);
    if (_prof && _prof.googleIdToken) init.headers['Authorization'] = 'Bearer ' + _prof.googleIdToken;
    const r = await fetch(url, init);
    if (!r.ok) throw new Error('api-' + r.status);
    return r.json();
  }
  async function _syncUserToServer() {
    if (!_hasApi() || !_prof) return;
    try {
      await _api('/api/user', { method: 'POST', body: {
        userId: _prof.id, name: _prof.name, email: _prof.email || null, type: _prof.type
      }});
    } catch {}
  }
  // ── Visitor tracker (session + pageview) ─────────────────────────────────
  const _tracker = (() => {
    function uuid() {
      return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = Math.random() * 16 | 0;
        return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
      });
    }
    function getSid() {
      let sid = sessionStorage.getItem('_tr_sid');
      if (!sid) { sid = uuid(); sessionStorage.setItem('_tr_sid', sid); }
      return sid;
    }
    const sid = getSid();
    function send(type) {
      if (!_hasApi()) return;
      const url = CFG.apiBase.replace(/\/$/, '') + '/api/track';
      const payload = { type, sid };
      if (_gid) payload.game = _gid;
      fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      }).catch(() => {});
    }
    return { send, sid };
  })();

  // ── Heartbeat (online presence) ──────────────────────────────────────────
  let _heartbeatTimer = null;
  function _startHeartbeat() {
    if (!_hasApi() || !_gid) return;
    _stopHeartbeat();
    const ping = () => {
      _api('/api/heartbeat', { method: 'POST', body: { game: _gid, userId: _uid() } }).catch(() => {});
    };
    ping();
    _heartbeatTimer = setInterval(ping, Math.max(10000, CFG.heartbeatMs || 30000));
  }
  function _stopHeartbeat() {
    if (_heartbeatTimer) { clearInterval(_heartbeatTimer); _heartbeatTimer = null; }
  }

  async function _postScore(score, level, mode, extra) {
    if (!_hasApi()) return false;
    try {
      await _api('/api/score', { method: 'POST', body: {
        game: _gid, userId: _uid(), name: _prof ? _prof.name : 'Guest',
        email: _prof && _prof.email || null,
        score, level, mode, extra: extra || null
      }});
      return true;
    } catch { return false; }
  }
  async function _fetchLeaderboard(period) {
    if (!_hasApi()) return null;
    try {
      const data = await _api('/api/leaderboard?game=' + encodeURIComponent(_gid) + '&period=' + (period || 'all'));
      return data.rows || [];
    } catch { return null; }
  }

  // ── Shell construction ───────────────────────────────────────────────────
  function _buildShell() {
    if (document.querySelector('.gp-shell')) {
      _shellEl    = document.querySelector('.gp-shell');
      _stageEl    = document.querySelector('.gp-stage');
      _stageInner = document.querySelector('.gp-stage-inner');
      return;
    }
    const shell = _el('div', 'gp-shell');
    shell.innerHTML = `
      <div class="gp-statusbar" id="gpStatusBar">
        <div class="gp-sb-left">
          <span class="gp-sb-time" id="gpClock">--:--</span>
          <span class="gp-sb-icon">📶</span>
          <span class="gp-sb-bars" id="gpBars"><span></span><span></span><span></span><span></span></span>
        </div>
        <div class="gp-sb-right">
          <span class="gp-sb-wifi" id="gpWifi" title="Network"></span>
          <span class="gp-sb-batt" id="gpBatt"><i id="gpBattLevel" style="width:80%"></i></span>
        </div>
      </div>
      <div class="gp-ad gp-ad-top"><div class="gp-ad-inner" id="gpAdTop">${CFG.adTopHtml || 'Ad space'}</div></div>
      <div class="gp-stage" id="gpStage">
        <div class="gp-stage-inner" id="gpStageInner"></div>
      </div>
      <div class="gp-ad gp-ad-bot"><div class="gp-ad-inner" id="gpAdBot">${CFG.adBotHtml || 'Ad space'}</div></div>
      <div class="gp-footer">
        <span id="gpFootCopy">${_T('copyright')(new Date().getFullYear())}</span>
        <button class="gp-fs-btn" id="gpFsBtn">⛶ ${_T('fsEnter')}</button>
      </div>
    `;
    document.body.appendChild(shell);
    _shellEl    = shell;
    _stageEl    = shell.querySelector('#gpStage');
    _stageInner = shell.querySelector('#gpStageInner');

    // Move pre-existing body content into stage-inner so existing games still render
    const movables = Array.from(document.body.children).filter(n => n !== shell && n.tagName !== 'SCRIPT');
    movables.forEach(n => _stageInner.appendChild(n));

    _initStatusBar();
    _initFullscreen();
  }

  // ── Status bar live updates ──────────────────────────────────────────────
  function _initStatusBar() {
    const tickClock = () => {
      const d = new Date();
      const hh = String(d.getHours()).padStart(2,'0');
      const mm = String(d.getMinutes()).padStart(2,'0');
      const c = document.getElementById('gpClock');
      if (c) c.textContent = `${hh}:${mm}`;
    };
    tickClock();
    setInterval(tickClock, 15000);

    const updateNet = () => {
      const wifi = document.getElementById('gpWifi');
      const bars = document.getElementById('gpBars');
      if (!wifi || !bars) return;
      const online = navigator.onLine;
      wifi.classList.toggle('off', !online);
      let lvl = online ? 4 : 0;
      const c = navigator.connection;
      if (c && c.effectiveType) {
        if (c.effectiveType === '4g') lvl = 4;
        else if (c.effectiveType === '3g') lvl = 3;
        else if (c.effectiveType === '2g') lvl = 2;
        else lvl = 1;
      }
      bars.className = 'gp-sb-bars lvl-' + Math.max(0, 4 - lvl);
    };
    updateNet();
    window.addEventListener('online', updateNet);
    window.addEventListener('offline', updateNet);
    if (navigator.connection) navigator.connection.addEventListener('change', updateNet);

    if (navigator.getBattery) {
      navigator.getBattery().then(b => {
        const upd = () => {
          const lvl = Math.round(b.level * 100);
          const i = document.getElementById('gpBattLevel');
          const wrap = document.getElementById('gpBatt');
          if (!i || !wrap) return;
          i.style.width = lvl + '%';
          wrap.classList.toggle('low',  lvl <= 30 && lvl > 15);
          wrap.classList.toggle('crit', lvl <= 15);
        };
        upd(); b.addEventListener('levelchange', upd); b.addEventListener('chargingchange', upd);
      }).catch(()=>{});
    }
  }

  // ── Fullscreen ───────────────────────────────────────────────────────────
  function _initFullscreen() {
    const btn = document.getElementById('gpFsBtn');
    if (!btn) return;
    btn.onclick = () => {
      const isFs = document.fullscreenElement || document.webkitFullscreenElement;
      const shell = document.querySelector('.gp-shell');
      if (isFs) {
        (document.exitFullscreen || document.webkitExitFullscreen).call(document);
      } else {
        const el = document.documentElement;
        const req = el.requestFullscreen || el.webkitRequestFullscreen;
        if (req) {
          req.call(el).catch(() => {
            // Fallback: simulated fullscreen via class (iOS Safari, etc.)
            shell && shell.classList.add('gp-fs-mode');
          });
        } else {
          shell && shell.classList.add('gp-fs-mode');
        }
      }
    };
    const updateBtn = () => {
      const isFs = !!(document.fullscreenElement || document.webkitFullscreenElement);
      btn.textContent = '⛶ ' + (isFs ? _T('fsExit') : _T('fsEnter'));
      const shell = document.querySelector('.gp-shell');
      if (shell && !isFs) shell.classList.remove('gp-fs-mode');
      // Trigger canvas resize on fullscreen change (orientation may change too)
      window.dispatchEvent(new Event('resize'));
    };
    document.addEventListener('fullscreenchange', updateBtn);
    document.addEventListener('webkitfullscreenchange', updateBtn);
    // Re-fit canvas on orientation change
    window.addEventListener('orientationchange', () => {
      setTimeout(() => window.dispatchEvent(new Event('resize')), 200);
    });
  }

  // ── Overlay ──────────────────────────────────────────────────────────────
  function _ensureOverlay() {
    if (!_overlay) {
      _overlay = _el('div', 'gp-overlay');
      _stageEl.appendChild(_overlay);
    }
  }
  function _showScreen(screen) {
    _ensureOverlay();
    _overlay.innerHTML = '';
    _overlay.appendChild(screen);
    requestAnimationFrame(() => _overlay.classList.add('gp-visible'));
  }
  function _hideOverlay() { if (_overlay) _overlay.classList.remove('gp-visible'); }

  // ── HOME SCREEN ──────────────────────────────────────────────────────────
  function _showHome() {
    const pausedData = _loadPause();
    const levels = _cfg.levels || [];

    const screen = _el('div', 'gp-screen');
    screen.innerHTML = `
      <div class="gp-topbar">
        <a href="../../index.html" class="gp-back-hub">${_T('backHub')}</a>
        <div class="gp-topbar-right">
          <button class="gp-lang-toggle" id="gpThemeBtn">${_getThemeIcon()}</button>
          <button class="gp-lang-toggle" id="gpSoundBtn" title="Sound">${_Sound.icon()}</button>
          <button class="gp-lang-toggle" id="gpLangBtn">🌐 ${_esc(_T('langNext'))}</button>
          <button class="gp-profile-pill" id="gpProfBtn">
            ${_prof
              ? `<span class="gp-av-sm">${_prof.type==='google'&&typeof _prof.avatar==='string'&&_prof.avatar.startsWith('<') ? _prof.avatar : _prof.avatar}</span><span>${_esc(_prof.name)}</span>`
              : _T('signIn')}
          </button>
        </div>
      </div>

      <div class="gp-hero">
        <div class="gp-hero-icon">${_cfg.icon || '🎮'}</div>
        <h1 class="gp-hero-title">${_esc(_cfg.name)}</h1>
        <p  class="gp-hero-desc">${_esc(typeof _cfg.description === 'object' ? (_cfg.description[_lang] || _cfg.description.en || '') : (_cfg.description || ''))}</p>
        ${!_prof ? `<p style="font-size:.8em;opacity:.7;margin-top:8px;color:#9ca3af">${_T('guestHint')} <button id="gpQuickLogin" style="background:transparent;border:none;color:#60a5fa;cursor:pointer;text-decoration:underline;font-size:inherit">${_T('signIn')}</button></p>` : ''}
      </div>

      ${pausedData ? `
      <button class="gp-btn gp-btn-resume" id="gpResume">
        ${pausedData.mode === 'adventure'
          ? _T('continueLv')(pausedData.level + 1)
          : _T('continueNorm')}
      </button>` : ''}

      <div class="gp-mode-tabs" id="gpModeTabs">
        <button class="gp-mtab ${_mode==='normal'    ? 'gp-mtab-active' : ''}" data-m="normal">${_T('tabNormal')}</button>
        <button class="gp-mtab ${_mode==='adventure' ? 'gp-mtab-active' : ''}" data-m="adventure">${_T('tabAdv')}</button>
      </div>
      <div id="gpModeBody"></div>

      <div class="gp-row gp-sub-row">
        <button class="gp-sbtn" id="gpHist">${_T('btnHistory')}</button>
        <button class="gp-sbtn" id="gpTop">${_T('btnTop')}</button>
        <button class="gp-sbtn" id="gpAch">${_T('btnAwards')}</button>
        <button class="gp-sbtn" id="gpLdb">${_T('btnLeaderboard')}</button>
        <button class="gp-sbtn" id="gpHow">${_T('btnHowto')}</button>
      </div>
    `;
    _showScreen(screen);

    screen.querySelector('#gpThemeBtn').onclick = _cycleTheme;
    const _sndBtn = screen.querySelector('#gpSoundBtn');
    if (_sndBtn) _sndBtn.onclick = () => { _sndBtn.textContent = _Sound.toggle() ? '🔊' : '🔇'; };
    screen.querySelector('#gpLangBtn').onclick = _cycleLang;
    screen.querySelector('#gpProfBtn').onclick = _showProfile;
    if (screen.querySelector('#gpQuickLogin')) screen.querySelector('#gpQuickLogin').onclick = _showProfile;
    screen.querySelector('#gpHist').onclick = _showHistory;
    screen.querySelector('#gpTop').onclick  = _showTop;
    screen.querySelector('#gpAch').onclick  = _showAchievements;
    screen.querySelector('#gpLdb').onclick  = _showLeaderboard;
    screen.querySelector('#gpHow').onclick  = _showHowTo;

    if (pausedData) {
      screen.querySelector('#gpResume').onclick = () => {
        _mode  = pausedData.mode;
        _level = pausedData.level;
        _hideOverlay();
        if (_cbs.onRestoreState) {
          _cbs.onRestoreState(pausedData.snapshot, {
            mode: _mode, level: _level,
            levelConfig: levels[_level] || {}
          });
        }
      };
    }

    screen.querySelectorAll('.gp-mtab').forEach(btn => {
      btn.onclick = () => {
        _mode = btn.dataset.m;
        screen.querySelectorAll('.gp-mtab').forEach(b => b.classList.toggle('gp-mtab-active', b === btn));
        _renderModeBody(screen);
      };
    });
    _renderModeBody(screen);
  }

  function _renderModeBody(screen) {
    const body   = screen.querySelector('#gpModeBody');
    const levels = _cfg.levels || [];
    const adv    = _getAdv();

    if (_mode === 'normal') {
      body.innerHTML = `
        <button class="gp-btn gp-btn-play" id="gpPlayNormal">${_T('playNormal')}</button>
        <p class="gp-mode-hint">${_T('modeHint')}</p>
      `;
      body.querySelector('#gpPlayNormal').onclick = () => _doStart('normal', 0);
    } else {
      let gridHtml = '<div class="gp-lv-grid">';
      for (let i = 0; i < levels.length; i++) {
        const locked    = i > (adv.maxUnlocked || 0);
        const completed = !!(adv.completed && adv.completed[i]);
        const isCurrent = i === (adv.currentLevel || 0) && !locked;
        gridHtml += `
          <button class="gp-lv-btn ${locked?'gp-lv-locked':''} ${completed?'gp-lv-done':''} ${isCurrent?'gp-lv-cur':''}"
                  data-lv="${i}" ${locked ? 'disabled' : ''}>
            <span class="gp-lv-n">${i+1}</span>
            <span class="gp-lv-ico">${completed ? '⭐' : locked ? '🔒' : '▶'}</span>
          </button>`;
      }
      gridHtml += '</div>';

      let selLv = adv.currentLevel || 0;
      body.innerHTML = `
        ${gridHtml}
        <button class="gp-btn gp-btn-play" id="gpPlayAdv">${_T('playAdv')(selLv + 1)}</button>
      `;

      body.querySelectorAll('.gp-lv-btn:not([disabled])').forEach(btn => {
        btn.onclick = () => {
          selLv = parseInt(btn.dataset.lv);
          body.querySelectorAll('.gp-lv-btn').forEach(b => b.classList.remove('gp-lv-sel'));
          btn.classList.add('gp-lv-sel');
          body.querySelector('#gpPlayAdv').textContent = _T('playAdv')(selLv + 1);
        };
      });
      body.querySelector('#gpPlayAdv').onclick = () => _doStart('adventure', selLv);
    }
  }

  // ── PROFILE SCREEN ───────────────────────────────────────────────────────
  function _showProfile() {
    const screen = _el('div', 'gp-screen');
    const title = _prof ? `👤 ${_esc(_prof.name)}` : _T('profileTitle');
    screen.innerHTML = `
      <div class="gp-topbar">
        <button class="gp-back-btn" id="gpProfBack">${_T('back')}</button>
        <h2 id="gpProfTitle">${title}</h2>
        <button class="gp-lang-toggle" id="gpLangBtn2">🌐 ${_esc(_T('langNext'))}</button>
      </div>
      <div id="gpProfBody" class="gp-prof-body"></div>
    `;
    _showScreen(screen);
    screen.querySelector('#gpProfBack').onclick = _showHome;
    screen.querySelector('#gpLangBtn2').onclick = () => { _cycleLang(); };
    _renderProfileBody(screen);
  }

  function _renderProfileBody(screen) {
    const body = screen.querySelector('#gpProfBody');
    if (_prof) {
      body.innerHTML = `
        <div class="gp-prof-info">
          <div class="gp-av-big">${_prof.type==='google'&&typeof _prof.avatar==='string'&&_prof.avatar.startsWith('<') ? _prof.avatar : _prof.avatar}</div>
          <div class="gp-prof-name">${_esc(_prof.name)}</div>
          <div class="gp-prof-type">${_prof.type === 'google' ? '🔵 Google' : '⚪ Guest'}</div>
          ${_prof.email ? `<div class="gp-prof-email">${_esc(_prof.email)}</div>` : ''}
        </div>
        ${_badgesPreviewHtml()}
        <button class="gp-sbtn gp-btn-danger" id="gpLogout">${_T('signOut')}</button>
      `;
      body.querySelector('#gpLogout').onclick = async () => {
        await _saveProfile(null);
        if (window.google && google.accounts && google.accounts.id) {
          try { google.accounts.id.disableAutoSelect(); } catch {}
        }
        // Re-render entire profile screen (title resets to default)
        _showProfile();
      };
    } else {
      const hasGoogle = !!CFG.googleClientId;
      body.innerHTML = `
        <p class="gp-prof-hint">${_T('guestHint')}</p>
        ${_badgesPreviewHtml()}
        <div class="gp-guest-form">
          <input class="gp-input" id="gpGuestName" type="text"
                 placeholder="${_esc(_T('namePlaceholder'))}" maxlength="20" autocomplete="off">
          <button class="gp-btn gp-btn-play" id="gpGuestOk">${_T('playGuest')}</button>
        </div>
        ${hasGoogle ? `
          <div class="gp-or">${_T('orDivider')}</div>
          <div id="gpGoogleBtnHost" style="display:flex;justify-content:center;min-height:44px;"></div>
        ` : ''}
      `;
      body.querySelector('#gpGuestOk').onclick = async () => {
        const n = (body.querySelector('#gpGuestName').value || '').trim() || 'Player';
        await _saveProfile(_guestProf(n));
        // Re-render entire profile screen with updated title
        _showProfile();
      };
      // Render Google's official sign-in button (handles popup automatically)
      if (hasGoogle) {
        _initGoogleButton(body.querySelector('#gpGoogleBtnHost'));
      }
    }
    const _bp = body.querySelector('#gpBadgesPrev');
    if (_bp) _bp.onclick = _showAchievements;
  }

  // ── HISTORY SCREEN ───────────────────────────────────────────────────────
  function _showHistory() {
    const h = _getHistory();
    const rows = h.length
      ? h.map(e => `
          <div class="gp-list-row">
            <span class="gp-lr-badge">${e.mode === 'adventure' ? `⚔️ Lv${e.level+1}` : '🏅'}</span>
            <span class="gp-lr-score">${_T('scoreLabel')}: <strong>${e.score}</strong></span>
            <span class="gp-lr-date">${_fmtDate(e.date)}</span>
          </div>`).join('')
      : `<p class="gp-empty">${_T('noHist')}</p>`;
    const screen = _el('div', 'gp-screen');
    screen.innerHTML = `
      <div class="gp-topbar">
        <button class="gp-back-btn" id="gpHistBack">${_T('back')}</button>
        <h2>${_T('histTitle')}</h2>
        <button class="gp-lang-toggle" id="gpLangBtn3">🌐 ${_esc(_T('langNext'))}</button>
      </div>
      <div class="gp-list">${rows}</div>
      ${h.length ? `<div style="padding:0 14px"><button class="gp-sbtn gp-btn-danger" id="gpClearHist">${_T('clearHist')}</button></div>` : ''}
    `;
    _showScreen(screen);
    screen.querySelector('#gpHistBack').onclick = _showHome;
    screen.querySelector('#gpLangBtn3').onclick = _cycleLang;
    if (h.length) {
      screen.querySelector('#gpClearHist').onclick = async () => {
        await _setC(_ukey('history'), []);
        _showHistory();
      };
    }
  }

  // ── TOP (LOCAL) SCREEN ───────────────────────────────────────────────────
  function _showTop() {
    const t = _getTop();
    const medals = ['🥇','🥈','🥉'];
    const rows = t.length
      ? t.map((e,i) => `
          <div class="gp-list-row ${i<3?['gp-gold','gp-silver','gp-bronze'][i]:''}">
            <span class="gp-lr-rank">${medals[i] || ('#'+(i+1))}</span>
            <span class="gp-lr-name">${_esc(e.player)}</span>
            <span class="gp-lr-score"><strong>${e.score}</strong></span>
            <span class="gp-lr-date">${_fmtDate(e.date)}</span>
          </div>`).join('')
      : `<p class="gp-empty">${_T('noTop')}</p>`;
    const screen = _el('div', 'gp-screen');
    screen.innerHTML = `
      <div class="gp-topbar">
        <button class="gp-back-btn" id="gpTopBack">${_T('back')}</button>
        <h2>${_T('topTitle')}</h2>
        <button class="gp-lang-toggle" id="gpLangBtn4">🌐 ${_esc(_T('langNext'))}</button>
      </div>
      <div class="gp-list">${rows}</div>
      ${t.length ? `<div style="padding:0 14px"><button class="gp-sbtn gp-btn-danger" id="gpClearTop">${_T('clearTop')}</button></div>` : ''}
    `;
    _showScreen(screen);
    screen.querySelector('#gpTopBack').onclick = _showHome;
    screen.querySelector('#gpLangBtn4').onclick = _cycleLang;
    if (t.length) {
      screen.querySelector('#gpClearTop').onclick = async () => {
        await _setC(_gkey('top'), []);
        _showTop();
      };
    }
  }

  // ── LEADERBOARD (ONLINE) SCREEN ──────────────────────────────────────────
  let _ldbPeriod = 'all';
  function _showLeaderboard() {
    const screen = _el('div', 'gp-screen');
    screen.innerHTML = `
      <div class="gp-topbar">
        <button class="gp-back-btn" id="gpLdbBack">${_T('back')}</button>
        <h2>${_T('ldbTitle')}</h2>
        <button class="gp-lang-toggle" id="gpLangBtn6">🌐 ${_esc(_T('langNext'))}</button>
      </div>
      <div class="gp-tabbar">
        <button class="gp-tab ${_ldbPeriod==='all'?'active':''}" data-p="all">${_T('ldbTabAll')}</button>
        <button class="gp-tab ${_ldbPeriod==='week'?'active':''}" data-p="week">${_T('ldbTabWeek')}</button>
      </div>
      <div class="gp-list" id="gpLdbBody">
        <div class="gp-loading-row"><span class="gp-spin"></span> ${_T('ldbLoading')}</div>
      </div>
    `;
    _showScreen(screen);
    screen.querySelector('#gpLdbBack').onclick = _showHome;
    screen.querySelector('#gpLangBtn6').onclick = _cycleLang;
    screen.querySelectorAll('.gp-tab').forEach(b => {
      b.onclick = () => { _ldbPeriod = b.dataset.p; _showLeaderboard(); };
    });
    _renderLdb(screen);
  }
  async function _renderLdb(screen) {
    const body = screen.querySelector('#gpLdbBody');
    if (!_hasApi()) { body.innerHTML = `<p class="gp-empty">${_T('ldbOffline')}</p>`; return; }
    const rows = await _fetchLeaderboard(_ldbPeriod);
    if (!rows) { body.innerHTML = `<p class="gp-empty">${_T('ldbOffline')}</p>`; return; }
    if (!rows.length) { body.innerHTML = `<p class="gp-empty">${_T('noTop')}</p>`; return; }
    const medals = ['🥇','🥈','🥉'];
    const myUid = _uid();
    body.innerHTML = rows.map((e,i) => `
      <div class="gp-list-row ${i<3?['gp-gold','gp-silver','gp-bronze'][i]:''} ${e.user_id===myUid?'gp-lv-cur':''}">
        <span class="gp-lr-rank">${medals[i] || ('#'+(i+1))}</span>
        <span class="gp-lr-name">${_esc(e.name)}</span>
        <span class="gp-lr-score"><strong>${e.best_score}</strong></span>
        <span class="gp-lr-date">Lv ${(e.best_level|0)+1}</span>
      </div>`).join('');
  }

  // ── HOW-TO SCREEN ────────────────────────────────────────────────────────
  function _showHowTo() {
    const hw = _cfg.howto || { en:'Play and enjoy!', vi:'Chơi vui nhé!', ja:'ゲームを楽しんで！' };
    const defTab = _lang;
    const screen = _el('div', 'gp-screen');
    screen.innerHTML = `
      <div class="gp-topbar">
        <button class="gp-back-btn" id="gpHowBack">${_T('back')}</button>
        <h2>${_T('howtoTitle')}</h2>
        <button class="gp-lang-toggle" id="gpLangBtn5">🌐 ${_esc(_T('langNext'))}</button>
      </div>
      <div class="gp-lang-tabs">
        <button class="gp-ltab ${defTab==='en'?'gp-ltab-active':''}" data-l="en">${_T('langEN')}</button>
        <button class="gp-ltab ${defTab==='ja'?'gp-ltab-active':''}" data-l="ja">${_T('langJA')}</button>
        <button class="gp-ltab ${defTab==='vi'?'gp-ltab-active':''}" data-l="vi">${_T('langVI')}</button>
      </div>
      <div class="gp-howto-body" id="gpHowBody">${hw[defTab] || hw.en || ''}</div>
    `;
    _showScreen(screen);
    screen.querySelector('#gpHowBack').onclick = _showHome;
    screen.querySelector('#gpLangBtn5').onclick = _cycleLang;
    screen.querySelectorAll('.gp-ltab').forEach(btn => {
      btn.onclick = () => {
        screen.querySelectorAll('.gp-ltab').forEach(b => b.classList.remove('gp-ltab-active'));
        btn.classList.add('gp-ltab-active');
        screen.querySelector('#gpHowBody').innerHTML = hw[btn.dataset.l] || hw.en || '';
      };
    });
  }

  // ── RESULT SCREEN ────────────────────────────────────────────────────────
  function _showResult(score, extra, cleared) {
    const isAdv   = _mode === 'adventure';
    const levels  = _cfg.levels || [];
    const didPass = cleared !== false;                   // default true for backwards compat
    const canNext = isAdv && didPass && _level + 1 < levels.length;
    const top     = _getTop();
    const rank    = top.findIndex(e => e.score <= score);
    const rankTxt = rank === 0 ? _T('rankNew') : rank > 0 ? _T('rankTop')(rank + 1) : '';

    let title, emoji;
    if (isAdv) {
      if (!didPass) { title = _T('failed')(_level + 1); emoji = '😢'; }
      else if (canNext) { title = _T('cleared')(_level + 1); emoji = '🎉'; }
      else { title = _T('done')(_level + 1); emoji = '🏆'; }
    } else {
      title = _T('gameOver'); emoji = score > 0 ? '🎉' : '😔';
    }

    const replayLabel = isAdv && !didPass ? _T('retryLv')(_level + 1) : _T('playAgain');
    const screen = _el('div', 'gp-screen gp-result-screen');
    screen.innerHTML = `
      <div class="gp-result-card">
        <div class="gp-result-emoji">${emoji}</div>
        <h2>${title}</h2>
        <div class="gp-result-score">${score.toLocaleString()}</div>
        <div class="gp-result-score-label">${_T('scoreLabel')}</div>
        ${rankTxt ? `<div class="gp-result-rank">${rankTxt}</div>` : ''}
        ${extra   ? `<div class="gp-result-extra">${_esc(String(extra))}</div>` : ''}
        <div class="gp-result-btns">
          ${canNext ? `<button class="gp-btn gp-btn-play" id="gpNextLv">${_T('nextLv')(_level + 2)}</button>` : ''}
          <button class="gp-btn gp-btn-play" id="gpReplay">${replayLabel}</button>
          <div class="gp-row gp-sub-row">
            <button class="gp-sbtn" id="gpResHome">${_T('homeBtn')}</button>
            <button class="gp-sbtn gp-sbtn-share" id="gpShare">${_T('shareScore')}</button>
          </div>
        </div>
      </div>
    `;
    _showScreen(screen);
    // Result sound: levelup > win > lose
    if (isAdv && didPass && canNext) _Sound.play('levelup');
    else if (didPass && score > 0)   _Sound.play('win');
    else                             _Sound.play('lose');
    if (canNext) screen.querySelector('#gpNextLv').onclick = () => _doStart('adventure', _level + 1);
    screen.querySelector('#gpReplay').onclick  = () => _doStart(_mode, _level);
    screen.querySelector('#gpResHome').onclick = _showHome;
    screen.querySelector('#gpShare').onclick   = () => _shareScore(_cfg.name || _gid, score, title, emoji);
  }

  // ── Share Score via Canvas + Web Share API ────────────────────────────────
  function _shareScore(gameName, score, title, emoji) {
    const W = 600, H = 360;
    const canvas = document.createElement('canvas');
    canvas.width = W; canvas.height = H;
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#09090f';
    ctx.fillRect(0, 0, W, H);

    // Gradient border
    const grad = ctx.createLinearGradient(0, 0, W, 0);
    grad.addColorStop(0, '#a78bfa');
    grad.addColorStop(0.5, '#60a5fa');
    grad.addColorStop(1, '#34d399');
    ctx.strokeStyle = grad;
    ctx.lineWidth = 4;
    ctx.strokeRect(2, 2, W - 4, H - 4);

    // Emoji
    ctx.font = '64px serif';
    ctx.textAlign = 'center';
    ctx.fillText(emoji, W / 2, 90);

    // Game name
    ctx.font = 'bold 26px -apple-system, Arial, sans-serif';
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(gameName, W / 2, 140);

    // Title (Level Clear / Game Over)
    ctx.font = '18px -apple-system, Arial, sans-serif';
    ctx.fillStyle = '#8888aa';
    ctx.fillText(title, W / 2, 170);

    // Score
    ctx.font = 'bold 76px -apple-system, Arial, sans-serif';
    const sg = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
    sg.addColorStop(0, '#f59e0b'); sg.addColorStop(1, '#ef4444');
    ctx.fillStyle = sg;
    ctx.fillText(score.toLocaleString(), W / 2, 265);

    // Footer
    ctx.font = '15px -apple-system, Arial, sans-serif';
    ctx.fillStyle = '#555577';
    ctx.fillText('allin1site.com · Mini Games', W / 2, 320);

    canvas.toBlob(async blob => {
      const file = new File([blob], 'score.png', { type: 'image/png' });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        try {
          await navigator.share({
            title: `${gameName} — ${score.toLocaleString()} pts`,
            text: `I scored ${score.toLocaleString()} in ${gameName}! Can you beat it? 🎮`,
            url: location.href,
            files: [file],
          });
          return;
        } catch (e) {
          if (e.name === 'AbortError') return; // user cancelled
        }
      }
      // Fallback: download PNG
      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = `${gameName.replace(/\W+/g, '_')}_${score}.png`;
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    }, 'image/png');
  }

  // ── Game launch ──────────────────────────────────────────────────────────
  async function _doStart(mode, level) {
    _Sound.play('click');
    _mode = mode; _level = level;
    await _clearPause();
    _hideOverlay();
    _startHeartbeat();      // mark as online while playing
    const levelConfig = (_cfg.levels || [])[level] || {};
    if (_cbs.onStart) _cbs.onStart({ mode, level, levelConfig });
  }

  // ── Interstitial ad (between levels) ─────────────────────────────────────
  // Wires up an overlay with countdown and a Skip button (enabled after 5s).
  // Returns a Promise that resolves when ad finishes/skipped.
  // Real ad HTML is injected from CFG.interstitialAd.providerHtml; if empty,
  // shows a transparent placeholder for design preview.
  function _showInterstitial() {
    return new Promise(resolve => {
      const ad = CFG.interstitialAd || {};
      if (!ad.enabled) { resolve(); return; }
      const dur  = Math.max(3000, ad.durationMs   || 15000);
      const skip = Math.max(1000, ad.skipAfterMs  || 5000);

      const wrap = _el('div', 'gp-interstitial');
      wrap.innerHTML = `
        <div class="gp-int-content">
          ${ad.providerHtml ? `<div class="gp-int-provider">${ad.providerHtml}</div>`
                            : `<div class="gp-int-placeholder">Ad slot · ${Math.round(dur/1000)}s</div>`}
        </div>
        <button class="gp-int-skip" disabled>
          <span class="gp-int-count">Skip in ${Math.ceil(skip/1000)}s</span>
        </button>
      `;
      _stageEl.appendChild(wrap);
      requestAnimationFrame(() => wrap.classList.add('gp-visible'));

      const btn = wrap.querySelector('.gp-int-skip');
      const cnt = wrap.querySelector('.gp-int-count');
      const start = Date.now();
      let done = false;
      const cleanup = () => {
        if (done) return; done = true;
        clearInterval(timer);
        wrap.classList.remove('gp-visible');
        setTimeout(() => { wrap.remove(); resolve(); }, 200);
      };
      const timer = setInterval(() => {
        const elapsed = Date.now() - start;
        if (elapsed >= dur) { cleanup(); return; }
        if (elapsed >= skip) {
          btn.disabled = false;
          cnt.textContent = 'Skip Ad ⏭';
        } else {
          cnt.textContent = `Skip in ${Math.ceil((skip - elapsed)/1000)}s`;
        }
      }, 250);
      btn.onclick = () => { if (!btn.disabled) cleanup(); };
    });
  }

  // ── Google Identity Services ─────────────────────────────────────────────
  function _loadGsiScript() {
    if (window.google && google.accounts && google.accounts.id) return Promise.resolve();
    return new Promise((res, rej) => {
      if (document.querySelector('script[src*="accounts.google.com/gsi"]')) return res();
      const s = document.createElement('script');
      s.src = 'https://accounts.google.com/gsi/client';
      s.async = true; s.defer = true;
      s.onload = () => res(); s.onerror = () => rej();
      document.head.appendChild(s);
    });
  }
  // Render Google's official sign-in button inside a container element.
  // Google's button handles the entire OAuth popup flow automatically.
  async function _initGoogleButton(hostEl) {
    if (!CFG.googleClientId || !hostEl) return;
    try {
      await _loadGsiScript();
      if (!window.google || !google.accounts || !google.accounts.id) {
        throw new Error('Google Identity Services not loaded');
      }
      google.accounts.id.initialize({
        client_id: CFG.googleClientId,
        callback: _onGoogleLogin,
        auto_select: false,
        ux_mode: 'popup',
        context: 'signin',
      });
      // Render Google's official button — it handles popup + account picker
      google.accounts.id.renderButton(hostEl, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        text: 'signin_with',
        shape: 'rectangular',
        width: Math.min(hostEl.offsetWidth || 300, 400),
      });
      console.log('[GamePlatform] Google sign-in button rendered');
    } catch (e) {
      console.error('[GamePlatform] Google button init error:', e);
      // Fallback: show a manual button that retries
      hostEl.innerHTML = `<button class="gp-google-btn" style="width:100%">
        <span class="gp-g-ico"></span><span>${_T('signInGoogle')}</span>
      </button>`;
      hostEl.querySelector('button').onclick = () => _initGoogleButton(hostEl);
    }
  }
  async function _onGoogleLogin(response) {
    console.log('[GamePlatform] Google login callback fired');
    try {
      // JWT payload is base64url-encoded → decode to UTF-8 via TextDecoder
      const raw = response.credential.split('.')[1];
      const b64 = raw.replace(/-/g, '+').replace(/_/g, '/');
      const padded = b64 + '='.repeat((4 - b64.length % 4) % 4);
      const bin = atob(padded);
      const bytes = new Uint8Array(bin.length);
      for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
      const pl = JSON.parse(new TextDecoder().decode(bytes));
      console.log('[GamePlatform] Google user:', pl.name, pl.email);
      await _saveProfile({
        id: 'google_' + pl.sub,
        name: pl.name || 'Google User',
        email: pl.email || null,
        avatar: pl.picture ? `<img class="gp-google-av" src="${_esc(pl.picture)}" alt="avatar">` : '🔵',
        type: 'google',
        googleIdToken: response.credential,
      });
      console.log('[GamePlatform] Profile saved, showing profile');
      // Re-render profile screen to show logged-in state
      _showProfile();
    } catch (e) { console.error('[GamePlatform] Google login error', e); }
  }

  // ── Public API ───────────────────────────────────────────────────────────
  async function init(config) {
    _cfg = config;
    _gid = config.id;
    _cbs = {
      onStart: config.onStart,
      onGetState: config.onGetState,
      onRestoreState: config.onRestoreState,
    };

    _buildShell();
    _initTheme();

    await _openDB();
    await _loadAll([
      'gp_global_profile',
      'gp_global_stats',
      'gp_global_achievements',
      _gkey('top'),
    ]);
    await _loadProfile();
    // load per-user keys after profile
    await _loadAll([
      _ukey('history'), _ukey('adv'), _ukey('paused'),
    ]);

    // Pre-warm Google SDK if configured (so the button is fast later)
    if (CFG.googleClientId) _loadGsiScript().catch(()=>{});

    // Track visitor session + pageview clicks
    _tracker.send('session');
    document.addEventListener('click', e => {
      const a = e.target.closest('a[href]');
      if (a) _tracker.send('pageview');
    });

    _showHome();
  }

  async function pause(snapshot) {
    _stopHeartbeat();
    await _savePause(snapshot);
    _showHome();
  }

  async function recordResult(result) {
    const score = result.score || 0;
    _stopHeartbeat();
    await _addHistory({ score, mode: _mode, level: _level, extra: result.extra });
    await _addTop    ({ score, mode: _mode, level: _level });

    const cleared    = result.cleared !== false;          // default true for backwards compat
    const levelsLen  = (_cfg.levels || []).length;
    const clearedLvl = (_mode === 'adventure' && cleared) ? _level + 1 : null;
    const gstats     = await _updateGlobalStats(score, clearedLvl);

    // Show interstitial BEFORE the result screen (logic-only by default)
    await _showInterstitial();

    if (_mode === 'adventure') {
      const adv = Object.assign({ currentLevel:0, maxUnlocked:0, completed:[] }, _getAdv());
      adv.completed = adv.completed.slice();
      if (cleared) {
        adv.completed[_level] = true;
        const nxt = _level + 1;
        if (nxt < levelsLen) {
          adv.maxUnlocked  = Math.max(adv.maxUnlocked || 0, nxt);
          adv.currentLevel = nxt;
        }
      }
      await _saveAdv(adv);
    }

    // Achievements (local-first, cross-game) — checked after stats update
    let _streak = 0;
    try { _streak = parseInt(localStorage.getItem('gp_streak_count') || '0', 10) || 0; } catch {}
    await _checkAchievements({
      plays: gstats.plays, best: gstats.best, maxLevel: gstats.maxLevel, langs: gstats.langs,
      score, mode: _mode, level: _level, cleared,
      finishedGame: (_mode === 'adventure' && cleared && _level + 1 === levelsLen),
      streak: _streak, hour: new Date().getHours(),
    });

    // Server sync (best-effort, non-blocking)
    if (_hasApi()) {
      _toast(_T('saving'));
      _postScore(score, _level, _mode, result.extra).then(ok => {
        _toast(ok ? _T('saved') : _T('saveFail'));
      });
    }

    _showResult(score, result.extra, result.cleared);
  }

  function showHome() { _showHome(); }
  function getLang() { return _lang; }
  function setLang(l) { _setLang(l); }
  function getStageInner() { return _stageInner; }   // for games to mount HUD/canvas

  window.GamePlatform = {
    init, pause, recordResult, showHome, getLang, setLang, getStageInner,
    sound: { play: (n) => _Sound.play(n), toggle: () => _Sound.toggle(), isOn: () => _Sound.isOn() },
    _onGoogleLogin,  // exposed for legacy data-callback usage
  };
})();
