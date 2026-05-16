🎮 FULL 3 SKILLS - WITH INTEGRATED KAYA DESIGN SYSTEM

🎮 SKILL 1: daily-genZ-game-factory

\# 🎮 SKILL: daily-genZ-game-factory

\## ROLE

Senior Game Engineer + UI/UX Designer + QA + Product Reviewer

Hàng ngày tự động:

1\. Setup shared style system (Kaya design tokens)

2\. Generate 10 games Gen-Z (Research + Anti-repeat)

3\. Verify 9-step checklist

4\. Prepare files for deployment

\---

\## 🎯 CONTEXT HỆ THỐNG

| Thành phần | Chi tiết |

|-----------|---------|

| \*\*Portal\*\* | FastAPI (Python) - E:/SourceCode/AllIn1Site/portal/ |

| \*\*Games folder\*\* | E:/SourceCode/AllIn1Site/subapp/games/games/ |

| \*\*Shared styles\*\* | E:/SourceCode/AllIn1Site/subapp/games/assets/shared/ |

| \*\*Games domain\*\* | https://minigames.allin1site.com/{ten-game}/ |

| \*\*Server\*\* | 62.238.28.106 (Linux, Docker) |

| \*\*Design system\*\* | Kaya (warm neutrals + sumi red accent) |

| \*\*Target player\*\* | Gen Z / Casual / Mobile-first |

\---

\## 📋 STEP 0: SETUP SHARED STYLE SYSTEM

\### 0.1 Create shared assets folder

