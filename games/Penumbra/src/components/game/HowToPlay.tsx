/**
 * Detailed how-to-play instructions, rendered below the board on every
 * play screen (level + daily). Vietnamese-first since spec.i18n.defaultLocale
 * is "vi"; skill #5 will swap to next-intl-driven strings.
 */
export function HowToPlay() {
  return (
    <section className="w-full max-w-md mx-auto mt-8 mb-4 space-y-4 text-sm text-fg-secondary">
      <h2 className="font-display text-2xl text-fg-primary text-center">Cách chơi</h2>

      {/* Mục tiêu */}
      <div className="rounded-md bg-bg-elevated p-4 border border-border-subtle">
        <h3 className="font-display text-lg text-accent mb-2">🎯 Mục tiêu</h3>
        <p>
          Vẽ một <strong>đường liên tục</strong> nối 2 ngọn đèn{" "}
          <span className="text-accent">◉</span> trên bảng. Đường phải:
        </p>
        <ul className="list-disc pl-5 mt-2 space-y-1">
          <li>Đi qua <strong>tất cả</strong> các ô sáng <span className="text-cell-bright">◆</span></li>
          <li>Né hết các ô tối <span className="opacity-60">⬛</span></li>
          <li>Không tự cắt nhau (mỗi ô chỉ đi qua 1 lần)</li>
          <li>Chỉ di chuyển <strong>ngang/dọc</strong>, không đi chéo</li>
        </ul>
      </div>

      {/* Loại ô */}
      <div className="rounded-md bg-bg-elevated p-4 border border-border-subtle">
        <h3 className="font-display text-lg text-accent mb-2">🔲 Loại ô</h3>
        <ul className="space-y-2">
          <li className="flex items-start gap-3">
            <span className="text-2xl text-accent leading-none">◉</span>
            <span>
              <strong>Ngọn đèn</strong> — điểm bắt đầu / kết thúc. Mỗi puzzle có
              đúng 2 ngọn. Bấm 1 ngọn để bắt đầu vẽ.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="text-xl text-cell-bright leading-none">◆</span>
            <span>
              <strong>Ô sáng</strong> — đường <em>bắt buộc</em> phải đi qua. Bỏ
              sót ô nào = chưa hoàn thành.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="inline-block w-5 h-5 bg-cell-empty border border-border-subtle rounded-sm flex-shrink-0 mt-0.5"></span>
            <span>
              <strong>Ô trống</strong> — đường có thể đi qua tùy ý.
            </span>
          </li>
          <li className="flex items-start gap-3">
            <span className="inline-block w-5 h-5 bg-cell-void rounded-sm flex-shrink-0 mt-0.5"></span>
            <span>
              <strong>Ô tối</strong> — không được phép đi qua. Đường chạm vào sẽ
              bị từ chối.
            </span>
          </li>
        </ul>
      </div>

      {/* Thao tác */}
      <div className="rounded-md bg-bg-elevated p-4 border border-border-subtle">
        <h3 className="font-display text-lg text-accent mb-2">👆 Thao tác</h3>
        <ul className="space-y-2">
          <li>
            <strong>Bắt đầu</strong>: bấm vào 1 ngọn đèn <span className="text-accent">◉</span>{" "}
            để chọn điểm xuất phát.
          </li>
          <li>
            <strong>Kéo dài đường</strong>: bấm hoặc kéo (drag) qua các ô liền kề.
            Đường chỉ kéo dài được nếu ô đó hợp lệ (không phải ô tối, chưa đi qua).
          </li>
          <li>
            <strong>Lùi 1 bước</strong>: bấm vào ô <em>cuối cùng</em> trên đường,
            hoặc bấm <kbd className="px-1.5 py-0.5 rounded bg-surface-soft border border-border-subtle text-xs">Undo</kbd>{" "}
            ở thanh dưới board.
          </li>
          <li>
            <strong>Vẽ lại từ đầu</strong>: bấm{" "}
            <kbd className="px-1.5 py-0.5 rounded bg-surface-soft border border-border-subtle text-xs">Reset</kbd>.
          </li>
          <li>
            <strong>Hoàn thành</strong>: khi đường chạm vào ngọn đèn còn lại{" "}
            <em>và</em> đã đi qua hết ô sáng → màn celebration tự bật.
          </li>
        </ul>
      </div>

      {/* Hint */}
      <div className="rounded-md bg-bg-elevated p-4 border border-border-subtle">
        <h3 className="font-display text-lg text-accent mb-2">💡 Hint (gợi ý)</h3>
        <p>3 cấp gợi ý — dùng càng cao càng tốn hint balance:</p>
        <ul className="space-y-2 mt-2">
          <li>
            <strong className="text-fg-primary">Tier 1 — Highlight (miễn phí)</strong>:
            làm sáng 1 ô <span className="text-cell-bright">◆</span> mà bạn chưa đi qua.
            Không ảnh hưởng số sao.
          </li>
          <li>
            <strong className="text-fg-primary">Tier 2 — Next move (-1 hint)</strong>:
            gợi ý ô tiếp theo nên đi từ vị trí hiện tại. Dùng = max 1 sao.
          </li>
          <li>
            <strong className="text-fg-primary">Tier 3 — AI explain (-2 hints)</strong>:
            giải thích bằng câu chữ. Dùng = max 1 sao.
          </li>
        </ul>
        <p className="mt-2 text-xs text-fg-muted">
          Bắt đầu có 3 hints. Mỗi lần solve 3 sao được +1 hint (max 20).
        </p>
      </div>

      {/* Star rating */}
      <div className="rounded-md bg-bg-elevated p-4 border border-border-subtle">
        <h3 className="font-display text-lg text-accent mb-2">⭐ Số sao</h3>
        <ul className="space-y-1">
          <li>
            <span className="text-accent">★ ★ ★</span> — đường đi đúng <strong>độ dài tối ưu</strong>{" "}
            (ngắn nhất có thể) + <strong>không dùng Tier 2/3</strong>.
          </li>
          <li>
            <span className="text-accent">★ ★</span>
            <span className="text-fg-disabled"> ★</span> — solve mà <strong>không dùng Tier 2/3</strong>{" "}
            (đường có thể dài hơn tối ưu).
          </li>
          <li>
            <span className="text-accent">★</span>
            <span className="text-fg-disabled"> ★ ★</span> — solve nhưng có dùng Tier 2 hoặc Tier 3.
          </li>
        </ul>
      </div>

      {/* Tips */}
      <div className="rounded-md bg-bg-elevated p-4 border border-border-subtle">
        <h3 className="font-display text-lg text-accent mb-2">🧠 Mẹo</h3>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            Trước khi vẽ, đếm xem có bao nhiêu ô sáng <span className="text-cell-bright">◆</span>.
            Đường <em>tối thiểu</em> phải đi qua tất cả, nên nó dài ít nhất ≥ (số sáng + 2 đèn).
          </li>
          <li>
            Quan sát ngọn đèn ở góc — chỉ có 1-2 ô lân cận hợp lệ → bắt đầu hoặc kết thúc thường
            ép buộc, dễ mò ngược.
          </li>
          <li>
            Ô sáng nằm sát ô tối thường chỉ có 1 hướng vào/ra → suy được trật tự đường ngay.
          </li>
          <li>
            Bị bí giữa chừng? Bấm Undo lùi vài bước rồi đi hướng khác — thay vì Reset từ đầu.
          </li>
          <li>
            Daily puzzle giống nhau cho mọi người trong ngày → solve sớm để giữ chuỗi streak 🔥.
          </li>
        </ul>
      </div>
    </section>
  );
}
