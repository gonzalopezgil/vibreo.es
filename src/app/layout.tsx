import type { Metadata } from "next";
import Link from "next/link";
import { Inter } from "next/font/google";
import { BottomNav } from "@/components/BottomNav";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "VIBREO — Music Charts",
  description:
    "Global music charts across Spotify, Apple Music, YouTube and more.",
  manifest: "/manifest.json",
  icons: {
    icon: [{ url: "/favicon.svg", type: "image/svg+xml" }],
    apple: [{ url: "/icon-192.png", sizes: "192x192", type: "image/png" }],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="antialiased bg-zinc-950 text-zinc-100">
        <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-950/90 backdrop-blur-md">
          <div className="mx-auto flex h-14 w-full max-w-3xl items-center px-4">
            <Link href="/" className="text-xl font-black tracking-[-0.04em] shimmer-text pr-0.5">
              VIBREO
            </Link>
          </div>
        </header>

        <div className="pb-20">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
