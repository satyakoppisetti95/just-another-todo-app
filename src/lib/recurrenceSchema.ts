import { z } from "zod";

export const recurrenceSchema = z
  .object({
    frequency: z.enum(["daily", "weekly", "monthly"]),
    interval: z.number().int().min(1).max(365).default(1),
    byWeekday: z.array(z.number().int().min(0).max(6)).optional(),
    endOn: z.union([z.string().min(1), z.null()]).optional(),
  })
  .nullable();

export type RecurrenceInput = z.infer<typeof recurrenceSchema>;

export function normalizeRecurrence(input: RecurrenceInput) {
  if (!input) return null;
  if (input.frequency === "weekly") {
    const days = [...new Set(input.byWeekday ?? [])].sort((a, b) => a - b);
    if (days.length === 0) {
      throw new Error("Pick at least one weekday for weekly repeat");
    }
    return {
      frequency: input.frequency as "weekly",
      interval: input.interval ?? 1,
      byWeekday: days,
      endOn: input.endOn ? new Date(input.endOn) : null,
    };
  }
  return {
    frequency: input.frequency,
    interval: input.interval ?? 1,
    byWeekday: undefined,
    endOn: input.endOn ? new Date(input.endOn) : null,
  };
}
