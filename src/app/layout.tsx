import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
import { DEFAULT_THEME, getThemeMeta } from "@/lib/themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const display = DM_Sans({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

const defaultTheme = getThemeMeta(DEFAULT_THEME);

export const metadata: Metadata = {
  title: "Just Another Todo",
  description: "Analytics-forward reminders with shared lists and points",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Just Another Todo",
  },
};

export const viewport: Viewport = {
  themeColor: defaultTheme.browserColor,
  colorScheme: defaultTheme.colorScheme,
  viewportFit: "cover",
};

const themeInitScript = `
(function(){
  try {
    var colors = {
      sky: { c: '#e8eef6', s: 'light' },
      midnight: { c: '#0f1218', s: 'dark' },
      forest: { c: '#e7f0e8', s: 'light' },
      ocean: { c: '#d9eaee', s: 'light' },
      sand: { c: '#ebe4d8', s: 'light' },
      rose: { c: '#f2e6ea', s: 'light' }
    };
    var t = localStorage.getItem('jata-theme');
    var pack = colors[t] || colors.sky;
    var id = colors[t] ? t : 'sky';
    document.documentElement.setAttribute('data-theme', id);
    document.documentElement.style.colorScheme = pack.s;
    function setMeta(name, content) {
      var el = document.querySelector('meta[name=\"' + name + '\"]');
      if (!el) {
        el = document.createElement('meta');
        el.setAttribute('name', name);
        document.head.appendChild(el);
      }
      el.setAttribute('content', content);
    }
    setMeta('theme-color', pack.c);
    setMeta('color-scheme', pack.s);
    setMeta(
      'apple-mobile-web-app-status-bar-style',
      pack.s === 'dark' ? 'black-translucent' : 'default'
    );
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'sky');
  }
})();
`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="sky"
      className={`${geistSans.variable} ${geistMono.variable} ${display.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
      </head>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
