import type { Metadata, Viewport } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "CivicFlow MY — Citizen service casework",
  description: "Multilingual citizen-service casework for Malaysian councils — a synthetic MAIC T5 demo.",
  manifest: "/manifest.webmanifest",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
  applicationName: "CivicFlow MY",
  appleWebApp: { capable: true, title: "CivicFlow MY", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#1d5754",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
