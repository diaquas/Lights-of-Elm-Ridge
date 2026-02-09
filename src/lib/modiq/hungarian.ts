/**
 * Hungarian Algorithm (Kuhn-Munkres) for Optimal Assignment
 *
 * Solves the assignment problem: given an M×N score matrix,
 * find a one-to-one assignment of rows to columns that maximizes
 * the total score, with no row or column used more than once.
 *
 * This implementation handles rectangular matrices (M ≠ N).
 * When M > N (more sources than dests), some sources stay unassigned.
 * When M < N (more dests than sources), some dests stay unassigned.
 *
 * Time complexity: O(n³) where n = max(M, N)
 */

/**
 * Solve the optimal assignment problem for a score matrix.
 *
 * @param scores - M×N score matrix where scores[i][j] is the score
 *   for assigning source i to dest j. Higher = better.
 * @returns Array of [sourceIdx, destIdx] pairs representing the
 *   optimal one-to-one assignment that maximizes total score.
 *   Only includes assignments where the score > 0.
 */
export function hungarianMaximize(
  scores: number[][],
): [number, number][] {
  const M = scores.length;
  if (M === 0) return [];
  const N = scores[0].length;
  if (N === 0) return [];

  // Convert maximization → minimization by negating scores.
  // Pad to square matrix if rectangular (extra rows/cols get cost 0,
  // which means score 0 — they won't be preferred over real matches).
  const n = Math.max(M, N);
  const cost: number[][] = Array.from({ length: n }, (_, i) =>
    Array.from({ length: n }, (_, j) =>
      i < M && j < N ? -scores[i][j] : 0,
    ),
  );

  // ── Kuhn-Munkres (Hungarian) Algorithm ──
  // Uses the O(n³) formulation with potential arrays.

  // u[i] = potential for row i, v[j] = potential for column j
  // p[j] = row assigned to column j (1-indexed; 0 = unassigned)
  // way[j] = previous column in augmenting path

  const INF = Number.MAX_SAFE_INTEGER;
  const u = new Float64Array(n + 1);
  const v = new Float64Array(n + 1);
  const p = new Int32Array(n + 1); // p[j] = assigned row for col j (1-indexed)
  const way = new Int32Array(n + 1);

  for (let i = 1; i <= n; i++) {
    // Start augmenting path from row i
    p[0] = i;
    let j0 = 0; // "virtual" column 0
    const minv = new Float64Array(n + 1).fill(INF);
    const used = new Uint8Array(n + 1);

    // Find augmenting path
    do {
      used[j0] = 1;
      const i0 = p[j0];
      let delta = INF;
      let j1 = 0;

      for (let j = 1; j <= n; j++) {
        if (used[j]) continue;
        const cur = cost[i0 - 1][j - 1] - u[i0] - v[j];
        if (cur < minv[j]) {
          minv[j] = cur;
          way[j] = j0;
        }
        if (minv[j] < delta) {
          delta = minv[j];
          j1 = j;
        }
      }

      // Update potentials
      for (let j = 0; j <= n; j++) {
        if (used[j]) {
          u[p[j]] += delta;
          v[j] -= delta;
        } else {
          minv[j] -= delta;
        }
      }

      j0 = j1;
    } while (p[j0] !== 0);

    // Trace back augmenting path and update assignments
    do {
      const j1 = way[j0];
      p[j0] = p[j1];
      j0 = j1;
    } while (j0 !== 0);
  }

  // Extract assignments (convert back to 0-indexed)
  // Only include assignments that are within original matrix bounds
  // and have a positive score.
  const result: [number, number][] = [];
  for (let j = 1; j <= n; j++) {
    const row = p[j] - 1;
    const col = j - 1;
    if (row < M && col < N && scores[row][col] > 0) {
      result.push([row, col]);
    }
  }

  return result;
}
