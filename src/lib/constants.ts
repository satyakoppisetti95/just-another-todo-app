export const FOLDER_COLORS = [
  "#FF3B30",
  "#FF9500",
  "#FFCC00",
  "#34C759",
  "#00C7BE",
  "#30B0C7",
  "#007AFF",
  "#5856D6",
  "#AF52DE",
  "#FF2D55",
  "#8E8E93",
] as const;

/** Reminder point choices (10, 20, … 100) */
export const POINT_OPTIONS = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100] as const;
export const DEFAULT_POINTS = POINT_OPTIONS[0];

export function pointSelectOptions(current?: number): number[] {
  const opts: number[] = [...POINT_OPTIONS];
  if (current != null && !opts.includes(current)) {
    opts.push(current);
    opts.sort((a, b) => a - b);
  }
  return opts;
}

