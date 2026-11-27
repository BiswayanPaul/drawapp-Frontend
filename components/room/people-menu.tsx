"use client";

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

const STATUS = {
  open: { label: "Live", dot: "bg-green-500", hint: "Connected to the drawing server" },
  connecting: {
    label: "Connecting…",
    dot: "bg-amber-400 animate-pulse",
    hint: "The server may take up to a minute to wake up",
  },
  reconnecting: {
    label: "Reconnecting…",
    dot: "bg-amber-400 animate-pulse",
    hint: "The server may take up to a minute to wake up",
  },
  denied: { label: "No access", dot: "bg-red-500", hint: "Your access to this room changed" },
} satisfies Record<SocketStatus, { label: string; dot: string; hint: string }>;

// Who's here, as an avatar stack; the corner dot is the connection status.
export function PeopleMenu({
  members,
  fallbackCount,
  me,
  status,
}: {
  members: Member[];
  fallbackCount: number;
  me: RoomUser;
  status: SocketStatus;
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
  const state = STATUS[status];
  const stack = people.length ? people.slice(0, 3) : [{ ...me, connectionId: "me", userId: me.id, tabs: 1 }];

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        title={`${count} in this room · ${state.label}`}
        className="glass relative inline-flex h-9 items-center gap-2 rounded-xl border pl-1.5 pr-2.5 text-sm outline-none transition hover:bg-white/80 focus-visible:ring-2 focus-visible:ring-ring data-[state=open]:bg-white/80 dark:hover:bg-white/10 dark:data-[state=open]:bg-white/10"
      >
        <span className="flex -space-x-2">
          {stack.map((person) => (
            <Avatar
              key={person.userId || person.connectionId}
              name={person.name}
              image={person.image}
              className="size-6 text-[10px] ring-2 ring-white dark:ring-slate-900"
            />
          ))}
        </span>
        <span className="font-medium tabular-nums">{count}</span>
        <span
          className={cn("absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-white dark:ring-slate-900", state.dot)}
          aria-label={state.label}
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-64">
        <DropdownMenuLabel className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-muted-foreground">
          In this room · {count}
          <span className="flex items-center gap-1.5 normal-case tracking-normal" title={state.hint}>
            <span className={cn("size-2 rounded-full", state.dot)} />
            {state.label}
          </span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {people.length === 0 ? (
          <p className="px-2 py-3 text-sm text-muted-foreground">{state.hint}</p>
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
                  <span className="text-xs text-muted-foreground">{person.tabs} tabs</span>
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
