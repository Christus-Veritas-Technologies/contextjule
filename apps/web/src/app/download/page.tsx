import Header from "@/components/header";

/**
 * The public download page. Deliberately thin: the installer itself is served
 * from a signed, expiring link issued to a purchase email, so this page points
 * people at that rather than hosting a permalink.
 */
export default function Download() {
  return (
    <main className="min-h-svh bg-night">
      <Header />
      <section className="mx-auto flex max-w-[720px] flex-col gap-8 px-6 py-20">
        <h1 className="font-pixel text-[18px] text-[#f4efe9]">download</h1>
        <p className="text-[15px] leading-[1.6] text-[#a8a2b4]">
          Your download link arrived with your license key. Links are good for 72 hours — if yours
          has expired, ask for a fresh one and it will be in your inbox in a moment.
        </p>
        <p className="text-[13px] leading-[1.6] text-[#968fa3]">
          The key is what unlocks the app, not the link, so there is never a reason to hunt for an
          old email: any fresh link works with the key you already have.
        </p>
      </section>
    </main>
  );
}
