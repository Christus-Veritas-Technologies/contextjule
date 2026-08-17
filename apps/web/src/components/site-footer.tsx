import Link from "next/link";

const LINKS = [
  { href: "/#how", label: "how it works" },
  { href: "/#buy", label: "price" },
  { href: "/download", label: "download" },
  { href: "mailto:hello@contextjule.com", label: "support" },
] as const;

export function SiteFooter() {
  return (
    <footer className="flex flex-col items-start gap-5 border-t-3 border-[#33683a] bg-night px-5 py-7 md:flex-row md:items-center md:justify-between md:px-10">
      <span className="font-pixel text-[10px] text-[#968fa3]">
        contextjule — a context meter with a pulse
      </span>
      <div className="flex flex-wrap gap-x-6 gap-y-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="font-pixel text-[10px] whitespace-nowrap text-[#968fa3] transition-colors hover:text-gold"
          >
            {link.label}
          </Link>
        ))}
      </div>
    </footer>
  );
}