```bash

cd \~/daily-games-workspace/allin1site/subapp/games/

mkdir -p assets/shared

0.2 Create tokens.css (Kaya design system variables)

File: assets/shared/tokens.css



/\* Kaya Design System — Colors \& Type \*/



@font-face {

&#x20; font-family: "Inter";

&#x20; font-style: normal;

&#x20; font-weight: 100 900;

&#x20; font-display: swap;

&#x20; src: url("../fonts/Inter-Variable.ttf") format("truetype-variations");

}

@font-face {

&#x20; font-family: "Fraunces";

&#x20; font-style: normal;

&#x20; font-weight: 100 900;

&#x20; font-display: swap;

&#x20; src: url("../fonts/Fraunces-Variable.ttf") format("truetype-variations");

}

@font-face {

&#x20; font-family: "JetBrains Mono";

&#x20; font-style: normal;

&#x20; font-weight: 100 800;

&#x20; font-display: swap;

&#x20; src: url("../fonts/JetBrainsMono-Variable.ttf") format("truetype-variations");

}



:root {

&#x20; /\* Color tokens \*/

&#x20; --paper-0:  oklch(99.2% 0.006 80);

&#x20; --paper-1:  oklch(97.2% 0.010 82);

&#x20; --paper-2:  oklch(94.5% 0.014 82);

&#x20; --paper-3:  oklch(89.0% 0.020 80);



&#x20; --ink-0:    oklch(20.0% 0.012 55);

&#x20; --ink-1:    oklch(35.0% 0.010 55);

&#x20; --ink-2:    oklch(52.0% 0.008 55);

&#x20; --ink-3:    oklch(70.0% 0.008 55);



&#x20; --sumi:     oklch(50.0% 0.145 30);

&#x20; --sumi-hover: oklch(45.0% 0.150 30);

&#x20; --sumi-press: oklch(40.0% 0.155 30);

&#x20; --sumi-ghost: oklch(50.0% 0.145 30 / 0.10);

&#x20; --sumi-ring:  oklch(50.0% 0.145 30 / 0.40);



&#x20; --bg:            var(--paper-0);

&#x20; --bg-elevated:   var(--paper-1);

&#x20; --bg-sunken:     var(--paper-2);

&#x20; --fg:            var(--ink-0);

&#x20; --fg-muted:      var(--ink-1);

&#x20; --fg-subtle:     var(--ink-2);

&#x20; --fg-disabled:   var(--ink-3);

&#x20; --border:        oklch(89.0% 0.020 80 / 0.8);

&#x20; --border-strong: var(--paper-3);

&#x20; --accent:        var(--sumi);

&#x20; --accent-hover:  var(--sumi-hover);

&#x20; --focus-ring:    var(--sumi-ring);

&#x20; --scrim:         oklch(22.0% 0.012 50 / 0.52);



&#x20; /\* Typography \*/

&#x20; --font-sans:    "Inter", ui-sans-serif, system-ui, -apple-system, "Segoe UI", sans-serif;

&#x20; --font-serif:   "Fraunces", ui-serif, Georgia, "Times New Roman", serif;

&#x20; --font-mono:    "JetBrains Mono", ui-monospace, "SF Mono", Consolas, monospace;



&#x20; --text-xs:   12px;

&#x20; --text-sm:   13px;

&#x20; --text-base: 15px;

&#x20; --text-md:   17px;

&#x20; --text-lg:   20px;

&#x20; --text-xl:   24px;

&#x20; --text-2xl:  32px;



&#x20; --lh-tight:  1.12;

&#x20; --lh-snug:   1.25;

&#x20; --lh-normal: 1.5;

&#x20; --lh-loose:  1.7;



&#x20; --tracking-tight:  -0.02em;

&#x20; --tracking-normal: 0;

&#x20; --tracking-wide:   0.04em;

&#x20; --tracking-caps:   0.08em;



&#x20; --weight-regular: 400;

&#x20; --weight-medium:  500;

&#x20; --weight-semibold: 600;

&#x20; --weight-bold:    700;



&#x20; /\* Spacing \*/

&#x20; --space-1:  4px;

&#x20; --space-2:  8px;

&#x20; --space-3:  12px;

&#x20; --space-4:  16px;

&#x20; --space-5:  20px;

&#x20; --space-6:  24px;

&#x20; --space-8:  32px;

&#x20; --space-10: 48px;



&#x20; /\* Radii \*/

&#x20; --radius-xs: 2px;

&#x20; --radius-sm: 6px;

&#x20; --radius-md: 10px;

&#x20; --radius-lg: 14px;

&#x20; --radius-full: 9999px;



&#x20; /\* Shadows \*/

&#x20; --shadow-1: 0 1px 2px rgba(40, 30, 20, 0.06);

&#x20; --shadow-2: 0 4px 12px rgba(40, 30, 20, 0.08), 0 1px 3px rgba(40, 30, 20, 0.06);

&#x20; --shadow-3: 0 16px 40px rgba(40, 30, 20, 0.14), 0 4px 12px rgba(40, 30, 20, 0.08);



&#x20; /\* Motion \*/

&#x20; --ease-spring:   cubic-bezier(0.34, 1.56, 0.64, 1);

&#x20; --ease-standard: cubic-bezier(0.4, 0, 0.2, 1);

&#x20; --ease-out:      cubic-bezier(0, 0, 0.2, 1);

&#x20; --dur-fast:   150ms;

&#x20; --dur-base:   220ms;

&#x20; --dur-slow:   400ms;

}



:root\[data-theme="dark"] {

&#x20; --paper-0:  oklch(18.0% 0.012 55);

&#x20; --paper-1:  oklch(22.0% 0.014 55);

&#x20; --paper-2:  oklch(26.0% 0.016 55);

&#x20; --paper-3:  oklch(34.0% 0.018 55);



&#x20; --ink-0:    oklch(95.0% 0.010 85);

&#x20; --ink-1:    oklch(82.0% 0.010 80);

&#x20; --ink-2:    oklch(65.0% 0.010 75);

&#x20; --ink-3:    oklch(45.0% 0.010 70);



&#x20; --sumi:     oklch(65.0% 0.140 32);

&#x20; --sumi-hover: oklch(70.0% 0.140 32);



&#x20; --border: oklch(34.0% 0.018 55 / 0.8);

&#x20; --scrim:  oklch(10.0% 0.010 50 / 0.65);

}



@media (prefers-reduced-motion: reduce) {

&#x20; :root {

&#x20;   --ease-spring: cubic-bezier(0.4, 0, 0.2, 1);

&#x20;   --dur-fast:  80ms;

&#x20;   --dur-base:  80ms;

&#x20;   --dur-slow: 120ms;

&#x20; }

}



html { color-scheme: light dark; }

body {

&#x20; margin: 0;

&#x20; background: var(--bg);

&#x20; color: var(--fg);

&#x20; font-family: var(--font-sans);

&#x20; font-size: var(--text-base);

&#x20; line-height: var(--lh-normal);

&#x20; -webkit-font-smoothing: antialiased;

}



\*:focus-visible {

&#x20; outline: 2px solid var(--focus-ring);

&#x20; outline-offset: 2px;

&#x20; border-radius: var(--radius-xs);

}

0.3 Create style.css (Base game styles - using Kaya system)

File: assets/shared/style.css



\[Paste the entire style.css you provided above]



0.4 Verify structure

ls -la assets/shared/

\# Output:

\# tokens.css

\# style.css

📋 STEP 1: RESEARCH \& GENERATE 10 GAMES

1.1 Research Sources (≥3, ≥30 candidates)

CrazyGames: Hot, New, Recently updated

itch.io: new \& popular, trending tags

PocketGamer, TikTok games, mobile lists

Extract: titles, genres, descriptions

1.2 Anti-Repeat Policy (STRICT)

State files:



state/seen\_inspirations.json

state/generated\_games.json

state/fingerprints.json

Fingerprint schema:



{

&#x20; "id": "20260429\_gamename",

&#x20; "title": "Game Title",

&#x20; "genre": \["genre1", "genre2"],

&#x20; "core\_loop\_verbs": \["verb1", "verb2"],

&#x20; "mechanics": \["mechanic1", "mechanic2"],

&#x20; "input": \["tap"],

&#x20; "session\_length\_sec": 120,

&#x20; "camera": "ui-only",

&#x20; "theme\_keywords": \["keyword1"]

}

Non-repeat rules:



❌ NEVER same inspiration title twice

❌ Fingerprint overlap ≥60% OR ≥2 shared mechanics = REJECT

❌ Within today's 10: all different primary mechanic

✅ Diversity: ≥6 genres, ≥8 mechanics

1.3 Output Structure

subapp/games/

├── assets/shared/

│   ├── tokens.css

│   └── style.css

├── games/YYYYMMDD\_gamename/

│   ├── index.html

│   ├── meta.json

│   ├── game.js

│   └── \[game-specific.css - optional]

├── research/YYYY-MM-DD/sources.md

├── state/

│   ├── seen\_inspirations.json

│   ├── generated\_games.json

│   └── fingerprints.json

└── daily/YYYY-MM-DD.md

1.4 Game Template (WITH SHARED STYLE INTEGRATION)

File: games/YYYYMMDD\_gamename/index.html



<!DOCTYPE html>

<html lang="en">

<head>

&#x20; <meta charset="UTF-8">

&#x20; <meta name="viewport" content="width=device-width, initial-scale=1.0">

&#x20; <title>\[Game Title]</title>

&#x20; 

&#x20; <!-- SHARED KAYA DESIGN SYSTEM -->

&#x20; <link rel="stylesheet" href="../../assets/shared/tokens.css">

&#x20; <link rel="stylesheet" href="../../assets/shared/style.css">

&#x20; 

&#x20; <style>

&#x20;   /\* Game-specific overrides (optional) \*/

&#x20;   :root {

&#x20;     --num-font: var(--font-serif);

&#x20;   }

&#x20;   

&#x20;   #game-container {

&#x20;     width: 100%;

&#x20;     max-width: 500px;

&#x20;     background: var(--bg-elevated);

&#x20;     border-radius: var(--radius-lg);

&#x20;     padding: var(--space-5);

&#x20;     box-shadow: var(--shadow-2);

&#x20;     margin: 0 auto;

&#x20;   }

&#x20;   

&#x20;   .header {

&#x20;     display: flex;

&#x20;     justify-content: space-between;

&#x20;     align-items: center;

&#x20;     margin-bottom: var(--space-5);

&#x20;     padding-bottom: var(--space-4);

&#x20;     border-bottom: 1px solid var(--border);

&#x20;   }

&#x20;   

&#x20;   h1 {

&#x20;     color: var(--accent);

&#x20;     font-size: var(--text-xl);

&#x20;     margin: 0;

&#x20;   }

&#x20;   

&#x20;   button {

&#x20;     background: var(--accent);

&#x20;     color: white;

&#x20;     border: none;

&#x20;     padding: var(--space-3) var(--space-4);

&#x20;     border-radius: var(--radius-md);

&#x20;     cursor: pointer;

&#x20;     font-weight: var(--weight-semibold);

&#x20;     transition: background var(--dur-fast);

&#x20;     font-family: var(--font-sans);

&#x20;   }

&#x20;   

&#x20;   button:hover {

&#x20;     background: var(--accent-hover);

&#x20;   }

&#x20;   

&#x20;   button:active {

&#x20;     transform: scale(0.95);

&#x20;   }

&#x20;   

&#x20;   .help-btn {

&#x20;     background: var(--paper-3);

&#x20;     color: var(--fg);

&#x20;   }

&#x20;   

&#x20;   .help-btn:hover {

&#x20;     background: var(--paper-2);

&#x20;   }

&#x20;   

&#x20;   #game-area {

&#x20;     margin: var(--space-5) 0;

&#x20;     padding: var(--space-5);

&#x20;     background: var(--bg);

&#x20;     border-radius: var(--radius-md);

&#x20;     min-height: 200px;

&#x20;   }

&#x20;   

&#x20;   .game-controls {

&#x20;     display: flex;

&#x20;     gap: var(--space-3);

&#x20;     margin-bottom: var(--space-4);

&#x20;   }

&#x20;   

&#x20;   .game-controls button {

&#x20;     flex: 1;

&#x20;   }

&#x20;   

&#x20;   .score-display {

&#x20;     background: var(--bg-sunken);

&#x20;     padding: var(--space-4);

&#x20;     border-radius: var(--radius-md);

&#x20;     margin-bottom: var(--space-4);

&#x20;     border: 1px solid var(--border);

&#x20;   }

&#x20;   

&#x20;   .score-display div {

&#x20;     margin: var(--space-2) 0;

&#x20;     font-size: var(--text-sm);

&#x20;   }

&#x20;   

&#x20;   .score-display strong {

&#x20;     color: var(--accent);

&#x20;   }

&#x20;   

&#x20;   .history {

&#x20;     background: var(--bg-sunken);

&#x20;     padding: var(--space-4);

&#x20;     border-radius: var(--radius-md);

&#x20;     border: 1px solid var(--border);

&#x20;     margin-top: var(--space-5);

&#x20;   }

&#x20;   

&#x20;   .history h3 {

&#x20;     margin: 0 0 var(--space-3) 0;

&#x20;     color: var(--accent);

&#x20;     font-size: var(--text-sm);

&#x20;   }

&#x20;   

&#x20;   .history-item {

&#x20;     padding: var(--space-2);

&#x20;     margin: var(--space-2) 0;

&#x20;     background: var(--bg);

&#x20;     border-radius: var(--radius-sm);

&#x20;     font-size: var(--text-xs);

&#x20;   }

&#x20;   

&#x20;   .help-modal {

&#x20;     display: none;

&#x20;     position: fixed;

&#x20;     top: 0; left: 0; right: 0; bottom: 0;

&#x20;     background: var(--scrim);

&#x20;     z-index: 1000;

&#x20;     justify-content: center;

&#x20;     align-items: center;

&#x20;     padding: var(--space-5);

&#x20;   }

&#x20;   

&#x20;   .help-modal.show {

&#x20;     display: flex;

&#x20;   }

&#x20;   

&#x20;   .help-content {

&#x20;     background: var(--bg-elevated);

&#x20;     padding: var(--space-6);

&#x20;     border-radius: var(--radius-lg);

&#x20;     max-width: 500px;

&#x20;     max-height: 80vh;

&#x20;     overflow-y: auto;

&#x20;     box-shadow: var(--shadow-3);

&#x20;   }

&#x20;   

&#x20;   .help-tabs {

&#x20;     display: flex;

&#x20;     gap: var(--space-2);

&#x20;     margin-bottom: var(--space-4);

&#x20;     border-bottom: 2px solid var(--border);

&#x20;   }

&#x20;   

&#x20;   .help-tab {

&#x20;     padding: var(--space-3) var(--space-4);

&#x20;     background: transparent;

&#x20;     color: var(--accent);

&#x20;     border: none;

&#x20;     cursor: pointer;

&#x20;     border-bottom: 2px solid transparent;

&#x20;     transition: all var(--dur-fast);

&#x20;     font-weight: var(--weight-semibold);

&#x20;     font-size: var(--text-sm);

&#x20;   }

&#x20;   

&#x20;   .help-tab.active {

&#x20;     color: var(--accent);

&#x20;     border-bottom-color: var(--accent);

&#x20;   }

&#x20;   

&#x20;   .help-text {

&#x20;     display: none;

&#x20;     line-height: var(--lh-loose);

&#x20;   }

&#x20;   

&#x20;   .help-text.active {

&#x20;     display: block;

&#x20;   }

&#x20;   

&#x20;   .close-help {

&#x20;     float: right;

&#x20;     font-size: var(--text-2xl);

&#x20;     cursor: pointer;

&#x20;     color: var(--accent);

&#x20;   }

&#x20;   

&#x20;   .game-over {

&#x20;     display: none;

&#x20;     text-align: center;

&#x20;     padding: var(--space-5);

&#x20;     background: var(--bg-sunken);

&#x20;     border: 1px solid var(--border);

&#x20;     border-radius: var(--radius-md);

&#x20;     margin: var(--space-5) 0;

&#x20;   }

&#x20;   

&#x20;   .game-over.show {

&#x20;     display: block;

&#x20;   }

&#x20;   

&#x20;   .game-over h2 {

&#x20;     color: var(--accent);

&#x20;     margin: 0 0 var(--space-3) 0;

&#x20;   }

&#x20;   

&#x20;   .game-over-buttons {

&#x20;     display: flex;

&#x20;     gap: var(--space-3);

&#x20;     margin-top: var(--space-4);

&#x20;   }

&#x20;   

&#x20;   .game-over-buttons button {

&#x20;     flex: 1;

&#x20;   }

&#x20;   

&#x20;   @media (max-width: 480px) {

&#x20;     #game-container {

&#x20;       max-width: 100%;

&#x20;       padding: var(--space-4);

&#x20;     }

&#x20;     

&#x20;     h1 {

&#x20;       font-size: var(--text-lg);

&#x20;     }

&#x20;     

&#x20;     .game-controls {

&#x20;       flex-direction: column;

&#x20;     }

&#x20;   }

&#x20; </style>

</head>

<body>

&#x20; <div id="game-container">

&#x20;   <!-- Header -->

&#x20;   <div class="header">

&#x20;     <h1>🎮 \[Game Title]</h1>

&#x20;     <button class="help-btn" onclick="showHelp()">❓ Help</button>

&#x20;   </div>

&#x20;   

&#x20;   <!-- Help Modal -->

&#x20;   <div id="help-modal" class="help-modal">

&#x20;     <div class="help-content">

&#x20;       <span class="close-help" onclick="closeHelp()">\&times;</span>

&#x20;       <h2>📖 How to Play</h2>

&#x20;       

&#x20;       <div class="help-tabs">

&#x20;         <button class="help-tab active" onclick="switchLang('en')">🇺🇸 EN</button>

&#x20;         <button class="help-tab" onclick="switchLang('ja')">🇯🇵 日本語</button>

&#x20;         <button class="help-tab" onclick="switchLang('vi')">🇻🇳 VI</button>

&#x20;       </div>

&#x20;       

&#x20;       <div class="help-text active" id="help-en">

&#x20;         <h3>How to Play</h3>

&#x20;         <p>\[Game instructions in English]</p>

&#x20;         <p><strong>Win:</strong> \[Condition]</p>

&#x20;         <p><strong>Lose:</strong> \[Condition]</p>

&#x20;       </div>

&#x20;       

&#x20;       <div class="help-text" id="help-ja">

&#x20;         <h3>遊び方</h3>

&#x20;         <p>\[ゲーム説明（日本語）]</p>

&#x20;         <p><strong>勝ち:</strong> \[条件]</p>

&#x20;         <p><strong>負け:</strong> \[条件]</p>

&#x20;       </div>

&#x20;       

&#x20;       <div class="help-text" id="help-vi">

&#x20;         <h3>Cách chơi</h3>

&#x20;         <p>\[Hướng dẫn trò chơi tiếng Việt]</p>

&#x20;         <p><strong>Thắng:</strong> \[Điều kiện]</p>

&#x20;         <p><strong>Thua:</strong> \[Điều kiện]</p>

&#x20;       </div>

&#x20;     </div>

&#x20;   </div>

&#x20;   

&#x20;   <!-- Controls -->

&#x20;   <div class="game-controls">

&#x20;     <button id="start-btn" onclick="startGame()">▶ Start</button>

&#x20;     <button id="stop-btn" onclick="stopGame()" style="display:none">⏹ Stop</button>

&#x20;     <button id="restart-btn" onclick="restartGame()" style="display:none">🔄 Restart</button>

&#x20;   </div>

&#x20;   

&#x20;   <!-- Score Display -->

&#x20;   <div class="score-display">

&#x20;     <div>Score: <strong id="current-score">0</strong></div>

&#x20;     <div>Best: <strong id="highest-score">0</strong></div>

&#x20;     <div>Plays: <strong id="total-plays">0</strong></div>

&#x20;   </div>

&#x20;   

&#x20;   <!-- Game Area -->

&#x20;   <div id="game-area">\[Game content]</div>

&#x20;   

&#x20;   <!-- Game Over -->

&#x20;   <div id="game-over" class="game-over">

&#x20;     <h2>Game Over!</h2>

&#x20;     <div>Final Score: <strong id="final-score">0</strong></div>

&#x20;     <div id="best-msg"></div>

&#x20;     <div class="game-over-buttons">

&#x20;       <button onclick="startGame()">▶ Play Again</button>

&#x20;       <button onclick="restartGame()">🔄 Restart</button>

&#x20;     </div>

&#x20;   </div>

&#x20;   

&#x20;   <!-- History -->

&#x20;   <div class="history">

&#x20;     <h3>📊 Recent Scores</h3>

&#x20;     <div id="history-list"></div>

&#x20;   </div>

&#x20; </div>

&#x20; 

&#x20; <script>

&#x20;   let gameState = {

&#x20;     isPlaying: false,

&#x20;     currentScore: 0,

&#x20;     highestScore: parseInt(localStorage.getItem('game\_hs') || 0),

&#x20;     plays: JSON.parse(localStorage.getItem('game\_plays') || '\[]')

&#x20;   };

&#x20;   

&#x20;   function init() {

&#x20;     updateDisplay();

&#x20;     updateHistory();

&#x20;   }

&#x20;   

&#x20;   function startGame() {

&#x20;     gameState.isPlaying = true;

&#x20;     gameState.currentScore = 0;

&#x20;     document.getElementById('start-btn').style.display = 'none';

&#x20;     document.getElementById('stop-btn').style.display = 'inline-block';

&#x20;     document.getElementById('restart-btn').style.display = 'none';

&#x20;     document.getElementById('game-over').classList.remove('show');

&#x20;     updateDisplay();

&#x20;     // \[Add game logic here]

&#x20;   }

&#x20;   

&#x20;   function stopGame() {

&#x20;     endGame();

&#x20;   }

&#x20;   

&#x20;   function restartGame() {

&#x20;     startGame();

&#x20;   }

&#x20;   

&#x20;   function endGame() {

&#x20;     gameState.isPlaying = false;

&#x20;     saveScore();

&#x20;     document.getElementById('start-btn').style.display = 'inline-block';

&#x20;     document.getElementById('stop-btn').style.display = 'none';

&#x20;     document.getElementById('restart-btn').style.display = 'inline-block';

&#x20;     document.getElementById('game-over').classList.add('show');

&#x20;     document.getElementById('final-score').textContent = gameState.currentScore;

&#x20;     

&#x20;     if (gameState.currentScore > gameState.highestScore) {

&#x20;       gameState.highestScore = gameState.currentScore;

&#x20;       document.getElementById('best-msg').textContent = '🏆 New Best Score!';

&#x20;     }

&#x20;     updateDisplay();

&#x20;   }

&#x20;   

&#x20;   function saveScore() {

&#x20;     const play = {

&#x20;       score: gameState.currentScore,

&#x20;       date: new Date().toLocaleString()

&#x20;     };

&#x20;     gameState.plays.push(play);

&#x20;     localStorage.setItem('game\_plays', JSON.stringify(gameState.plays));

&#x20;     localStorage.setItem('game\_hs', gameState.highestScore);

&#x20;     updateHistory();

&#x20;   }

&#x20;   

&#x20;   function updateDisplay() {

&#x20;     document.getElementById('current-score').textContent = gameState.currentScore;

&#x20;     document.getElementById('highest-score').textContent = gameState.highestScore;

&#x20;     document.getElementById('total-plays').textContent = gameState.plays.length;

&#x20;   }

&#x20;   

&#x20;   function updateHistory() {

&#x20;     const top5 = gameState.plays.sort((a,b) => b.score - a.score).slice(0,5);

&#x20;     document.getElementById('history-list').innerHTML = 

&#x20;       top5.length > 0 

&#x20;         ? top5.map((p,i) => `<div class="history-item">#${i+1}: ${p.score} (${p.date})</div>`).join('')

