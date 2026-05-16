// Sanity demo — generate one puzzle per difficulty level, print stats.
//
// Run with:  npx tsx scripts/demo-generate.ts
//
// Phase 2 perf targets:
//   L1-L3 < 500ms, L4 < 2s, L5 < 5s
// (with our bitmask + MRV + propagation, expected actual: <50ms / <300ms /
//  <800ms on a modern laptop).

import { generatePuzzle } from '../src/core/generator';
import { solveWithTechniques } from '../src/core/solver';
import type { DifficultyLevel } from '../src/core/types';

function fmt(b: (number | null)[][]): string {
  return b.map((row, r) => {
    const cells = row.map((v) => (v == null ? '.' : String(v))).join(' ');
    const sep = (r + 1) % 3 === 0 && r < 8 ? '\n' + '─'.repeat(21) : '';
    // Insert vertical seps every 3 cols.
    const withV = cells.replace(/(\d|\.) (\d|\.) (\d|\.) /g, '$1 $2 $3 │ ');
    return withV + sep;
  }).join('\n');
}

for (const level of [1, 2, 3, 4, 5] as DifficultyLevel[]) {
  const t0 = performance.now();
  const p = generatePuzzle(level, `demo-L${level}`);
  const dt = (performance.now() - t0).toFixed(1);

  const clues = p.initialBoard.flat().filter((v) => v != null).length;

  const trace = solveWithTechniques(p.initialBoard, level);
  const stepCounts = trace.steps.reduce<Record<string, number>>((acc, s) => {
    acc[s.technique] = (acc[s.technique] ?? 0) + 1;
    return acc;
  }, {});

  console.log(`\n=== Level ${level} ===`);
  console.log(`  seed:               ${p.seed}`);
  console.log(`  clues:              ${clues}`);
  console.log(`  hardest technique:  ${p.hardestTechnique}`);
  console.log(`  generated in:       ${dt} ms`);
  console.log(`  solve trace steps:  ${trace.steps.length}`);
  Object.entries(stepCounts).forEach(([k, v]) => console.log(`    ${k}: ${v}`));
  console.log(`  initial board:`);
  console.log(fmt(p.initialBoard).split('\n').map((l) => '    ' + l).join('\n'));
}
