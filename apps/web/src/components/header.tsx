import { TitleMark } from "@contextjule/ui/components/window-frame";
import Link from "next/link";

export default function Header() {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-5 md:px-14">
      <Link href="/" className="flex items-center gap-2.5">
        <TitleMark />
        <span className="font-pixel text-[13px] tracking-[0.06em] text-[#f4efe9]">contextjule</span>
      </Link>
      <nav className="flex items-center gap-6 font-pixel text-[9px] text-[#968fa3]">
        <Link href="/download" className="hover:text-gold">
          download
        </Link>
        <Link href="#price" className="hover:text-gold">
          price
        </Link>
      </nav>
    </header>
  );
}
