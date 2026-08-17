/**
 * Seed. Mirrors the Dodo objects that must exist before a checkout can run, so
 * a fresh database is immediately usable in development.
 *
 * There are no discount codes to seed. The one product's price is edited by
 * hand as the launch moves, so the only thing worth creating here is the
 * counter the site reads its phase from.
 */
import { PRICE } from "@contextjule/core/pricing";
import { FREE_LIMIT } from "@contextjule/core/promo";

import prisma from "./index";

async function main() {
  const productId = process.env.DODO_PRODUCT_ID;

  if (productId) {
    await prisma.product.upsert({
      where: { dodoProductId: productId },
      create: {
        dodoProductId: productId,
        slug: "contextjule",
        name: "ContextJule",
        priceMinor: PRICE.full,
        currency: PRICE.currency,
      },
      update: { priceMinor: PRICE.full },
    });
    console.info(`product ${productId} recorded at ${PRICE.full / 100} ${PRICE.currency}`);
  } else {
    console.warn("DODO_PRODUCT_ID is not set — skipping the product row");
  }

  /**
   * The launch sequence's counter.
   *
   * `freeClaimed` is incremented by the webhook when a payment of zero clears,
   * and `freeClosedAt` is stamped once when the hundredth lands — that instant
   * is what the 72-hour window counts from.
   */
  await prisma.promo.upsert({
    where: { slug: "launch" },
    create: { slug: "launch", freeLimit: FREE_LIMIT, discountHours: 72 },
    // Never reset the counter on a re-seed. Wiping `freeClaimed` mid-launch
    // would hand out a second hundred copies, and clearing `freeClosedAt` would
    // restart a window people have already been shown.
    update: {},
  });
  console.info(`promo counter ready — ${FREE_LIMIT} free copies, then a 72h window`);
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
