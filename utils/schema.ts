import z from "zod";

export const RegisterSchema = z.object({
  name: z.string().trim().min(1, { message: "Name is required" }).max(60),
  email: z.string().trim().email({ message: "Enter a valid email address" }),
  password: z
    .string()
    .min(6, { message: "Password should be at least 6 characters" }),
});

export const CredentialSchema = z.object({
  email: z.string().trim().email({ message: "Enter a valid email" }),
  password: z.string().min(1, { message: "Password is required" }),
});

export const RoomIdSchema = z
  .string()
  .trim()
  .regex(/^[a-zA-Z0-9]{4,12}$/, {
    message: "Room codes are 4–12 letters or numbers",
  });