&#x20;         : '<div style="opacity:0.5">No plays yet</div>';

&#x20;   }

&#x20;   

&#x20;   function showHelp() {

&#x20;     document.getElementById('help-modal').classList.add('show');

&#x20;   }

&#x20;   

&#x20;   function closeHelp() {

&#x20;     document.getElementById('help-modal').classList.remove('show');

&#x20;   }

&#x20;   

&#x20;   function switchLang(lang) {

&#x20;     document.querySelectorAll('.help-text').forEach(e => e.classList.remove('active'));

&#x20;     document.querySelectorAll('.help-tab').forEach(e => e.classList.remove('active'));

&#x20;     document.getElementById('help-' + lang).classList.add('active');

&#x20;     event.target.classList.add('active');

&#x20;   }

&#x20;   

&#x20;   window.onload = init;

&#x20; </script>

</body>

</html>

1.5 meta.json Format

{

&#x20; "id": "YYYYMMDD\_gamename",

&#x20; "title": "Game Title",

&#x20; "type": "genre",

&#x20; "tagline": "Short description",

&#x20; "date": "YYYY-MM-DD",

&#x20; "core\_mechanics": \["mechanic1", "mechanic2"]

}

1.6 Gen-Z Design Rules (MANDATORY)

Mobile-first:



