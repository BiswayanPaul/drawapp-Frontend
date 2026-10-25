import Image from "next/image";
import Link from "next/link";
import type { User } from "next-auth";
import paintBrush from "@/app/fonts/paintbrush.png";
import { ThemeToggle } from "./theme/theme-toggle";
import UserMenu from "./user-menu";

const Navbar = ({ user }: { user: User }) => {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <Image src={paintBrush} height={30} width={30} alt="" />
          DrawApp
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          <UserMenu user={user} />
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
