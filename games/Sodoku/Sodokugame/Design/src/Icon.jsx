/* Icon components — Lucide-style inline SVGs. 1.5px stroke, currentColor.
   Kept minimal — only what the Sudoku app actually uses. */
(function () {
  'use strict';

  const s = {
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.75,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
  };

  function mk(paths, size = 20) {
    return function Icon({ size: sz = size, ...rest }) {
      return (
        <svg xmlns="http://www.w3.org/2000/svg" width={sz} height={sz} viewBox="0 0 24 24" {...s} {...rest}>
          {paths}
        </svg>
      );
    };
  }

  const Icon = {
    ChevronLeft: mk(<polyline points="15 18 9 12 15 6" />),
    ChevronRight: mk(<polyline points="9 18 15 12 9 6" />),
    Pause: mk(<><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></>),
    Play: mk(<polygon points="6 4 20 12 6 20 6 4" />),
    Undo: mk(<><path d="M3 7v6h6" /><path d="M21 17a9 9 0 0 0-15-6.7L3 13" /></>),
    Eraser: mk(<><path d="M19 14 9 4 3 10l10 10h6" /><path d="m8 10 6 6" /></>),
    Pencil: mk(<><path d="M12 20h9" /><path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4z" /></>),
    Lightbulb: mk(<><path d="M15 14c.2-1 .7-1.7 1.5-2.5C17.7 10.3 18 9 18 7.5a6 6 0 0 0-12 0c0 1.5.3 2.8 1.5 4 .8.8 1.3 1.5 1.5 2.5" /><path d="M9 18h6" /><path d="M10 22h4" /></>),
    Home: mk(<><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><polyline points="9 22 9 12 15 12 15 22" /></>),
    Chart: mk(<><path d="M3 3v18h18" /><path d="m7 14 4-4 4 4 5-5" /></>),
    Settings: mk(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .3 1.8l.1.1a2 2 0 0 1-2.8 2.8l-.1-.1a1.65 1.65 0 0 0-1.8-.3 1.65 1.65 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.65 1.65 0 0 0-1-1.5 1.65 1.65 0 0 0-1.8.3l-.1.1a2 2 0 0 1-2.8-2.8l.1-.1a1.65 1.65 0 0 0 .3-1.8 1.65 1.65 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.65 1.65 0 0 0 1.5-1 1.65 1.65 0 0 0-.3-1.8l-.1-.1a2 2 0 0 1 2.8-2.8l.1.1a1.65 1.65 0 0 0 1.8.3h0a1.65 1.65 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.65 1.65 0 0 0 1 1.5 1.65 1.65 0 0 0 1.8-.3l.1-.1a2 2 0 0 1 2.8 2.8l-.1.1a1.65 1.65 0 0 0-.3 1.8v0a1.65 1.65 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.65 1.65 0 0 0-1.5 1z" /></>),
    Calendar: mk(<><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></>),
    Trophy: mk(<><path d="M8 21h8" /><path d="M12 17v4" /><path d="M7 4h10v5a5 5 0 0 1-10 0z" /><path d="M17 4h3v3a3 3 0 0 1-3 3" /><path d="M7 4H4v3a3 3 0 0 0 3 3" /></>),
    X: mk(<><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></>),
    Check: mk(<polyline points="20 6 9 17 4 12" />),
    Share: mk(<><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><line x1="8.6" y1="13.5" x2="15.4" y2="17.5" /><line x1="15.4" y1="6.5" x2="8.6" y2="10.5" /></>),
    Flame: mk(<path d="M8.5 14.5A2.5 2.5 0 0 0 11 17c1.7 0 3-1.2 3-3 0-1.4-1-2-1-4s1-3 1-3-2 0-3 2c0-2-1.5-3-1.5-3S8 6 8 10s-1.5 2.5-1.5 4a4.5 4.5 0 0 0 9 0c0-2-2-3-2-3" />),
    Star: mk(<polygon points="12 2 15 9 22 9.5 17 14.5 18.5 22 12 18 5.5 22 7 14.5 2 9.5 9 9" />),
    Clock: mk(<><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></>),
    ArrowLeft: mk(<><line x1="19" y1="12" x2="5" y2="12" /><polyline points="12 19 5 12 12 5" /></>),
    Target: mk(<><circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" /></>),
    Lock: mk(<><rect x="3" y="11" width="18" height="11" rx="2" ry="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></>),
    Sparkles: mk(<><path d="M12 3v4" /><path d="M12 17v4" /><path d="M3 12h4" /><path d="M17 12h4" /><path d="m5.6 5.6 2.8 2.8" /><path d="m15.6 15.6 2.8 2.8" /><path d="m5.6 18.4 2.8-2.8" /><path d="m15.6 8.4 2.8-2.8" /></>),
    Sun: mk(<><circle cx="12" cy="12" r="4" /><path d="M12 2v2" /><path d="M12 20v2" /><path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" /><path d="M2 12h2" /><path d="M20 12h2" /><path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" /></>),
    Moon: mk(<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />),
    Monitor: mk(<><rect x="2" y="3" width="20" height="14" rx="2" ry="2" /><line x1="8" y1="21" x2="16" y2="21" /><line x1="12" y1="17" x2="12" y2="21" /></>),
  };

  window.Icon = Icon;
})();