Responsive (320-2560px)

Touch controls + keyboard fallback

60fps capable

Uses Kaya design tokens for consistency

Gen-Z Juice (≥4 per game):



✅ Screen shake / impact feedback

✅ Glow / neon accents (use --accent, --sumi)

✅ Micro-sfx (WebAudio, no external files)

✅ Haptic vibration (navigator.vibrate)

✅ Combo meter / streak feedback

✅ Meme-y PG-safe text

Game Controls (MANDATORY):



✅ Start button

✅ Stop button

✅ Restart button (visible after game ends)

Help System (MANDATORY):



✅ Help button in header

✅ Help modal with 3 languages (EN / 日本語 / VI)

✅ Instructions + Win/Lose conditions

History \& Stats (MANDATORY):



✅ Current score display

✅ Highest score (localStorage)

✅ Total plays count

✅ Recent scores (top 5)

✅ New high score notification

Style Consistency:



✅ Uses shared Kaya design system (tokens.css + style.css)

✅ All colors from CSS variables (--bg, --fg, --accent, etc.)

✅ All spacing from variables (--space-\*)

✅ All fonts from variables (--font-sans, --font-serif, --font-mono)

✅ All shadows from variables (--shadow-1, --shadow-2, etc.)

✅ Dark mode support (data-theme="dark")

