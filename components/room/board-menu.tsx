"use client";

import { useTheme } from "next-themes";
import {
  Download,
  Globe,
  Lock,
  LogIn,
  LogOut,
  Menu,
  Moon,
  Sun,
  Trash2,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";
import type { ApiUser } from "@/lib/api";

const ITEM = "cursor-pointer gap-2.5 rounded-lg px-2.5 py-2 focus:bg-foreground/5";
const DANGER =
  "text-red-600 focus:bg-red-500/10 focus:text-red-600 dark:text-red-400 dark:focus:text-red-400";

// Everything that isn't drawing lives behind this one button.
export function BoardMenu({
  account,
  room,
  onPrivacy,
  onLeave,
  onDrawTogether,
  onSignIn,
  onSignOut,
  onDownload,
  onClear,
}: {
  account: ApiUser | null;
  room?: { roomId: string; isOwner: boolean; isPrivate: boolean };
  onPrivacy: () => void;
  onLeave: () => void;
  onDrawTogether: () => void;
  onSignIn: () => void;
  onSignOut: () => void;
  onDownload: () => void;
  onClear: () => void;
}) {
  const { resolvedTheme, setTheme } = useTheme();
  const dark = resolvedTheme === "dark";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu"
        title="Menu"
        className="glass inline-flex size-9 items-center justify-center rounded-xl border text-foreground outline-none transition hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-white/80 dark:hover:bg-white/10 dark:data-[state=open]:bg-white/10"
      >
        <Menu className="size-[18px]" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64 p-1.5">
        {account ? (
          <DropdownMenuLabel className="flex items-center gap-2.5 px-2.5 py-2 font-normal">
            <Avatar name={account.name ?? account.email} image={account.image} className="size-8" />
            <span className="min-w-0">
              <span className="block truncate text-sm font-medium">{account.name ?? account.email}</span>
              <span className="block truncate text-xs text-muted-foreground">{account.email}</span>
            </span>
          </DropdownMenuLabel>
        ) : (
          <DropdownMenuLabel className="px-2.5 py-2 text-xs font-normal text-muted-foreground">
            Drawing as a guest · saved in this browser
          </DropdownMenuLabel>
        )}
        <DropdownMenuSeparator />

        {room ? (
          room.isOwner ? (
            <DropdownMenuItem className={ITEM} onSelect={onPrivacy}>
              {room.isPrivate ? <Lock className="size-4" /> : <Globe className="size-4" />}
              <span className="flex-1">Room privacy</span>
              <span className="text-xs text-muted-foreground">{room.isPrivate ? "Private" : "Public"}</span>
            </DropdownMenuItem>
          ) : (
            room.isPrivate && (
              <DropdownMenuLabel className="flex items-center gap-2.5 px-2.5 py-2 text-sm font-normal text-muted-foreground">
                <Lock className="size-4" /> Private room
              </DropdownMenuLabel>
            )
          )
        ) : (
          <DropdownMenuItem className={ITEM} onSelect={onDrawTogether}>
            <Users className="size-4" />
            Draw together
          </DropdownMenuItem>
        )}

        <DropdownMenuItem className={ITEM} onSelect={onDownload}>
          <Download className="size-4" />
          Download as PNG
        </DropdownMenuItem>
        <DropdownMenuItem
          className={ITEM}
          // Keep the menu open so the switch is visible.
          onSelect={(e) => {
            e.preventDefault();
            setTheme(dark ? "light" : "dark");
          }}
        >
          {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
          <span className="flex-1">{dark ? "Light mode" : "Dark mode"}</span>
          <span
            aria-hidden
            className={cn(
              "relative h-5 w-9 rounded-full bg-foreground/15 transition",
              "after:absolute after:left-0.5 after:top-0.5 after:size-4 after:rounded-full after:bg-white after:shadow after:transition",
              dark && "bg-primary after:translate-x-4"
            )}
          />
        </DropdownMenuItem>
        <DropdownMenuItem className={cn(ITEM, DANGER)} onSelect={onClear}>
          <Trash2 className="size-4" />
          Clear board
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        {room ? (
          <DropdownMenuItem className={cn(ITEM, DANGER)} onSelect={onLeave}>
            <LogOut className="size-4" />
            Leave room
          </DropdownMenuItem>
        ) : account ? (
          <DropdownMenuItem className={ITEM} onSelect={onSignOut}>
            <LogOut className="size-4" />
            Sign out
          </DropdownMenuItem>
        ) : (
          <DropdownMenuItem className={ITEM} onSelect={onSignIn}>
            <LogIn className="size-4" />
            Sign in
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
