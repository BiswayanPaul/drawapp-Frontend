"use client";

import Link from "next/link";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import z from "zod";
import { Loader2 } from "lucide-react";
import { RegisterSchema } from "@/utils/schema";
import { Register } from "@/app/actions/authactions";
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

export function RegisterForm() {
  const [authError, setAuthError] = useState<string>();
  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: { name: "", email: "", password: "" },
  });

  async function onSubmit(values: z.infer<typeof RegisterSchema>) {
    setAuthError(undefined);
    const response = await Register(values);
    if (response.error) {
      setAuthError(response.error);
      return;
    }
    window.location.assign("/");
  }

  const pending = form.formState.isSubmitting;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-xl shadow-slate-200/60">
      <h1 className="text-2xl font-bold text-slate-900">Create your account</h1>
      <p className="mb-6 mt-1 text-sm text-slate-500">
        It takes ten seconds. Then start drawing.
      </p>

      <FormError message={authError} />

      <GoogleButton />
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
                    placeholder="At least 6 characters"
                    type="password"
                    autoComplete="new-password"
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
            Create account
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-sm text-slate-500">
        Already have an account?{" "}
        <Link href="/signin" className="font-medium text-primary hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
