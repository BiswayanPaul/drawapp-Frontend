import Image from "next/image";
import Link from "next/link";
import type { User } from "next-auth";
import paintBrush from "@/app/fonts/paintbrush.png";
import UserMenu from "./user-menu";

const Navbar = ({ user }: { user: User }) => {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/80 backdrop-blur">
      <nav className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2.5 font-semibold text-slate-900">
          <Image src={paintBrush} height={32} width={32} alt="" />
          DrawApp
        </Link>
        <UserMenu user={user} />
      </nav>
    </header>
  );
};

export default Navbar;
