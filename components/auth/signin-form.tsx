"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { Loader2 } from "lucide-react";
import { CredentialSchema } from "@/utils/schema";
import { SignInWithCredentials } from "@/app/actions/authactions";
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

export function SignInForm({ initialError }: { initialError?: string }) {
  const [authError, setAuthError] = useState(initialError);
  const form = useForm<z.infer<typeof CredentialSchema>>({
    resolver: zodResolver(CredentialSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof CredentialSchema>) {
    setAuthError(undefined);
    const response = await SignInWithCredentials(values);
    if (response.error) {
      setAuthError(response.error);
      return;
    }
    // Full navigation so the server layout picks up the fresh session cookie.
    window.location.assign("/");
  }

  const pending = form.formState.isSubmitting;

  return (
    <div className="rounded-2xl border bg-card p-6 shadow-xl shadow-slate-200/60 sm:p-8 dark:shadow-black/30">
      <h1 className="text-2xl font-bold">Welcome back</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        Sign in to create or join a drawing room.
      </p>

      <FormError message={authError} />

      <GoogleButton />
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
                    className="h-11"
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
                    className="h-11"
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
        <Link
          href="/register"
          className="font-medium text-primary hover:underline"
        >
          Create one
        </Link>
      </p>
    </div>
  );
}
