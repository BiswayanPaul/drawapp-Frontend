"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Whiteboard from "@/components/room/whiteboard";
import { useAuth } from "@/components/auth/auth-provider";
import { safeNext } from "@/lib/redirect";
import type { AuthMode } from "./auth-dialog";

// /signin and /register: the board with the auth popup already open.
// Someone already signed in goes straight on to where they were heading.
export function AuthBoard({ mode, next, error }: { mode: AuthMode; next?: string; error?: string }) {
  const router = useRouter();
  const { user, loading } = useAuth();

  useEffect(() => {
    if (!loading && user) router.replace(safeNext(next));
  }, [loading, next, router, user]);

  if (loading || user) return null;
  return <Whiteboard initialAuth={{ mode, next: safeNext(next), error }} />;
}
