"use client";

import { FcGoogle } from "react-icons/fc";
import { Button } from "@/components/ui/button";
import { googleSignInUrl } from "@/lib/api";
import { safeNext } from "@/lib/redirect";

export function GoogleButton({ next = "/" }: { next?: string }) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => window.location.assign(googleSignInUrl(safeNext(next)))}
      className="h-11 w-full gap-2 bg-white/70 dark:bg-white/5"
    >
      <FcGoogle className="size-5" />
      Continue with Google
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="my-6 flex items-center gap-3 text-xs uppercase tracking-wider text-muted-foreground">
      <span className="h-px flex-1 bg-foreground/10" />
      or
      <span className="h-px flex-1 bg-foreground/10" />
    </div>
  );
}
