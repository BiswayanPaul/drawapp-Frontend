import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import { CredentialSchema } from "./utils/schema";
import { getUserByEmail } from "./utils/user";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

export const { handlers, signIn, signOut, auth } = NextAuth({
  providers: [
    Credentials({
      async authorize(credentials) {
        const validateCredential = CredentialSchema.safeParse(credentials);
        if (!validateCredential.success) {
          return null;
        }

        const { email, password } = validateCredential.data;
        const user = await getUserByEmail(email);

        if (!user || !user.password) {
          return null;
        }

        const validatePassword = await bcrypt.compare(password, user.password);

        if (!validatePassword) {
          return null;
        }

        return user;
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
      async profile(profile) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ profile }) {
      if (profile && profile.email) {
        const existingUser = await prisma.user.findUnique({
          where: { email: profile.email },
        });

        if (!existingUser) {
          await prisma.user.create({
            data: {
              email: profile.email,
              name: profile.name,
              image: profile.picture,
            },
          });
        }
      }
      return true;
    },
  },
});
