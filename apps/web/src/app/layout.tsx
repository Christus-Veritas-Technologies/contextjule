import { Toaster } from "@contextjule/ui/components/sonner";
import type { Metadata, Viewport } from "next";

import "../index.css";

/**
 * Fonts are self-hosted through @contextjule/ui rather than next/font, so the
 * site and the desktop app render from byte-identical files. next/font would
 * give the site its own copies and let the two drift.
 *
 * `data-band="night"` sets the whole marketing surface to the dark band; the
 * sections below the hero opt into their own colours.
 */
export const metadata: Metadata = {
  metadataBase: new URL("https://contextjule.com"),
  title: "ContextJule — never lose a good session again",
  description:
    "Jule is a little friend who lives on your desktop and carries your chat for you. When it starts getting heavy she stoops, so you find out in time to save the thread instead of after you have lost it.",
  openGraph: {
    title: "ContextJule",
    description: "A little friend who carries your chat so you do not have to.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "ContextJule",
    description: "A little friend who carries your chat so you do not have to.",
  },
};

export const viewport: Viewport = {
  themeColor: "#141119",
  colorScheme: "light",
  // The hero is a fixed composition measured in pixels; letting a phone scale
  // it beyond a point turns her into a blur, and she is pixel art.
  maximumScale: 5,
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" data-band="night">
      <body className="min-h-svh overflow-x-hidden antialiased">
        {children}
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