Originality:



✅ Abstract shapes, emojis, procedural art

❌ NO copyrighted assets

❌ NO copied layouts

Fresh titles

1.7 Daily Execution

Load state files (create if missing)

Create /assets/shared/ with tokens.css + style.css (one-time)

Web research: ≥30 candidates → 10 unique

Save to /research/YYYY-MM-DD/sources.md

For each inspiration:

Derive inspired-by brief

Generate ORIGINAL concept + fingerprint

Implement /games/YYYYMMDD\_slug/ with shared style

Include: Tutorial, pause, settings, sound toggle

Performance mode (reduce particles if FPS drops)

Update /index.html - add 10 games at top

Write /daily/YYYY-MM-DD.md

Update state files

QA: Load each game → no errors → shared styles applied → touch works → responsive

✅ STEP 2: VERIFY GAMES (9-STEP CHECKLIST)

Verification Role: Senior Game Engineer + UI/UX + QA

⚠️ RULES:



✅ Rõ ràng + cụ thể, không suy đoán

✅ Có nhận xét + đề xuất hành động

✅ Tư duy như người chơi thật

✅ Test thật kỹ (gameplay, UI, logic, performance)

1️⃣ Gameplay \& Hấp dẫn

Kiểm tra:



Dễ hiểu 5-10s? → Muốn chơi tiếp?

Luật rối không? → Vòng lặp feedback?

Phù hợp Gen Z?

Output:



Đánh giá: \[Hấp dẫn / Trung bình / Không hấp dẫn]

Lý do: \[cụ thể]

Gợi ý: \[cải tiến]

2️⃣ Hướng dẫn 3 ngôn ngữ

Kiểm tra:



🇺🇸 English: How to play + Win/Lose

🇯🇵 日本語: 遊び方 + 勝敗条件

🇻🇳 Tiếng Việt: Cách chơi + Điều kiện

Văn phong: Đơn giản, không kỹ thuật, dễ hiểu



3️⃣ UI/UX \& Giao diện

Kiểm tra:



Đủ rộng? Fullscreen? Mobile-friendly?

Button/text dễ bấm? UI rối không?

Sử dụng Kaya design tokens chính xác?

Color contrast OK? Shadows consistent?

Nếu chưa tốt:



Vấn đề: \[...]

Layout: \[...]

UX cải tiến: \[...]

4️⃣ Code Quality \& Bug Test

Test kỹ:



Bug gameplay

Bug UI (resize, mobile, fullscreen)

Bug logic (win/lose)

Crash / Freeze

Reload / Replay error

Performance

Shared styles load correctly

Output:



Bug: \[mô tả]

Vị trí: \[file/logic]

Mức độ: \[Critical/High/Medium/Low]

Fix: \[đề xuất]

5️⃣ Game Controls \& Features

Kiểm tra:



✅ Start button hoạt động?

✅ Stop button hiển thị khi chơi?

✅ Restart button sau game ends?

✅ Help button mở modal?

✅ 3 language tabs hoạt động?

✅ Score saved to localStorage?

✅ History top 5 hiển thị?

✅ New high score notification?

6️⃣ Style Consistency (Kaya Design System)

Kiểm tra:



✅ Imports ../../assets/shared/tokens.css?

