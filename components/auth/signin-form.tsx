"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { Loader2 } from "lucide-react";
import { CredentialSchema } from "@/utils/schema";
import { api } from "@/lib/api";
import { safeNext } from "@/lib/redirect";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { GoogleButton, OrDivider } from "./google-button";
import { FormError } from "./form-error";

export function SignInForm({
  initialError,
  next,
  onSwitch,
}: {
  initialError?: string;
  next?: string;
  onSwitch: () => void;
}) {
  const [authError, setAuthError] = useState(initialError);
  const form = useForm<z.infer<typeof CredentialSchema>>({
    resolver: zodResolver(CredentialSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof CredentialSchema>) {
    setAuthError(undefined);
    try {
      await api.signIn(values);
      // A full load picks up the new session cookie everywhere.
      window.location.assign(safeNext(next));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Couldn't sign you in.");
    }
  }

  const pending = form.formState.isSubmitting;

  return (
    <div className="text-left">
      <h1 id="auth-title" className="pr-6 text-2xl font-bold">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Sign in to create or join a drawing room.
      </p>

      <FormError message={authError} />

      <GoogleButton next={safeNext(next)} />
      <OrDivider />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    placeholder="you@example.com"
                    type="email"
                    autoComplete="email"
                    className="h-11 bg-white/60 dark:bg-white/5"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <Input
                    placeholder="••••••••"
                    type="password"
                    autoComplete="current-password"
                    className="h-11 bg-white/60 dark:bg-white/5"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={pending} className="h-11 w-full">
            {pending && <Loader2 className="mr-2 size-4 animate-spin" />}
            Sign in
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <button type="button" onClick={onSwitch} className="font-medium text-primary hover:underline">
          Create one
        </button>
      </p>
    </div>
  );
}
