"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { RegisterSchema } from "@/utils/schema";
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
import { Register, SingInWithGoogle } from "@/app/actions/authactions";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const RegisterPage = () => {
  const [authError, setAuthError] = useState<string>("");
  const router = useRouter();
  const form = useForm<z.infer<typeof RegisterSchema>>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      name: "",
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof RegisterSchema>) {
    const response = await Register(values);
    if (response.error) {
      setAuthError(response.error);
    }
    if (response?.success) {
      router.push("/signin");
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
    <div className="h-screen w-screen flex justify-center items-center bg-gradient-to-br from-purple-500 to-blue-500">
      <Card className="w-full max-w-md bg-white shadow-lg rounded-lg p-6">
        <CardHeader className="text-center font-bold text-3xl text-gray-800">
          Register
        </CardHeader>
        {authError && (
          <div className="flex justify-center mt-4">
            <Alert className="w-[90%]" variant="destructive">
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
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-gray-700">Name</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="John Doe"
                        {...field}
                        className="border-gray-300 focus:border-blue-600 focus:ring focus:ring-blue-500 transition duration-200"
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
                    <FormLabel className="text-gray-700">Email</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="johndoe@example.com"
                        type="email"
                        {...field}
                        className="border-gray-300 focus:border-blue-600 focus:ring focus:ring-blue-500 transition duration-200"
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
                    <FormLabel className="text-gray-700">Password</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="*******"
                        type="password"
                        autoComplete="off"
                        {...field}
                        className="border-gray-300 focus:border-blue-600 focus:ring focus:ring-blue-500 transition duration-200"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="text-center">
                <Button
                  variant="link"
                  className="text-blue-600 hover:underline"
                >
                  <Link href="/signin">Already have an account?</Link>
                </Button>
              </div>
              <div className="w-full">
                <Button className="w-full bg-blue-600 text-white hover:bg-blue-500 transition-colors duration-200">
                  Submit
                </Button>
              </div>
            </form>
          </Form>
          <div className="w-full mt-4">
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

export default RegisterPage;
