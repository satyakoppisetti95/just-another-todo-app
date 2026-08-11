# Lottie animations

## Celebration (complete reminder)

Download **Optimized dotLottie** from LottieFiles and save it as:

```text
public/lottie/celebration-check.lottie
```

That format is supported via `@lottiefiles/dotlottie-react` (smaller than JSON, recommended).

Until the file exists, the app shows a built-in CSS checkmark/confetti fallback and still auto-closes.

### Tips
- Prefer **Optimized dotLottie** (`.lottie`) over Lottie JSON
- Keep the animation short (≈1.5–3s), non-looping
- Filename must be exactly `celebration-check.lottie` (or change `CELEBRATION_LOTTIE_PATH` in `src/lib/celebration.ts`)
