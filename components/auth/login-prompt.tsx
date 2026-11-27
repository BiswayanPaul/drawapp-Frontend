"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LogIn, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { GoogleButton } from "./google-button";
import { withNext } from "@/lib/redirect";

type PromptProps = {
  title: string;
  message: string;
  // Where to come back to once signed in.
  next: string;
};

function PromptBody({ title, message, next }: PromptProps) {
  return (
    <>
      <span className="mb-4 inline-flex size-12 items-center justify-center rounded-full bg-accent text-accent-foreground">
        <LogIn className="size-6" />
      </span>
      <h2 id="login-prompt-title" className="text-xl font-bold">
        {title}
      </h2>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">{message}</p>
      <div className="space-y-3">
        <GoogleButton next={next} />
        <Button asChild className="h-11 w-full">
          <Link href={withNext("/signin", next)}>Sign in with email</Link>
        </Button>
      </div>
      <p className="mt-5 text-sm text-muted-foreground">
        New here?{" "}
        <Link href={withNext("/register", next)} className="font-medium text-primary hover:underline">
          Create an account
        </Link>
      </p>
    </>
  );
}

// Shown when a guest tries something that needs an account.
export function LoginPrompt({ onClose, ...props }: PromptProps & { onClose: () => void }) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 p-4 backdrop-blur-sm sm:items-center"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="login-prompt-title"
        className="relative w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-2xl sm:p-8"
      >
        <button
          onClick={onClose}
          aria-label="Close"
          className="absolute right-3 top-3 rounded-md p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
        >
          <X className="size-5" />
        </button>
        <PromptBody {...props} />
      </div>
    </div>
  );
}

// Full-page version for pages that can't be used at all without an account.
export function LoginRequired({ children, ...props }: PromptProps & { children?: React.ReactNode }) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm rounded-2xl border bg-card p-6 text-center shadow-xl shadow-slate-200/60 sm:p-8 dark:shadow-black/30">
        <PromptBody {...props} />
        {children}
      </div>
    </div>
  );
}
