import { env } from "@contextjule/env/web";
import Script from "next/script";

/**
 * The Google tag.
 *
 * `afterInteractive` rather than `beforeInteractive`: the hero renders every
 * frame of a sprite animation on load, and a blocking third-party script ahead
 * of that is paid for by the first thing a visitor sees. Analytics arriving
 * 200ms later costs nothing worth having.
 *
 * Renders nothing when `NEXT_PUBLIC_GA_ID` is unset, so development and preview
 * builds stay out of the property the real numbers live in.
 */
export function Analytics() {
  const id = env.NEXT_PUBLIC_GA_ID;
  if (!id) return null;

  return (
    <>
      <Script
        src={`https://www.googletagmanager.com/gtag/js?id=${id}`}
        strategy="afterInteractive"
      />
      <Script id="gtag-init" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
