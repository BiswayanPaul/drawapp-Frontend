import Image from "next/image";
import Link from "next/link";
import paintBrush from "@/app/fonts/paintbrush.png";
import { ThemeToggle } from "./theme/theme-toggle";
import UserMenu from "./user-menu";
import { Button } from "@/components/ui/button";
import type { ApiUser } from "@/lib/api";

const Navbar = ({ user, loading }: { user: ApiUser | null; loading?: boolean }) => {
  return (
    <header className="sticky top-0 z-30 border-b bg-background/80 backdrop-blur">
      <nav className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:h-16">
        <Link href="/" className="flex items-center gap-2.5 font-semibold">
          <Image src={paintBrush} height={30} width={30} alt="" />
          DrawApp
        </Link>
        <div className="flex items-center gap-1">
          <ThemeToggle />
          {user ? (
            <UserMenu user={user} />
          ) : (
            !loading && (
              <Button asChild size="sm" className="ml-1 h-9 px-4">
                <Link href="/signin">Sign in</Link>
              </Button>
            )
          )}
        </div>
      </nav>
    </header>
  );
};

export default Navbar;
