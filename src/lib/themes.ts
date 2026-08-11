export const THEME_IDS = [
  "sky",
  "midnight",
  "forest",
  "ocean",
  "sand",
  "rose",
] as const;

export type ThemeId = (typeof THEME_IDS)[number];

export type ThemeMeta = {
  id: ThemeId;
  name: string;
  description: string;
  /** Solid color for browser chrome / status bar (theme-color meta) */
  browserColor: string;
  /** light = dark status icons; dark = light status icons */
  colorScheme: "light" | "dark";
  preview: {
    bg: string;
    accent: string;
    card: string;
  };
};

export const THEMES: ThemeMeta[] = [
  {
    id: "sky",
    name: "Sky",
    description: "Cool blue glass — the original look",
    browserColor: "#e8eef6",
    colorScheme: "light",
    preview: { bg: "#dbe7f4", accent: "#007AFF", card: "#ffffff" },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Dark charcoal with teal highlights",
    browserColor: "#0f1218",
    colorScheme: "dark",
    preview: { bg: "#12151c", accent: "#2DD4BF", card: "#1c2230" },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Soft moss and pine accents",
    browserColor: "#e7f0e8",
    colorScheme: "light",
    preview: { bg: "#e4efe6", accent: "#2F6F4E", card: "#ffffff" },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Deep teal waters",
    browserColor: "#d9eaee",
    colorScheme: "light",
    preview: { bg: "#d4e8ec", accent: "#0E7490", card: "#ffffff" },
  },
  {
    id: "sand",
    name: "Sand",
    description: "Warm linen with ink accents",
    browserColor: "#ebe4d8",
    colorScheme: "light",
    preview: { bg: "#ebe4d8", accent: "#1D4E89", card: "#fffaf3" },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Soft blush with berry accents",
    browserColor: "#f2e6ea",
    colorScheme: "light",
    preview: { bg: "#f3e4e8", accent: "#BE185D", card: "#fff7f9" },
  },
];

export const DEFAULT_THEME: ThemeId = "sky";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_IDS.includes(value as ThemeId);
}

export function getThemeMeta(id: ThemeId): ThemeMeta {
  return THEMES.find((t) => t.id === id) ?? THEMES[0];
}
