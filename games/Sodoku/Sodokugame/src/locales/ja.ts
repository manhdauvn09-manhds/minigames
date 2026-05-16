// Japanese locale stub — Phase 4 will fill these. Keys must match
// `Strings` type from vi.ts.

import type { Strings } from './vi';

export const ja: Strings = {
  app: { title: '数独', tagline: '数独 9x9 — ブラウザで今すぐプレイ' },
  difficulty: {
    label: '難易度',
    1: 'やさしい', 2: 'ふつう', 3: 'むずかしい', 4: 'エキスパート', 5: 'マスター',
  },
  game: {
    newGame: '新しいゲーム', pause: '一時停止', resume: '再開',
    hint: 'ヒント', undo: '元に戻す', redo: 'やり直す', notes: 'メモ',
    erase: '消去', timer: '時間', mistakes: 'ミス',
    hintsUsed: '使用したヒント',
    won: 'クリア！', lost: 'ミスの上限に達しました',
    dailyChallenge: '今日のチャレンジ', leaderboard: 'ランキング',
  },
  auth: { notSignedIn: '未ログイン', signIn: 'ログイン', signOut: 'ログアウト' },
  theme: { label: 'テーマ', light: 'ライト', dark: 'ダーク', auto: '自動' },
  errors: {
    generic: 'エラーが発生しました。もう一度お試しください。',
    network: 'ネットワークエラー。再試行中…',
    invalidPuzzle: '無効なパズルです。',
  },
};
