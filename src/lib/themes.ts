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
    preview: { bg: "#dbe7f4", accent: "#007AFF", card: "#ffffff" },
  },
  {
    id: "midnight",
    name: "Midnight",
    description: "Dark charcoal with teal highlights",
    preview: { bg: "#12151c", accent: "#2DD4BF", card: "#1c2230" },
  },
  {
    id: "forest",
    name: "Forest",
    description: "Soft moss and pine accents",
    preview: { bg: "#e4efe6", accent: "#2F6F4E", card: "#ffffff" },
  },
  {
    id: "ocean",
    name: "Ocean",
    description: "Deep teal waters",
    preview: { bg: "#d4e8ec", accent: "#0E7490", card: "#ffffff" },
  },
  {
    id: "sand",
    name: "Sand",
    description: "Warm linen with ink accents",
    preview: { bg: "#ebe4d8", accent: "#1D4E89", card: "#fffaf3" },
  },
  {
    id: "rose",
    name: "Rose",
    description: "Soft blush with berry accents",
    preview: { bg: "#f3e4e8", accent: "#BE185D", card: "#fff7f9" },
  },
];

export const DEFAULT_THEME: ThemeId = "sky";

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && THEME_IDS.includes(value as ThemeId);
}
