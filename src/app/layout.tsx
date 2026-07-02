import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CivicFlow MY Mobile",
  description:
    "Multilingual citizen-service AI casework for Malaysian councils — a MAIC T5 demo. All data is synthetic.",
  manifest: "/manifest.webmanifest",
  applicationName: "CivicFlow MY",
  appleWebApp: { capable: true, title: "CivicFlow MY", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: "#226c69",
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
