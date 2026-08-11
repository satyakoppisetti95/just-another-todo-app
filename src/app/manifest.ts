import type { MetadataRoute } from "next";
import { DEFAULT_THEME, getThemeMeta } from "@/lib/themes";

export default function manifest(): MetadataRoute.Manifest {
  const theme = getThemeMeta(DEFAULT_THEME);

  return {
    name: "Just Another Todo",
    short_name: "Todo",
    description: "Reminders with points, friends, and analytics",
    start_url: "/lists",
    scope: "/",
    display: "standalone",
    orientation: "portrait-primary",
    background_color: theme.browserColor,
    theme_color: theme.browserColor,
    categories: ["productivity", "utilities"],
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
