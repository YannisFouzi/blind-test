import type { Metadata } from "next";
import { Baloo_2, JetBrains_Mono, Nunito } from "next/font/google";
import "./globals.css";
import { ProvidersWithAuth } from "./providers";
import { Toaster } from "@/components/ui";
import { PartyKitProvider } from "@/context/PartyKitProvider";

const displayFont = Baloo_2({
  variable: "--font-display",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const bodyFont = Nunito({
  variable: "--font-body",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

const monoFont = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  display: "swap",
  preload: true,
});

export const metadata: Metadata = {
  title: "Blind Test Musical",
  description:
    "Testez vos connaissances musicales à travers différents univers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body
        className={`${displayFont.variable} ${bodyFont.variable} ${monoFont.variable} antialiased`}
      >
        <ProvidersWithAuth>
          <PartyKitProvider>{children}</PartyKitProvider>
        </ProvidersWithAuth>
        <Toaster />
      </body>
    </html>
  );
}
