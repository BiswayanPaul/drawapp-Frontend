"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowLeft, Loader2, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormError } from "@/components/auth/form-error";
import { unlockRoom } from "@/app/actions/roomactions";

export default function RoomLock({ roomId }: { roomId: string }) {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string>();
  const [pending, setPending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPending(true);
    setError(undefined);
    const result = await unlockRoom(roomId, password);
    if (result.error) {
      setError(result.error);
      setPending(false);
      return;
    }
    router.refresh();
  };

  return (
    <div className="bg-dots flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xl shadow-slate-200/60 sm:p-8 dark:shadow-black/30">
        <span className="mx-auto mb-4 inline-flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
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
            className="h-11"
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
          Back home
        </Link>
      </div>
    </div>
  );
}