✅ Imports ../../assets/shared/style.css?

✅ Uses CSS variables for colors (--bg, --fg, --accent)?

✅ Uses CSS variables for spacing (--space-\*)?

✅ Uses CSS variables for fonts?

✅ Uses CSS variables for shadows?

✅ Uses CSS variables for radii?

✅ Consistent with other games?

✅ Dark mode support (data-theme="dark")?

Output:



Style integration: \[✓ OK / ✗ Issue]

Variables used: \[list key ones]

Consistency: \[✓ Matches other games / ✗ Deviates]

7️⃣ Refactor \& Cải tiến code

Kiểm tra \& đề xuất:



Code dễ đọc?

Dễ maintain (comments, naming)?

Dễ mở rộng (modular)?

Tối ưu cho Desktop / Mobile / Fullscreen?

Shared styles used correctly?

8️⃣ Portal Integration

Kiểm tra:



Game folder đúng path: games/YYYYMMDD\_\*?

index.html imports shared styles?

meta.json đầy đủ?

Ready for subdomains.json?

9️⃣ Tổng kết (BẮT BUỘC)

✅ ĐIỂM TỐT:

&#x20;  - \[...]

❌ ĐIỂM YẾU:

&#x20;  - \[...] (Priority: High/Medium)

🔥 ƯU TIÊN FIX:

&#x20;  - \[...]

🎮 ĐÁNH GIÁ:

&#x20;  - Giữ/Cải tiến/Bỏ?

&#x20;  - \[Reason]

📝 Daily Output

✅ /assets/shared/ created (tokens.css + style.css)

✅ /research/YYYY-MM-DD/sources.md - Sources + 30 candidates

✅ /games/YYYYMMDD\_\*/ - 10 game folders (shared style integrated)

✅ /state/\* - Updated fingerprints

✅ /daily/YYYY-MM-DD.md - Full report + verification notes

✅ /index.html - Updated with 10 new games

🔐 Hard Constraints

❌ Do NOT ask user questions

❌ Do NOT speculate

❌ Do NOT skip verification

✅ MUST be specific + actionable

✅ MUST test thoroughly

✅ MUST follow anti-repeat policy

✅ MUST use shared Kaya design system

\---

\# 🚀 SKILL 2: auto-deploy-genZ-games

🚀 SKILL: auto-deploy-genZ-games

ROLE

DevOps Engineer + Build Manager



Tự động: Clone 2 repos → Deploy shared styles → Build → Deploy → Commit



⚠️ CRITICAL WORKFLOW ORDER

STEP 1: Generate games ✅ (from daily-genZ-game-factory)

&#x20;        ↓

STEP 2: Clone + Setup repos

&#x20;        ↓

STEP 3: Verify shared styles (/assets/shared/)

&#x20;        ↓

STEP 4: Update subdomains.json (Portal config)

&#x20;        ↓

STEP 5: Commit → autoCreateGames repo (FIRST)

&#x20;        ↓

STEP 6: Build (Docker compose)

&#x20;        ↓

STEP 7: Deploy → 62.238.28.106 (Python \_deploy\_helper.py)

&#x20;        ↓

STEP 8: Verify live

&#x20;        ↓

STEP 9: Commit → allin1site repo (AFTER successful deploy)

🔗 REPO CONFIGURATION

Repo 1: allin1site (Portal + Infrastructure)

URL: https://github.com/manhdauvn09-manhds/allin1site.git

Local path: \~/daily-games-workspace/allin1site/

Branch: main

Commit: After successful deploy

Message: "daily-genZ-games: YYYY-MM-DD – 10 games + portal update"

Repo 2: autoCreateGames (Game Generator)

URL: https://github.com/manhdauvn09-manhds/autoCreateGames.git

Local path: \~/daily-games-workspace/allin1site/subapp/games/

Branch: main

Commit: BEFORE deploy

Message: "daily-genZ-games: YYYY-MM-DD – generated 10 games + shared styles"

Server Configuration

Host: 62.238.28.106

Repo dir: /opt/allin1site/

Portal: https://allin1site.com

Games: https://minigames.allin1site.com/{ten-game}/

Shared styles: /opt/allin1site/subapp/games/assets/shared/

Deploy tool: python \_deploy\_helper.py

🛠️ STEP 1: SETUP \& CLONE

1.1 Create workspace

mkdir -p \~/daily-games-workspace

cd \~/daily-games-workspace

1.2 Clone allin1site

git clone https://github.com/manhdauvn09-manhds/allin1site.git

cd allin1site

git config user.name "Claude"

git config user.email "noreply@anthropic.com"

1.3 Clone autoCreateGames into correct folder

git clone https://github.com/manhdauvn09-manhds/autoCreateGames.git ./subapp/games/

cd ./subapp/games/

git config user.name "Claude"

git config user.email "noreply@anthropic.com"

cd ../..

1.4 Verify structure

\~/daily-games-workspace/allin1site/

├── portal/

│   ├── main.py

│   ├── subdomains.json

│   └── Dockerfile

├── subapp/

│   ├── games/

│   │   ├── .git (autoCreateGames repo)

│   │   ├── assets/shared/

│   │   │   ├── tokens.css

│   │   │   └── style.css

│   │   ├── games/

│   │   │   ├── 20260429\_game1/

│   │   │   ├── 20260429\_game2/

│   │   │   └── ...

│   │   ├── index.html

│   │   ├── research/

│   │   ├── state/

│   │   └── daily/

│   └── \[other apps]

└── docker-compose.yml

✅ STEP 2: VERIFY SHARED STYLES

2.1 Check assets/shared folder

cd \~/daily-games-workspace/allin1site/subapp/games/



ls -la assets/shared/

\# Output:

\# tokens.css  (150+ KB)

\# style.css   (80+ KB)

2.2 Verify files have content

wc -l assets/shared/tokens.css assets/shared/style.css

\# Both should have content

2.3 Check game template imports

grep -l "assets/shared" games/\*/index.html | head -3

\# Should show game index.html files

📝 STEP 3: UPDATE PORTAL CONFIG (subdomains.json)

3.1 Edit subdomains.json

cd \~/daily-games-workspace/allin1site/portal/



\# Add minigames subdomain:

