"use client";

import Image from "next/image";
import type { User } from "next-auth";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SignOut } from "@/app/actions/authactions";
import profilePic from "@/app/fonts/profilepic.png";

export default function UserMenu({ user }: { user: User }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-1 pr-3 outline-none transition hover:bg-slate-100 focus-visible:ring-2 focus-visible:ring-ring">
        <Image
          src={user.image || profilePic}
          alt=""
          width={32}
          height={32}
          className="size-8 rounded-full object-cover"
        />
        <span className="hidden max-w-[10rem] truncate text-sm font-medium text-slate-700 sm:block">
          {user.name ?? user.email}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel className="font-normal">
          <p className="truncate text-sm font-medium">{user.name}</p>
          <p className="truncate text-xs text-muted-foreground">{user.email}</p>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => SignOut()}
          className="cursor-pointer text-red-600 focus:text-red-600"
        >
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
