import { type Platform, PLATFORM_SPECS, PLATFORMS } from "@contextjule/core/downloads";

import type { LatestRelease } from "@/lib/api";

/**
 * The download buttons.
 *
 * The platform someone is on gets the gold button and the other is a quiet link
 * beside it — the same shape every desktop app's download page uses, because it
 * is the one that answers "which file do I want" before the question is asked.
 * When we cannot tell (a bot, a Linux browser, no user agent at all) both are
 * offered equally rather than guessing.
 *
 * Gold once per screen: the primary button is the only gold on the page it
 * appears on, which is why the secondary is a bordered link and not a second
 * filled button.
 *
 * The marks are drawn rather than imported. Two SVG paths weigh nothing, they
 * cannot 404, and an icon font would be one more request on a page whose whole
 * job is to hand over a file quickly.
 */

function WindowsMark({ className }: { className?: string }) {
  // Four squares with a real gap. At this size a faithful perspective logo
  // turns to mush, and squares are what the rest of this design is made of.
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M0 1.6 6.9.7v6.6H0V1.6Zm8.1-1L16 0v7.3H8.1V.6ZM0 8.7h6.9v6.6L0 14.4V8.7Zm8.1 0H16V16l-7.9-1.1V8.7Z" />
    </svg>
  );
}

function AppleMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 16 16" aria-hidden className={className} fill="currentColor">
      <path d="M11.2 8.5c0-1.6 1.3-2.4 1.4-2.4-.8-1.1-2-1.3-2.4-1.3-1-.1-2 .6-2.5.6s-1.3-.6-2.2-.6c-1.1 0-2.1.6-2.7 1.6-1.1 2-.3 4.9.8 6.5.6.8 1.2 1.7 2.1 1.6.8 0 1.2-.5 2.2-.5s1.3.5 2.2.5c.9 0 1.5-.8 2-1.6.7-.9.9-1.8 1-1.9 0 0-1.9-.7-1.9-2.9ZM9.6 3.7c.4-.5.7-1.3.6-2-.6 0-1.4.4-1.9 1-.4.5-.7 1.3-.6 2 .7.1 1.4-.3 1.9-1Z" />
    </svg>
  );
}

const MARKS: Record<Platform, (props: { className?: string }) => React.JSX.Element> = {
  windows: WindowsMark,
  macos: AppleMark,
};

function megabytes(bytes: number | null): string | null {
  if (!bytes) return null;
  return `${(bytes / 1_048_576).toFixed(1)} MB`;
}

export interface DownloadButtonsProps {
  release: LatestRelease | null;
  /** From the request's user agent. Null means we could not tell. */
  suggested?: Platform | null;
  /**
   * `quiet` when something else on the screen already owns the gold.
   *
   * Gold once per screen is the rule the whole design runs on. On the thanks
   * page the licence key is the gold thing, and a second filled button beside
   * it would make the two argue about which one you came for.
   */
  tone?: "gold" | "quiet";
  className?: string;
}

export function DownloadButtons({
  release,
  suggested,
  tone = "gold",
  className,
}: DownloadButtonsProps) {
  const downloadable = PLATFORMS.map((platform) => {
    const artifact = release?.artifacts.find((entry) => entry.platform === platform);
    return artifact?.url ? { platform, artifact } : null;
  }).filter((entry) => entry !== null);

  if (downloadable.length === 0) return null;

  // Only promote a platform we can actually serve.
  const primary =
    downloadable.find((entry) => entry.platform === suggested) ??
    (downloadable.length === 1 ? downloadable[0] : null);
  const rest = downloadable.filter((entry) => entry !== primary);

  return (
    <div className={`flex flex-col gap-3 ${className ?? ""}`}>
      <div className="flex flex-wrap items-center gap-2.5">
        {primary ? (
          <a
            href={primary.artifact.url ?? undefined}
            // The bucket sets Content-Disposition, so this is belt and braces
            // for a browser that would rather render an installer than save it.
            download
            className={
              tone === "gold"
                ? "inline-flex items-center gap-2.5 border-3 border-ink-soft bg-gold px-4 py-3 text-ink-soft shadow-hard transition-transform duration-75 hover:-translate-x-px hover:-translate-y-px hover:bg-gold-hover active:translate-x-px active:translate-y-px"
                : "inline-flex items-center gap-2.5 border-3 border-[#6a6478] px-4 py-3 text-cream transition-colors hover:border-gold hover:text-gold"
            }
          >
            {(() => {
              const Mark = MARKS[primary.platform];
              return <Mark className="size-4 shrink-0" />;
            })()}
            <span className="font-pixel text-[11px] whitespace-nowrap">
              download for {PLATFORM_SPECS[primary.platform].label}
            </span>
          </a>
        ) : null}

        {rest.map(({ platform, artifact }) => {
          const Mark = MARKS[platform];
          return (
            <a
              key={platform}
              href={artifact.url ?? undefined}
              download
              className="inline-flex items-center gap-2 border-3 border-night-rule px-3.5 py-3 text-[#c9c3d4] transition-colors hover:border-[#6a6478] hover:text-cream"
            >
              <Mark className="size-3.5 shrink-0" />
              <span className="font-pixel text-[10px] whitespace-nowrap">
                {primary ? PLATFORM_SPECS[platform].label : `download for ${PLATFORM_SPECS[platform].label}`}
              </span>
            </a>
          );
        })}
      </div>

      {/* What you are about to download, in one line. Version and size are the
          two things people check before clicking an executable. */}
      <span className="font-pixel text-[9px] text-[#968fa3]">
        {release ? `v${release.version}` : ""}
        {downloadable
          .map(({ platform, artifact }) => {
            const size = megabytes(artifact.sizeBytes);
            return size ? ` · ${PLATFORM_SPECS[platform].label} ${size}` : "";
          })
          .join("")}
      </span>
    </div>
  );
}