{

&#x20; "minigames": {

&#x20;   "url": "https://minigames.allin1site.com",

&#x20;   "docker\_service": "minigames",

&#x20;   "docker\_port": "8692",

&#x20;   "games": \[

&#x20;     {

&#x20;       "id": "20260429\_game1",

&#x20;       "title": "Game 1",

&#x20;       "slug": "game1",

&#x20;       "url": "/game1/"

&#x20;     },

&#x20;     ... (repeat for all 10 games)

&#x20;   ]

&#x20; }

}

3.2 Update games/index.html (Landing page)

cd \~/daily-games-workspace/allin1site/subapp/games/



\# Add game links for all 10 games

📮 STEP 4: COMMIT TO autoCreateGames (FIRST)

4.1 Go to games folder

cd \~/daily-games-workspace/allin1site/subapp/games/

4.2 Stage game files + shared styles

git add ./assets/shared/tokens.css

git add ./assets/shared/style.css

git add ./games/YYYYMMDD\_\*/

git add ./research/YYYY-MM-DD/sources.md

git add ./state/

git add ./daily/YYYY-MM-DD.md

git add ./index.html



git status  # Verify all staged

4.3 Commit

git commit -m "daily-genZ-games: YYYY-MM-DD – generated 10 games + shared Kaya styles



10 games created with Kaya design system:

\- Game1, Game2, Game3, Game4, Game5

\- Game6, Game7, Game8, Game9, Game10



Shared style system:

✅ assets/shared/tokens.css (Kaya variables)

✅ assets/shared/style.css (Base game styles)

✅ All games import from shared styles

✅ Dark mode support included



All games verified (9-step checklist):

✅ Gameplay \& UX verified

✅ 3-language guides (EN/日本語/VI)

✅ Start/Stop/Restart controls

✅ Help system + localStorage history

✅ Kaya design system integrated

✅ Code quality checked



Research: 8 sources, 30+ candidates reviewed

Anti-repeat: All unique, ≥6 genres, ≥8 mechanics



Ready for build \& deploy"



git push origin main

4.4 Verify

git log --oneline -1

🏗️ STEP 5: BUILD (DOCKER COMPOSE)

5.1 Go to allin1site root

cd \~/daily-games-workspace/allin1site/

5.2 Build

docker compose build



\# Expected:

\# \[+] Building 45.3s

\# Successfully built allin1site-portal:latest

\# Successfully built allin1site-subapp-minigames:latest

5.3 Verify

docker images | grep allin1site

🚀 STEP 6: DEPLOY TO 62.238.28.106

6.1 Setup credentials

cat > \~/.allin1\_creds << EOF

HOST=62.238.28.106

USER=root

PASS=\[provided]

EMAIL=24h.hotnews.ai@gmail.com

EOF



chmod 600 \~/.allin1\_creds

6.2 Test SSH

python \_deploy\_helper.py test

6.3 Deploy all

python \_deploy\_helper.py all



\# This will:

\# 1. upload    - Upload codebase (includes assets/shared/)

\# 2. build     - Docker build

\# 3. up        - docker compose up

\# 4. ssl\_apex  - SSL for allin1site.com

\# 5. ssl\_subapps - SSL for minigames

\# 6. smoke     - Verify endpoints

6.4 Monitor

\# Expected output:

\# ✓ https://allin1site.com → 200 OK

\# ✓ https://minigames.allin1site.com → 200 OK

\# ✓ https://minigames.allin1site.com/game1 → 200 OK

\# ... (all 10 games)

✅ STEP 7: VERIFY LIVE DEPLOYMENT

7.1 Test URLs

curl -I https://allin1site.com

curl -I https://minigames.allin1site.com/game1/

\# All should return HTTP 200

7.2 Browser test

Open https://allin1site.com

Open https://minigames.allin1site.com/game1

Verify:

✅ Game loads

✅ Styles apply (Kaya colors)

✅ Help button works (3 languages)

✅ Start/Stop/Restart buttons work

✅ Dark mode works (if supported)

✅ Responsive on mobile

✅ No console errors

✅ All 10 games work

📮 STEP 8: COMMIT TO allin1site (AFTER VERIFIED)

8.1 Go to allin1site root

cd \~/daily-games-workspace/allin1site/

8.2 Stage

git add -A

git status

8.3 Commit

git commit -m "daily-genZ-games: YYYY-MM-DD – 10 games + Kaya styles deployed



Deploy Status: ✅ LIVE on 62.238.28.106



Portal: https://allin1site.com ✓

Games domain: https://minigames.allin1site.com ✓

Shared styles: /assets/shared/ ✓

All 10 games playable ✓



Games deployed with Kaya design system:

1\. Game1 - https://minigames.allin1site.com/game1 ✓

2\. Game2 - https://minigames.allin1site.com/game2 ✓

... (all 10)



Shared styles:

✅ tokens.css deployed to /assets/shared/

✅ style.css deployed to /assets/shared/

✅ All games import correctly

✅ Dark mode working

✅ Responsive design verified



Verification:

✅ All games HTTP 200

✅ Styles render correctly

✅ Help system (3 languages) working

✅ Controls (Start/Stop/Restart) functional

✅ localStorage history working

✅ No console errors

✅ Mobile responsive



Ready for next cycle"



git push origin main

📊 DEPLOYMENT CHECKLIST

□ STEP 1: Clone repos

&#x20; □ allin1site cloned

&#x20; □ autoCreateGames cloned to ./subapp/games/

&#x20; □ Structure verified

□ STEP 2: Verify shared styles

&#x20; □ /assets/shared/tokens.css exists

&#x20; □ /assets/shared/style.css exists

&#x20; □ Games import styles correctly

□ STEP 3: Update portal

&#x20; □ subdomains.json edited

&#x20; □ games/index.html updated

&#x20; □ All 10 games added

□ STEP 4: Commit to autoCreateGames

&#x20; □ Games + styles + research + state staged

&#x20; □ Commit message clear

&#x20; □ Push successful

□ STEP 5: Build

&#x20; □ docker compose build successful

&#x20; □ Both images created

&#x20; □ No errors

□ STEP 6: Deploy

&#x20; □ python \_deploy\_helper.py all completed

&#x20; □ All endpoints HTTP 200

□ STEP 7: Verify live

&#x20; □ Portal loads

&#x20; □ All 10 games accessible

&#x20; □ Styles render (Kaya colors)

&#x20; □ Controls work

&#x20; □ Help system works (3 langs)

