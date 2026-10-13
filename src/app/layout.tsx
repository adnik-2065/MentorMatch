import type { Metadata, Viewport } from "next";
import { Outfit, Work_Sans } from "next/font/google";
import "./globals.css";

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
  display: "swap",
});

const workSans = Work_Sans({
  variable: "--font-work-sans",
  subsets: ["latin"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "MentorMatch",
  description:
    "Connects junior college students with senior students who can guide them — matched by verified skill, not self-declared claims.",
};

/** Without this, mobile browsers frame the dark UI in white chrome. */
export const viewport: Viewport = {
  themeColor: "#050807",
  colorScheme: "dark",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${outfit.variable} ${workSans.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-bg text-fg">
        {/* First tab stop on every page — the dashboards put a whole sidebar before the content. */}
        <a
          href="#main-content"
          className="sr-only rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-on-primary focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50"
        >
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
