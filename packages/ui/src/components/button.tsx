import { Button as ButtonPrimitive } from "@base-ui/react/button";
import { cn } from "@contextjule/ui/lib/utils";
import { cva, type VariantProps } from "class-variance-authority";

/**
 * Every button in ContextJule is a plate: a 3px border and a hard offset
 * shadow, no radius, no blur. Pressing it moves the plate down onto its own
 * shadow rather than dimming it.
 *
 * `primary` is gold and appears once per screen. If a screen has two gold
 * buttons, one of them is wrong.
 */
const buttonVariants = cva(
 [
 "group/button relative inline-flex shrink-0 items-center justify-center gap-2",
 "border-3 border-ink-soft bg-clip-padding whitespace-nowrap select-none",
 "font-pixel tracking-[0.02em] transition-[transform,box-shadow,background-color] duration-75",
 "outline-none focus-visible:ring-3 focus-visible:ring-gold focus-visible:ring-offset-0",
 "disabled:pointer-events-none disabled:opacity-50 disabled:shadow-none",
 "[&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*='size-'])]:size-4",
 ],
 {
 variants: {
 variant: {
 /** The one gold thing on the page. */
 primary: [
 "bg-gold text-ink-soft shadow-hard",
 "hover:-translate-x-px hover:-translate-y-px hover:bg-gold-hover hover:shadow-hard-md",
 "active:translate-x-px active:translate-y-px active:shadow-hard-xs",
 ],
 /** Sits beside the gold one. Cream plate, soft shadow. */
 secondary: [
 "bg-cream-raised text-ink-soft shadow-hard-soft",
 "hover:bg-accent hover:-translate-x-px hover:-translate-y-px",
 "active:translate-x-px active:translate-y-px active:shadow-hard-soft-sm",
 ],
 /** Dark plate for the title bar and night band. */
 dark: [
 "bg-ink-soft text-cream shadow-hard",
 "hover:bg-[#3d3150] hover:-translate-x-px hover:-translate-y-px",
 "active:translate-x-px active:translate-y-px active:shadow-hard-xs",
 ],
 /** Outlined only. No shadow, so it never competes with the primary. */
 outline: [
 "border-border bg-transparent text-foreground",
 "hover:bg-accent hover:text-accent-foreground",
 ],
 /** No chrome at all. Tabs, close buttons, list affordances. */
 ghost: ["border-transparent bg-transparent hover:bg-accent hover:text-accent-foreground"],
 /** Destructive is red-bordered, never red-filled — red is a load state. */
 destructive: [
 "border-crashed bg-cream-raised text-crashed-deep shadow-[3px_3px_0_var(--jule-crashed-deep)]",
 "hover:bg-[#fdecec] hover:-translate-x-px hover:-translate-y-px",
 "active:translate-x-px active:translate-y-px",
 ],
 link: "border-transparent text-gold underline-offset-4 hover:underline",
 },
 size: {
 /** 26px. The inline button inside a mini bar. */
 xs: "h-[26px] border-2 px-2.5 text-[8px]",
 /** 32px. Tray flyout actions. */
 sm: "h-8 px-3 text-[9px]",
 /** 38px. The panel's clear-context button. */
 default: "h-[38px] px-4 text-[10px]",
 /** 46px. The app screen's cleanse button and the site CTA. */
 lg: "h-[46px] px-5 text-[11px]",
 /** The site's hero CTA. */
 xl: "h-[58px] px-8 text-[14px]",
 icon: "size-[38px] p-0",
 "icon-sm": "size-8 p-0",
 "icon-xs": "size-[26px] border-2 p-0",
 },
 },
 defaultVariants: {
 variant: "primary",
 size: "default",
 },
 },
);

function Button({
 className,
 variant = "primary",
 size = "default",
 ...props
}: ButtonPrimitive.Props & VariantProps<typeof buttonVariants>) {
 return (
 <ButtonPrimitive
 data-slot="button"
 className={cn(buttonVariants({ variant, size, className }))}
 {...props}
 />
 );
}

export { Button, buttonVariants };
