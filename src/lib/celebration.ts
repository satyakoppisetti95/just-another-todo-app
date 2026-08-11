export const CELEBRATION_LOTTIE_PATH = "/lottie/celebration-check.lottie";

export const CELEBRATION_MESSAGES = [
  "Good job!",
  "Way to go!",
  "Nice work!",
  "Crushing it!",
  "Nailed it!",
  "Awesome!",
  "Well done!",
  "Keep it up!",
  "Boom!",
  "You got this!",
  "On a roll!",
  "Fantastic!",
] as const;

const MSG_INDEX_KEY = "jata-celebrate-msg-idx";

export function nextCelebrationMessage(): string {
  let index = 0;
  try {
    const raw = localStorage.getItem(MSG_INDEX_KEY);
    index = raw ? Number.parseInt(raw, 10) : 0;
    if (!Number.isFinite(index) || index < 0) index = 0;
  } catch {
    index = 0;
  }

  const message = CELEBRATION_MESSAGES[index % CELEBRATION_MESSAGES.length];
  try {
    localStorage.setItem(
      MSG_INDEX_KEY,
      String((index + 1) % CELEBRATION_MESSAGES.length)
    );
  } catch {
    // ignore
  }
  return message;
}

export type CelebrationPayload = {
  message: string;
  points: number;
  title?: string;
};
