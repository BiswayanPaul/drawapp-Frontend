"use client";

import { Button } from "@/components/ui/button";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useSession } from "next-auth/react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { SignOut } from "@/app/actions/authactions";
import paintBrush from "@/app/fonts/paintbrush.png";
import profilePic from "@/app/fonts/profilepic.png";

interface NavbarProps {
  items: [string, string][];
}

const Navbar = ({ items }: NavbarProps) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const toggleMenu = () => {
    setMenuOpen(!menuOpen);
  };

  async function handleSignOut() {
    await SignOut();
  }

  const router = useRouter();
  const session = useSession();
  if (session.status === "unauthenticated") {
    router.push("/signin");
  }

  return (
    <nav className="flex flex-col items-center w-full bg-gradient-to-r from-blue-500 to-teal-500 shadow-lg">
      <div className="flex justify-between items-center w-full p-4 md:w-[70%]">
        <Link href="/" className="flex items-center">
          <Image src={paintBrush} height={40} width={40} alt="PaintBrushLogo" />
        </Link>

        {/* Mobile Menu Button */}
        <div className="md:hidden">
          <DropdownMenu onOpenChange={toggleMenu}>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon">
                {menuOpen ? (
                  <X className="text-white" />
                ) : (
                  <Menu className="text-white" />
                )}
              </Button>
            </DropdownMenuTrigger>
            {menuOpen && (
              <DropdownMenuContent className="bg-gray-800 text-white rounded-md shadow-lg">
                {items.map(([label, link], index) => (
                  <DropdownMenuItem
                    key={index}
                    className="hover:bg-gray-700 text-lg"
                  >
                    <Link href={link} className="w-full">
                      {label}
                    </Link>
                  </DropdownMenuItem>
                ))}
                <DropdownMenuSeparator />
                <DropdownMenuItem className="flex flex-col justify-center items-center">
                  {session ? (
                    <Button
                      onClick={handleSignOut}
                      className="w-full bg-red-500 hover:bg-red-400 text-white text-lg"
                    >
                      Sign Out
                    </Button>
                  ) : (
                    <Button
                      onClick={() => router.push("/signin")}
                      className="w-full bg-blue-600 hover:bg-blue-500 text-white text-lg"
                    >
                      Sign In
                    </Button>
                  )}
                </DropdownMenuItem>
              </DropdownMenuContent>
            )}
          </DropdownMenu>
        </div>

        {/* Desktop Navbar */}
        <ul className="hidden md:flex justify-between items-center w-[70%]">
          {items.map(([label, link], index) => (
            <li key={index}>
              <Link href={link}>
                <Button
                  variant="link"
                  className="font-bold text-white hover:text-yellow-300 transition text-xl"
                >
                  {label}
                </Button>
              </Link>
            </li>
          ))}
          {session.data?.user ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <Image
                  src={session.data.user.image || profilePic}
                  alt="User Image"
                  width={40}
                  height={40}
                  className="rounded-full cursor-pointer"
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent className="bg-white shadow-lg rounded-md">
                <DropdownMenuItem>
                  <Button onClick={handleSignOut} className="text-lg">
                    Sign Out
                  </Button>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button
              onClick={() => router.push("/signin")}
              className="bg-blue-600 hover:bg-blue-500 text-white text-lg"
            >
              Sign In
            </Button>
          )}
        </ul>
      </div>
    </nav>
  );
};

export default Navbar;
