import type { Metadata } from "next";
import { Geist, Geist_Mono, DM_Sans } from "next/font/google";
import { Providers } from "@/components/Providers";
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

export const metadata: Metadata = {
  title: "Just Another Todo",
  description: "Analytics-forward reminders with shared lists and points",
};

const themeInitScript = `
(function(){
  try {
    var allowed = ['sky','midnight','forest','ocean','sand','rose'];
    var t = localStorage.getItem('jata-theme');
    document.documentElement.setAttribute(
      'data-theme',
      allowed.indexOf(t) >= 0 ? t : 'sky'
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
