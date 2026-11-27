"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { GlassCard } from "@/components/ui/glass-dialog";
import { FormError } from "@/components/auth/form-error";
import { api } from "@/lib/api";

export default function RoomLock({ roomId, onUnlocked }: { roomId: string; onUnlocked: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    try {
      await api.unlockRoom(roomId, password);
      onUnlocked();
    } catch (error) {
      setError(error instanceof Error ? error.message : "Couldn't unlock this room.");
      setPending(false);
    }
  };

  return (
    <GlassCard>
      <span className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-2xl bg-primary/10 text-primary">
        <Lock className="size-6" />
      </span>
      <h1 className="text-xl font-bold">This room is private</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Enter the password for room{" "}
        <span className="font-mono font-semibold tracking-widest text-foreground">
          {roomId}
        </span>{" "}
        to join.
      </p>
      <FormError message={error} />
      <form onSubmit={onSubmit} className="space-y-3 text-left">
        <Input
          type="password"
          autoFocus
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Room password"
          autoComplete="off"
          className="h-11 bg-white/60 dark:bg-white/5"
        />
        <Button type="submit" disabled={pending || !password} className="h-11 w-full">
          {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
          Join room
        </Button>
      </form>
      <Link
        href="/"
        className="mt-5 inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to my board
      </Link>
    </GlassCard>
  );
}
