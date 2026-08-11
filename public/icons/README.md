# App icons (Home Screen / PWA)

Replace these files when you have final brand artwork. Keep the **exact filenames and sizes**.

## Required files

| File | Size | Used for |
| --- | --- | --- |
| `public/icons/icon-192.png` | 192×192 | Android / PWA install |
| `public/icons/icon-512.png` | 512×512 | Android / PWA splash & maskable |
| `public/icons/apple-touch-icon.png` | 180×180 | iPhone Home Screen |
| `src/app/apple-icon.png` | 180×180 | Next.js Apple meta (copy of apple-touch) |
| `src/app/icon.png` | 32×32 | Browser tab favicon |
| `src/app/favicon.ico` | 32×32 | Legacy favicon |

Optional master: `public/icons/icon-source.png` (1024×1024) — keep a high-res source so you can re-export.

## Design tips (iOS)

1. Start from a **1024×1024** square PNG.
2. Fill the canvas edge-to-edge (no transparent padding). iOS applies its own rounded mask.
3. Keep important shapes inside ~**80%** of the center (safe zone) so corners aren’t clipped.
4. Avoid tiny text — it won’t read on the Home Screen.
5. Prefer a simple mark (checkmark / monogram) on a solid or soft gradient.

## Export on a Mac (from a 1024 source)

```bash
SRC=public/icons/icon-source.png

sips -z 512 512 "$SRC" --out public/icons/icon-512.png
sips -z 192 192 "$SRC" --out public/icons/icon-192.png
sips -z 180 180 "$SRC" --out public/icons/apple-touch-icon.png
sips -z 32 32 "$SRC" --out public/icons/icon-32.png

cp public/icons/apple-touch-icon.png src/app/apple-icon.png
cp public/icons/icon-32.png src/app/icon.png
sips -s format ico public/icons/icon-32.png --out src/app/favicon.ico
```

## After replacing icons

1. Redeploy (or hard-refresh).
2. On iPhone Safari: **Share → Add to Home Screen**.
3. If an old icon sticks, delete the Home Screen bookmark and add again (iOS caches icons aggressively).

Placeholder icons shipped with the app are temporary — swap them for your real brand mark when ready.
