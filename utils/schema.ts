import z from "zod";

export const RegisterSchema = z.object({
  name: z.string(),
  email: z.string().email({ message: "Enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password Should be Minimum of 6 characters" }),
});

export const CredentialSchema = z.object({
  email: z.string().email({ message: "Enter a valid Email" }),
  password: z.string().min(1, { message: "Password Required" }),
});
