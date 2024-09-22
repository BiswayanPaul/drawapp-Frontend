"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { CredentialSchema } from "@/utils/schema";
import Link from "next/link";
import { useForm } from "react-hook-form";
import z from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { FcGoogle } from "react-icons/fc";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useSession } from "next-auth/react";
import { Button } from "@/components/ui/button";
import {
  SignInWithCredentials,
  SingInWithGoogle,
} from "@/app/actions/authactions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const SignInPage = () => {
  const [authError, setAuthError] = useState<string>("");
  const router = useRouter();
  const form = useForm<z.infer<typeof CredentialSchema>>({
    resolver: zodResolver(CredentialSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof CredentialSchema>) {
    const response = await SignInWithCredentials(values);
    if (response.error) {
      setAuthError(response.error);
    }
    if (response?.success) {
      router.push("/");
    }
  }

  async function handleGoogleSignIn() {
    await SingInWithGoogle();
  }

  const session = useSession();
  if (session.status === "authenticated") {
    router.push("/");
  }

  return (
    <div className="h-screen w-screen flex justify-center items-center bg-gradient-to-br from-blue-500 to-purple-600">
      <Card className="w-full max-w-md shadow-lg rounded-lg">
        <CardHeader className="text-center font-extrabold text-3xl text-gray-800">
          Sign In
        </CardHeader>
        {authError && (
          <div className="flex justify-center h-50">
            <Alert className="w-[80%]" variant="destructive">
              <AlertTitle>Error</AlertTitle>
              <AlertDescription>{authError}</AlertDescription>
            </Alert>
          </div>
        )}
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="johndoe@example.com"
                        type="email"
                        className="border rounded-md focus:ring focus:ring-blue-300 transition duration-200"
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
                        placeholder="*******"
                        type="password"
                        autoComplete="false"
                        className="border rounded-md focus:ring focus:ring-blue-300 transition duration-200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="text-center">
                <Button variant="link" className="text-blue-500">
                  <Link href="/register">Don&apos;t have an account?</Link>
                </Button>
              </div>
              <div className="p-2 w-full">
                <Button
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-md transition duration-300"
                  type="submit"
                >
                  Submit
                </Button>
              </div>
            </form>
          </Form>
          <div className="w-full p-2">
            <Button
              onClick={handleGoogleSignIn}
              className="w-full flex items-center justify-center bg-white text-gray-800 rounded-md shadow-md hover:bg-gray-100 transition duration-300"
              type="button"
            >
              <FcGoogle className="size-5 mr-2" />
              <span className="font-semibold">Sign In with Google</span>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SignInPage;
