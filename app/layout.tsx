import "./globals.css";
import type { Metadata, Viewport } from "next";
import Header from "./components/Header";
import DisablePinchZoom from "./components/DisablePinchZoom";
import FavoritosMigrator from "./components/FavoritosMigrator";

export const metadata: Metadata = {
  title: "VIAVIP - Escorts verificadas en Uruguay",
  description: "Premium. Discreto. Seguro. La plataforma de escorts verificadas mas exclusiva de Uruguay.",
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon-32x32.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        <DisablePinchZoom />
        <FavoritosMigrator />
        <Header />
        {children}
      </body>
    </html>
  );
}
