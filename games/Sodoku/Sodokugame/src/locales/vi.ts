// Vietnamese strings. Default locale; English + Japanese are stubbed
// in en.ts / ja.ts with the same key shape and Phase 4 will fill them.

export interface Strings {
  app: { title: string; tagline: string };
  difficulty: { label: string; 1: string; 2: string; 3: string; 4: string; 5: string };
  game: {
    newGame: string; pause: string; resume: string;
    hint: string; undo: string; redo: string; notes: string;
    erase: string; timer: string; mistakes: string; hintsUsed: string;
    won: string; lost: string;
    dailyChallenge: string; leaderboard: string;
  };
  auth: { notSignedIn: string; signIn: string; signOut: string };
  theme: { label: string; light: string; dark: string; auto: string };
  errors: { generic: string; network: string; invalidPuzzle: string };
}

export const vi: Strings = {
  app: {
    title: 'Sodoku',
    tagline: 'Sudoku 9x9 — chơi ngay trên trình duyệt',
  },
  difficulty: {
    label: 'Độ khó',
    1: 'Dễ',
    2: 'Vừa',
    3: 'Khó',
    4: 'Chuyên gia',
    5: 'Bậc thầy',
  },
  game: {
    newGame: 'Ván mới',
    pause: 'Tạm dừng',
    resume: 'Tiếp tục',
    hint: 'Gợi ý',
    undo: 'Hoàn tác',
    redo: 'Làm lại',
    notes: 'Ghi chú',
    erase: 'Xoá',
    timer: 'Thời gian',
    mistakes: 'Lỗi',
    hintsUsed: 'Gợi ý đã dùng',
    won: 'Hoàn thành!',
    lost: 'Đã hết lượt sai',
    dailyChallenge: 'Thử thách hôm nay',
    leaderboard: 'Bảng xếp hạng',
  },
  auth: {
    notSignedIn: 'Chưa đăng nhập',
    signIn: 'Đăng nhập',
    signOut: 'Đăng xuất',
  },
  theme: {
    label: 'Chế độ',
    light: 'Sáng',
    dark: 'Tối',
    auto: 'Tự động',
  },
  errors: {
    generic: 'Đã có lỗi xảy ra. Vui lòng thử lại.',
    network: 'Mất kết nối mạng. Đang thử lại…',
    invalidPuzzle: 'Câu đố không hợp lệ.',
  },
};
