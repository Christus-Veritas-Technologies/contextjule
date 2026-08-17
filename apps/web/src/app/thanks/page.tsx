import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { ThanksPanel } from "@/components/thanks-panel";
import { fetchPromo } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * The checkout return URL.
 *
 * Dodo may append a session id, a payment id, both, or neither depending on how
 * the session was created — so anything it sends is used as a hint and the
 * page's own stored id is the fallback. The panel does the polling.
 */
export default async function Thanks({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const first = (value: string | string[] | undefined) =>
    Array.isArray(value) ? value[0] : value;

  const sessionId =
    first(params.session_id) ?? first(params.checkout_session_id) ?? first(params.sessionId);

  const promo = await fetchPromo();

  return (
    <main className="flex min-h-svh flex-col bg-night">
      <SiteNav promo={promo} />
      <div className="flex flex-1 items-center justify-center px-5 py-14 md:py-20">
        <ThanksPanel sessionId={sessionId} />
      </div>
      <SiteFooter />
    </main>
  );
}
