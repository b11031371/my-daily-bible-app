export const POINTS_BY_DAYS_LATE: Record<number, number> = {
  0: 10,
  1: 7,
  2: 5,
  3: 3,
}

export function getPoints(daysLate: number): number {
  return POINTS_BY_DAYS_LATE[daysLate] ?? 0
}
