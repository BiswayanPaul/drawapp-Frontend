"use client";

import { useFormStatus } from "react-dom";
import { FcGoogle } from "react-icons/fc";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SignInWithGoogle } from "@/app/actions/authactions";

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="h-11 w-full gap-2 bg-white text-slate-800"
    >
      {pending ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <FcGoogle className="size-5" />
      )}
      Continue with Google
    </Button>
  );
}

export function GoogleButton() {
  return (
    <form action={SignInWithGoogle}>
      <SubmitButton />
    </form>
  );
}

export function OrDivider() {
  return (
    <div className="relative my-6 text-center text-xs uppercase tracking-wider text-slate-400">
      <span className="absolute inset-x-0 top-1/2 h-px bg-slate-200" />
      <span className="relative bg-white px-3">or</span>
    </div>
  );
}
