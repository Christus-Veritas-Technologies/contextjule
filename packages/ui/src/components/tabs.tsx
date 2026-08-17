"use client";

import { Tabs as TabsPrimitive } from "@base-ui/react/tabs";
import { cn } from "@contextjule/ui/lib/utils";

function Tabs({ className, ...props }: TabsPrimitive.Root.Props) {
  return (
    <TabsPrimitive.Root data-slot="tabs" className={cn("flex flex-col", className)} {...props} />
  );
}

/**
 * The tab strip runs along the bottom of every app screen: dark band, 3px top
 * rule, 2px dividers, active tab in gold. It is the only navigation the app has.
 */
function TabsList({ className, ...props }: TabsPrimitive.List.Props) {
  return (
    <TabsPrimitive.List
      data-slot="tabs-list"
      className={cn("flex w-full border-t-3 border-ink bg-ink-soft", className)}
      {...props}
    />
  );
}

function TabsTrigger({ className, ...props }: TabsPrimitive.Tab.Props) {
  return (
    <TabsPrimitive.Tab
      data-slot="tabs-trigger"
      className={cn(
        "flex flex-1 items-center justify-center border-r-2 border-ink px-1 py-[11px] last:border-r-0",
        "font-pixel text-[9px] tracking-[0.02em] whitespace-nowrap text-[#968fa3]",
        "transition-colors outline-none select-none",
        "hover:text-cream",
        "focus-visible:text-cream focus-visible:ring-2 focus-visible:ring-gold focus-visible:ring-inset",
        "data-selected:bg-gold data-selected:text-ink-soft",
        className,
      )}
      {...props}
    />
  );
}

function TabsContent({ className, ...props }: TabsPrimitive.Panel.Props) {
  return (
    <TabsPrimitive.Panel
      data-slot="tabs-content"
      className={cn("min-h-0 flex-1 outline-none", className)}
      {...props}
    />
  );
}

export { Tabs, TabsList, TabsTrigger, TabsContent };
