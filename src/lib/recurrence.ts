import type { IRecurrence, RecurrenceFrequency } from "@/models/Todo";

export type RecurrenceRule = {
  frequency: RecurrenceFrequency;
  interval: number;
  byWeekday?: number[];
  endOn?: Date | string | null;
};

function daysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate();
}

function endOfEndOnDay(endOn: Date): Date {
  const d = new Date(endOn);
  d.setHours(23, 59, 59, 999);
  return d;
}

function isPastEnd(candidate: Date, endOn?: Date | string | null): boolean {
  if (!endOn) return false;
  const end = endOfEndOnDay(new Date(endOn));
  return candidate.getTime() > end.getTime();
}

function withTimeFrom(base: Date, hours: number, minutes: number, seconds = 0, ms = 0) {
  const d = new Date(base);
  d.setHours(hours, minutes, seconds, ms);
  return d;
}

/**
 * Next due after completing an occurrence.
 * Advances one step from `from` (the completed occurrence's dueAt),
 * ensuring the result is strictly after `after` (usually now).
 * Returns null when the series has ended (past endOn).
 */
export function nextDueAt(
  from: Date,
  rule: RecurrenceRule | IRecurrence,
  after: Date = new Date()
): Date | null {
  const interval = Math.max(1, Math.floor(rule.interval || 1));
  const hours = from.getHours();
  const minutes = from.getMinutes();
  const seconds = from.getSeconds();
  const ms = from.getMilliseconds();

  let candidate: Date | null = null;

  if (rule.frequency === "daily") {
    candidate = new Date(from);
    do {
      candidate.setDate(candidate.getDate() + interval);
      candidate = withTimeFrom(candidate, hours, minutes, seconds, ms);
    } while (candidate.getTime() <= after.getTime());
  } else if (rule.frequency === "weekly") {
    const weekdays = [...(rule.byWeekday ?? [])]
      .filter((d) => d >= 0 && d <= 6)
      .sort((a, b) => a - b);
    if (weekdays.length === 0) return null;

    // Anchor week: the week containing `from`, then step by `interval` weeks
    const cursor = new Date(from);
    // Start searching from the day after `from` (same occurrence already done)
    cursor.setDate(cursor.getDate() + 1);
    cursor.setHours(0, 0, 0, 0);

    // Safety bound: search up to ~interval*52 weeks ahead
    const maxSteps = Math.max(400, interval * 60);
    for (let i = 0; i < maxSteps; i++) {
      const dow = cursor.getDay();
      if (weekdays.includes(dow)) {
        // Check interval: weeks since `from`'s week
        const fromWeekStart = startOfWeek(from);
        const cursorWeekStart = startOfWeek(cursor);
        const weeksDiff = Math.round(
          (cursorWeekStart.getTime() - fromWeekStart.getTime()) / (7 * 24 * 60 * 60 * 1000)
        );
        if (weeksDiff >= 0 && weeksDiff % interval === 0) {
          const next = withTimeFrom(cursor, hours, minutes, seconds, ms);
          if (next.getTime() > after.getTime() && next.getTime() > from.getTime()) {
            candidate = next;
            break;
          }
        }
      }
      cursor.setDate(cursor.getDate() + 1);
    }
  } else if (rule.frequency === "monthly") {
    const dayOfMonth = from.getDate();
    let candidateMonth = new Date(from);
    let guard = 0;
    do {
      const y: number = candidateMonth.getFullYear();
      const m: number = candidateMonth.getMonth() + interval;
      const targetYear: number = y + Math.floor(m / 12);
      const targetMonth: number = ((m % 12) + 12) % 12;
      const dim = daysInMonth(targetYear, targetMonth);
      const day = Math.min(dayOfMonth, dim);
      candidateMonth = new Date(targetYear, targetMonth, day, hours, minutes, seconds, ms);
      guard++;
      if (guard > 120) return null;
    } while (candidateMonth.getTime() <= after.getTime());
    candidate = candidateMonth;
  } else {
    return null;
  }

  if (!candidate) return null;
  if (isPastEnd(candidate, rule.endOn)) return null;
  return candidate;
}

function startOfWeek(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - x.getDay()); // Sunday start
  return x;
}

export function serializeRecurrence(
  r: IRecurrence | RecurrenceRule | null | undefined
): {
  frequency: RecurrenceFrequency;
  interval: number;
  byWeekday?: number[];
  endOn: string | null;
} | null {
  if (!r) return null;
  return {
    frequency: r.frequency,
    interval: r.interval ?? 1,
    byWeekday: r.byWeekday?.length ? [...r.byWeekday] : undefined,
    endOn: r.endOn ? new Date(r.endOn).toISOString() : null,
  };
}

export function formatRecurrenceLabel(
  r: {
    frequency: RecurrenceFrequency;
    interval?: number;
    byWeekday?: number[];
  } | null | undefined
): string {
  if (!r) return "";
  const n = r.interval ?? 1;
  if (r.frequency === "daily") {
    return n === 1 ? "Daily" : `Every ${n} days`;
  }
  if (r.frequency === "weekly") {
    const names = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const days = (r.byWeekday ?? [])
      .slice()
      .sort((a, b) => a - b)
      .map((d) => names[d] ?? "")
      .filter(Boolean);
    const dayPart = days.length ? days.join(", ") : "week";
    return n === 1 ? `Weekly · ${dayPart}` : `Every ${n} weeks · ${dayPart}`;
  }
  return n === 1 ? "Monthly" : `Every ${n} months`;
}
