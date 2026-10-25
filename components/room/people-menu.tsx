"use client";

import { ChevronDown, Users } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar } from "@/components/avatar";
import { cn } from "@/lib/utils";
import type { Member, RoomUser } from "@/lib/drawing";
import type { SocketStatus } from "@/hooks/useRoomSocket";

export function PeopleMenu({
  members,
  fallbackCount,
  me,
}: {
  members: Member[];
  fallbackCount: number;
  me: RoomUser;
}) {
  // Merge multiple tabs of the same account into one row.
  const people = Array.from(
    members
      .reduce((map, member) => {
        const key = member.userId || member.connectionId;
        const existing = map.get(key);
        map.set(key, { ...member, tabs: (existing?.tabs ?? 0) + 1 });
        return map;
      }, new Map<string, Member & { tabs: number }>())
      .values()
  ).sort((a, b) => Number(b.userId === me.id) - Number(a.userId === me.id));
  const count = people.length || fallbackCount;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="inline-flex h-9 items-center gap-1.5 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground shadow-sm outline-none transition hover:bg-secondary hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-secondary sm:px-3">
        <Users className="size-4" />
        <span className="font-medium text-foreground">{count}</span>
        <ChevronDown className="size-3.5" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
        <DropdownMenuLabel className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
          In this room · {count}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {people.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">
            Connecting…
          </p>
        ) : (
          <ul className="max-h-72 overflow-y-auto py-1">
            {people.map((person) => (
              <li
                key={person.userId || person.connectionId}
                className="flex items-center gap-2.5 rounded-sm px-2 py-1.5"
              >
                <Avatar name={person.name} image={person.image} />
                <span className="min-w-0 flex-1 truncate text-sm">
                  {person.name}
                  {person.userId === me.id && (
                    <span className="text-muted-foreground"> (you)</span>
                  )}
                </span>
                {person.tabs > 1 && (
                  <span className="text-xs text-muted-foreground">
                    {person.tabs} tabs
                  </span>
                )}
                <span className="size-2 rounded-full bg-green-500" />
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function StatusBadge({ status }: { status: SocketStatus }) {
  const config = {
    open: { label: "Live", dot: "bg-green-500" },
    connecting: { label: "Connecting…", dot: "bg-amber-400 animate-pulse" },
    reconnecting: { label: "Reconnecting…", dot: "bg-amber-400 animate-pulse" },
  }[status];

  return (
    <span
      className="inline-flex h-9 items-center gap-2 rounded-lg border bg-card px-2.5 text-sm text-muted-foreground shadow-sm sm:px-3"
      title={
        status === "open"
          ? "Connected to the drawing server"
          : "The server may take up to a minute to wake up"
      }
    >
      <span className={cn("size-2 rounded-full", config.dot)} />
      <span className="hidden sm:inline">{config.label}</span>
    </span>
  );
}
