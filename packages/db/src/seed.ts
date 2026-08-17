/**
 * Seed. Mirrors the Dodo objects that must exist before a checkout can run, so
 * a fresh database is immediately usable in development.
 *
 * The ids come from the environment because they are created in the Dodo
 * dashboard, not here — this only records them locally so joins resolve.
 */
import { PRICE } from "@contextjule/core/pricing";

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
    console.info(`product ${productId} recorded`);
  } else {
    console.warn("DODO_PRODUCT_ID is not set — skipping the product row");
  }

  const launch = process.env.DODO_LAUNCH_DISCOUNT_CODE;
  if (launch) {
    await prisma.discount.upsert({
      where: { code: launch },
      create: {
        code: launch,
        offer: "launch",
        type: "percentage",
        // Basis points. 5000 = 50%, which takes $9.99 to $4.99.
        amount: 5000,
        eligibility: "any",
      },
      update: {},
    });
    console.info(`launch discount ${launch} recorded`);
  }

  const free = process.env.DODO_FREE_DISCOUNT_CODE;
  if (free) {
    await prisma.discount.upsert({
      where: { code: free },
      create: {
        code: free,
        offer: "free",
        type: "percentage",
        amount: 10_000,
        // The cap and the eligibility below are the protection on a free
        // promotion. Set the same values on the code in the Dodo dashboard —
        // Dodo enforces them; this row only mirrors them for display.
        usageLimit: 100,
        eligibility: "first_time",
      },
      update: {},
    });
    console.info(`free discount ${free} recorded`);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
