import Link from "next/link";

/**
 * The checkout return URL.
 *
 * Dodo appends the license key to this URL on success, so the key is on screen
 * the moment the buyer lands — before the email arrives, which matters because
 * the email is the part that can be delayed or filtered.
 */
export default async function Thanks({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const licenseKey = first(params.license_key);
  const status = first(params.status);
  const failed = status && status !== "succeeded" && status !== "active";

  return (
    <main className="flex min-h-svh items-center justify-center bg-night px-6 py-20">
      <div className="flex w-full max-w-[520px] flex-col gap-6 border-3 border-ink bg-[#1c1924] p-8 shadow-hard-xl">
        <h1 className="font-pixel text-[15px] text-[#f4efe9]">
          {failed ? "that did not go through" : "she is yours"}
        </h1>

        {failed ? (
          <p className="text-[14px] leading-[1.6] text-[#a8a2b4]">
            Nothing was charged. Head back and try again, or write to us and we will sort it out.
          </p>
        ) : (
          <>
            {licenseKey ? (
              <div className="flex flex-col gap-2">
                <span className="font-pixel text-[9px] text-[#968fa3]">your license key</span>
                <code className="border-3 border-ink-soft bg-gold px-4 py-3.5 font-pixel text-[13px] tracking-[0.12em] break-all text-ink-soft">
                  {licenseKey}
                </code>
              </div>
            ) : null}
            <p className="text-[14px] leading-[1.6] text-[#a8a2b4]">
              The same key and a download link are on their way to your inbox. Paste the key into
              the app the first time you open it — it does not expire.
            </p>
          </>
        )}

        <Link href="/download" className="font-pixel text-[10px] text-gold hover:text-gold-hover">
          download for windows and mac →
        </Link>
      </div>
    </main>
  );
}
