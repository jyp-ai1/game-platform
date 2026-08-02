/** Mini Golf 9-hole course — par progression per original. */
export interface MiniGolfHoleDef {
  holeIndex: number;
  ballX: number;
  ballY: number;
  holeX: number;
  holeY: number;
  par: number;
  label: string;
}

export const MINI_GOLF_COURSE: MiniGolfHoleDef[] = [
  { holeIndex: 1, ballX: 12, ballY: 50, holeX: 88, holeY: 50, par: 3, label: "Straight" },
  { holeIndex: 2, ballX: 15, ballY: 75, holeX: 85, holeY: 25, par: 4, label: "Dogleg" },
  { holeIndex: 3, ballX: 50, ballY: 85, holeX: 50, holeY: 15, par: 3, label: "Center" },
  { holeIndex: 4, ballX: 10, ballY: 30, holeX: 90, holeY: 70, par: 4, label: "Diagonal" },
  { holeIndex: 5, ballX: 20, ballY: 50, holeX: 80, holeY: 50, par: 2, label: "Short" },
  { holeIndex: 6, ballX: 85, ballY: 20, holeX: 15, holeY: 80, par: 5, label: "Long" },
  { holeIndex: 7, ballX: 50, ballY: 15, holeX: 50, holeY: 85, par: 3, label: "Vertical" },
  { holeIndex: 8, ballX: 25, ballY: 60, holeX: 75, holeY: 40, par: 4, label: "Curve" },
  { holeIndex: 9, ballX: 15, ballY: 50, holeX: 85, holeY: 50, par: 3, label: "Finale" },
];

export function getMiniGolfHole(holeIndex: number): MiniGolfHoleDef {
  return MINI_GOLF_COURSE[Math.min(holeIndex - 1, MINI_GOLF_COURSE.length - 1)]!;
}

export const FINAL_MINI_GOLF_HOLE = MINI_GOLF_COURSE.length;

export function coursePar(): number {
  return MINI_GOLF_COURSE.reduce((sum, h) => sum + h.par, 0);
}
