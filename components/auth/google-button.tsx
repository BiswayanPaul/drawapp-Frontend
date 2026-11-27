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
      className="h-11 w-full gap-2 bg-card"
    >
      <FcGoogle className="size-5" />
      Continue with Google
    </Button>
  );
}

export function OrDivider() {
  return (
    <div className="relative my-6 text-center text-xs uppercase tracking-wider text-muted-foreground">
      <span className="absolute inset-x-0 top-1/2 h-px bg-border" />
      <span className="relative bg-card px-3">or</span>
    </div>
  );
}