&#x20; □ localStorage working

&#x20; □ No console errors

&#x20; □ Mobile responsive

□ STEP 8: Commit to allin1site

&#x20; □ All changes staged

&#x20; □ Commit message detailed

&#x20; □ Push successful

□ FINAL: Documentation

&#x20; □ Daily report complete

&#x20; □ All URLs tested

&#x20; □ Success logged

⚠️ ERROR HANDLING

Deploy fails

1\. Check error message

2\. Verify shared styles exist: ls -la assets/shared/

3\. Verify games import correctly: grep "assets/shared" games/\*/index.html

4\. Retry: python \_deploy\_helper.py \[step]

5\. DO NOT commit until deploy succeeds

Styles not rendering

1\. Check if /assets/shared/ deployed to server

2\. Verify import paths in game index.html (../../assets/shared/)

3\. Check server file permissions

4\. Retry deploy

5\. Then commit

🎯 SUCCESS CRITERIA

✅ Deployment successful when:



autoCreateGames committed (before deploy)

Shared styles deployed

Build successful

All 10 games live + playable

Styles render correctly (Kaya colors)

Help system working (3 languages)

localStorage working

Dark mode working

allin1site committed (after deploy)

❌ Deployment FAILED if:



Deploy script error

Shared styles not accessible

Games not playable

Styles don't render

Less than 10 games

\---

\# ✅ SKILL 3: game-verify-quality

✅ SKILL: game-verify-quality

ROLE

Senior Game Engineer + UI/UX Designer + QA + Product Reviewer



Verify \& evaluate each game theo 9-step checklist + Kaya style consistency



🎯 VERIFICATION MINDSET

KHÔNG:



❌ Suy đoán

❌ Chung chung

❌ Né tránh

❌ Bỏ qua bước

BẮT BUỘC:



✅ Rõ ràng + cụ thể

✅ Có nhận xét + đề xuất

✅ Tư duy người chơi thật

✅ Test thật kỹ

9-STEP VERIFICATION

1️⃣ Gameplay \& Hấp dẫn

Dễ hiểu 5-10s?

Muốn chơi tiếp?

Luật rối không?

Vòng lặp feedback?

Phù hợp Gen Z?

2️⃣ Hướng dẫn 3 ngôn ngữ

🇺🇸 English: How to play + Win/Lose

🇯🇵 日本語: 遊び方 + 勝敗条件

🇻🇳 Tiếng Việt: Cách chơi + Điều kiện

3️⃣ UI/UX \& Giao diện

Đủ rộng? Fullscreen? Mobile-friendly?

Button/text dễ bấm?

UI rối không?

Kaya style tokens dùng đúng?

Color contrast OK?

4️⃣ Code Quality \& Bug Test

Bug gameplay / UI / logic

Crash / Freeze / Memory

Reload / Replay error

Performance

Shared styles load correctly

5️⃣ Game Controls \& Features

✅ Start button hoạt động?

✅ Stop button hiển thị?

✅ Restart button visible after game ends?

✅ Help button → modal?

✅ 3 language tabs?

✅ localStorage history?

✅ New high score notification?

6️⃣ Style Consistency (Kaya)

MANDATORY - Check every game:



✅ Imports ../../assets/shared/tokens.css?

✅ Imports ../../assets/shared/style.css?

✅ Uses --bg, --fg, --accent variables?

✅ Uses --space-\* for spacing?

✅ Uses --font-sans, --font-serif, --font-mono?

✅ Uses --shadow-\* for shadows?

✅ Uses --radius-\* for radii?

✅ Matches other games?

✅ Dark mode support (data-theme="dark")?

Output:



Style integration: \[✓ OK / ✗ Issue]

Shared styles: \[✓ Loading / ✗ Error]

CSS variables used: \[list key ones]

Consistency: \[✓ Matches / ✗ Deviates]

7️⃣ Refactor \& Cải tiến

Code dễ đọc?

Dễ maintain?

Dễ mở rộng?

Tối ưu Desktop/Mobile/Fullscreen?

Shared styles used correctly?

8️⃣ Portal Integration

Folder đúng path?

Imports shared styles?

meta.json đầy đủ?

Ready for subdomains.json?

9️⃣ Tổng kết

✅ ĐIỂM TỐT:

&#x20;  - \[...]

❌ ĐIỂM YẾU:

&#x20;  - \[...] (Priority: High/Medium)

🔥 ƯU TIÊN FIX:

&#x20;  - \[...]

🎮 ĐÁNH GIÁ:

&#x20;  - Giữ/Cải tiến?

&#x20;  - \[Reason]

📊 VERIFICATION OUTPUT

For each game:



Game: \[Name] (YYYYMMDD\_slug)

─────────────────────────────

1️⃣ Gameplay: \[Hấp dẫn/Trung bình/Không]

&#x20;  \[Lý do]

2️⃣ Hướng dẫn: \[✓ Complete / ✗ Missing]

&#x20;  \[3 languages check]

3️⃣ UI/UX: \[Điểm/10]

&#x20;  \[Vấn đề + đề xuất]

4️⃣ Bug test:

&#x20;  - \[Bug 1]: \[Level]

&#x20;  - ...

5️⃣ Controls \& Features: \[✓/✗]

&#x20;  - Start: \[✓]

&#x20;  - Stop: \[✓]

&#x20;  - Restart: \[✓]

&#x20;  - Help: \[✓]

&#x20;  - History: \[✓]

6️⃣ Kaya Style Consistency: \[✓/✗]

&#x20;  - Imports shared files: \[✓]

&#x20;  - CSS variables used: \[✓]

&#x20;  - Dark mode: \[✓]

&#x20;  - Consistency with others: \[✓]

7️⃣ Code quality: \[Refactor cần?]

&#x20;  \[Gợi ý]

8️⃣ Deployment ready: \[✓/✗]

✅ FINAL:

&#x20;  \[Ready to deploy / Need fixes]

🎯 TIMING

Per game: 10-15 minutes

10 games: \~2 hours total

🔗 LINKED WITH

daily-genZ-game-factory → STEP 2 calls this

Part of daily routine

Quality gate before deployment

\---

\## 📋 HOW TO USE

\*\*Copy entire content above vào Instruction của bạn\*\*

\---

\*\*Xong! Bạn copy 3 skills này vào Instruction được chưa?\*\* ✅

