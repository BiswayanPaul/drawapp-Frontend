"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/avatar";
import { api, type ApiUser } from "@/lib/api";
import { useAuth } from "@/components/auth/auth-provider";

export default function UserMenu({ user }: { user: ApiUser }) {
  const router = useRouter();
  const { refreshSession } = useAuth();

  const signOut = async () => {
    try {
      await api.signOut();
    } finally {
      await refreshSession();
      router.replace("/signin");
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="flex items-center gap-2 rounded-full p-1 pr-3 outline-none transition hover:bg-secondary focus-visible:ring-2 focus-visible:ring-ring">
        <Avatar name={user.name ?? user.email} image={user.image} className="size-8" />
        <span className="hidden max-w-[10rem] truncate text-sm font-medium sm:block">
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
          onSelect={() => void signOut()}
          className="cursor-pointer text-red-600 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400"
        >
          <LogOut className="mr-2 size-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
