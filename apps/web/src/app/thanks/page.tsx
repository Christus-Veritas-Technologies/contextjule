import { SiteFooter } from "@/components/site-footer";
import { SiteNav } from "@/components/site-nav";
import { ThanksPanel } from "@/components/thanks-panel";
import { fetchPromo } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * The checkout return URL.
 *
 * Dodo appends the outcome to it directly — `status`, `license_key`,
 * `payment_id`, `email` — so in the common case everything the buyer needs is
 * already here and the panel renders it without a single request. The session
 * id is read too, when present, because it is what the polling fallback needs
 * for the cases where Dodo sent no key.
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
        <ThanksPanel
          sessionId={sessionId}
          licenseKey={first(params.license_key)}
          status={first(params.status)}
          email={first(params.email)}
        />
      </div>
      <SiteFooter />
    </main>
  );
}
