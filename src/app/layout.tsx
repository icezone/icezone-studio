import type { Metadata } from "next";
import { Geist, Geist_Mono, Syne } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "IceZone Studio — AI Creative Studio",
  description:
    "A node-based AI canvas for generating images, creating storyboards, and producing videos. Powered by the world's best AI models including Kling, Sora2, and Veo.",
  keywords: "AI storyboard, image generation, video generation, AI canvas, creative tool, IceZone Studio",
  openGraph: {
    title: "IceZone Studio — AI Creative Studio",
    description: "Create stunning storyboards and videos with AI on a node-based canvas.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} ${syne.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
