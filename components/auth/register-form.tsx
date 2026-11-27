"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { Loader2 } from "lucide-react";
import { RegisterSchema } from "@/utils/schema";
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

export function RegisterForm({ next, onSwitch }: { next?: string; onSwitch: () => void }) {
  const [authError, setAuthError] = useState<string>();
  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof RegisterSchema>) {
    setAuthError(undefined);
    try {
      await api.register(values);
      // A full load picks up the new session cookie everywhere.
      window.location.assign(safeNext(next));
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : "Couldn't create your account.");
    }
  }

  const pending = form.formState.isSubmitting;

  return (
    <div className="text-left">
      <h1 id="auth-title" className="pr-6 font-display text-4xl font-bold">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-muted-foreground">
        It takes ten seconds. Then start drawing.
      </p>

      <FormError message={authError} />

      <GoogleButton next={safeNext(next)} />
      <OrDivider />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Jane Doe"
                    autoComplete="name"
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
                    placeholder="At least 6 characters"
                    type="password"
                    autoComplete="new-password"
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
            Create account
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <button type="button" onClick={onSwitch} className="font-medium text-primary hover:underline">
          Sign in
        </button>
      </p>
    </div>
  );
}
