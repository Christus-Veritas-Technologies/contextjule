"use client";

import type { ReactNode } from "react";

/**
 * Kept as the seam for anything that genuinely needs to wrap the tree. There is
 * no theme provider: ContextJule has one theme, and `data-band` on a section
 * re-tones it without any JavaScript at all.
 */
export default function Providers({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
