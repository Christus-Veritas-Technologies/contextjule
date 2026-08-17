import { PLATFORM_SPECS, PLATFORMS } from "@contextjule/core/downloads";
import { ResendForm } from "@/components/resend-form";
import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { fetchLatestRelease, fetchPromo } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * The download page.
 *
 * Deliberately thin on links: the installer is served from a signed, expiring
 * URL issued to a purchase email, so this page tells you what the current build
 * is and gets you a fresh link — it does not host a permalink. The licence key
 * is what gates the app; the link only stops the installer being mirrored.
 */
export default async function Download() {
  const [release, promo] = await Promise.all([fetchLatestRelease(), fetchPromo()]);

  return (
    <main className="flex min-h-svh flex-col bg-night">
      <SiteNav promo={promo} />

      <section className="mx-auto flex w-full max-w-[760px] flex-1 flex-col gap-9 px-5 py-14 md:py-20">
        <div className="flex flex-col gap-3.5">
          <span className="font-pixel text-[11px] text-gold">download</span>
          <h1 className="font-pixel text-[21px] leading-[1.3] text-cream md:text-[26px]">
            Get her onto your machine.
          </h1>
          <p className="text-[15px] leading-[1.6] text-[#a8a2b4]">
            Your download link arrived with your licence key. Links are good for 72 hours — if yours
            has expired, ask for a fresh one below and it will be in your inbox in a moment.
          </p>
        </div>

        {/* What is currently shipping. Null before the first build, which is a
            real state and says so rather than showing an empty table. */}
        <div className="flex flex-col gap-4 border-3 border-night-rule bg-night-raised p-5 md:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <span className="font-pixel text-[11px] text-cream">current build</span>
            <span className="font-pixel text-[10px] text-[#968fa3]">
              {release ? `v${release.version}` : "not published yet"}
            </span>
          </div>

          {release ? (
            <div className="flex flex-col gap-2.5">
              {PLATFORMS.map((platform) => {
                const artifact = release.artifacts.find((entry) => entry.platform === platform);
                return (
                  <div
                    key={platform}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1.5 border-b-2 border-night-rule pb-2.5 last:border-b-0 last:pb-0"
                  >
                    <span className="font-pixel text-[10px] text-[#c9c3d4]">
                      {PLATFORM_SPECS[platform].label}
                    </span>
                    <span className="font-pixel text-[9px] text-[#968fa3]">
                      {artifact
                        ? `${artifact.filename}${
                            artifact.sizeBytes
                              ? ` · ${(artifact.sizeBytes / 1_048_576).toFixed(1)}MB`
                              : ""
                          }`
                        : "not in this build"}
                    </span>
                    {artifact?.sha256 ? (
                      <code className="w-full font-pixel text-[8px] break-all text-[#6a6478]">
                        sha256 {artifact.sha256}
                      </code>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-[13px] leading-[1.6] text-[#968fa3]">
              The first build has not been published yet. Buy a copy and your link will arrive the
              moment it ships.
            </p>
          )}
        </div>

        <div className="flex flex-col gap-3.5">
          <span className="font-pixel text-[11px] text-cream">send me my link again</span>
          <ResendForm />
          <p className="text-[13px] leading-[1.6] text-[#968fa3]">
            The key is what unlocks the app, not the link, so there is never a reason to hunt for an
            old email: any fresh link works with the key you already have.
          </p>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
