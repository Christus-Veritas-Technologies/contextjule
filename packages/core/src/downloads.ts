/**
 * Release artifacts and the gated download link.
 *
 * The link that lands in a purchase email is a single-use token, not a path to
 * the file. It resolves to a signed URL that expires, so a link pasted into a
 * public channel stops working. The license key is what actually gates the app;
 * the token only stops the installer being mirrored.
 */
export const PLATFORMS = ["windows", "macos"] as const;
export type Platform = (typeof PLATFORMS)[number];

export interface PlatformSpec {
  readonly id: Platform;
  readonly label: string;
  readonly extension: string;
  readonly arches: readonly string[];
}

export const PLATFORM_SPECS: Readonly<Record<Platform, PlatformSpec>> = {
  windows: {
    id: "windows",
    label: "Windows",
    // What the release workflow actually ships. The MSI is copied when the
    // bundler produces one, but the NSIS installer is the download.
    extension: ".exe",
    arches: ["x64"],
  },
  macos: {
    id: "macos",
    label: "macOS",
    extension: ".dmg",
    arches: ["universal"],
  },
};

/** How long a download token stays usable after it is issued. */
export const DOWNLOAD_TOKEN_TTL_MS = 72 * 60 * 60 * 1_000;

/** How many times one token may be redeemed. Two, so a retry does not lock them out. */
export const DOWNLOAD_TOKEN_USES = 2;

/** How long the signed storage URL the token redeems to stays valid. */
export const SIGNED_URL_TTL_MS = 10 * 60 * 1_000;

export function detectPlatform(userAgent: string | null | undefined): Platform | null {
  if (!userAgent) return null;
  const ua = userAgent.toLowerCase();
  if (ua.includes("mac os") || ua.includes("macintosh")) return "macos";
  if (ua.includes("windows")) return "windows";
  return null;
}
