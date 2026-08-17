"use client";

import type { Offer } from "@contextjule/core/pricing";
import { Button } from "@contextjule/ui/components/button";
import { useState } from "react";
import { toast } from "sonner";

import { startCheckout } from "@/lib/api";

/**
 * Every purchase route is this button with a different `offer`. The free claim
 * is not a special case here: it goes through the same Dodo checkout, which is
 * what makes it capped, verified by email, and — most importantly — issued a
 * real license key like every other copy.
 */
export function BuyButton({
  offer = "full",
  children,
  size = "xl",
}: {
  offer?: Offer;
  children: React.ReactNode;
  size?: "lg" | "xl";
}) {
  const [pending, setPending] = useState(false);

  return (
    <Button
      size={size}
      variant="primary"
      disabled={pending}
      onClick={async () => {
        setPending(true);
        try {
          window.location.href = await startCheckout(offer);
        } catch (error) {
          toast.error(error instanceof Error ? error.message : "Something went wrong.");
          setPending(false);
        }
      }}
    >
      {pending ? "one moment…" : children}
    </Button>
  );
}
