import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import db from "@/lib/db";
import { CredentialSchema } from "@/utils/schema";
import { getUserByEmail } from "@/utils/user";

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Vercel sets the host headers for us; without this, auth fails behind any proxy.
  trustHost: true,
  session: { strategy: "jwt" },
  pages: {
    signIn: "/signin",
    error: "/signin",
  },
  providers: [
    Credentials({
      async authorize(credentials) {
        const validateCredential = CredentialSchema.safeParse(credentials);
        if (!validateCredential.success) {
          return null;
        }

        const { email, password } = validateCredential.data;
        const user = await getUserByEmail(email.toLowerCase());

        // Accounts created through Google have no password.
        if (!user || !user.password) {
          return null;
        }

        const validatePassword = await bcrypt.compare(password, user.password);
        if (!validatePassword) {
          return null;
        }

        // Never put the password hash into the JWT.
        return {
          id: user.id,
          name: user.name,
          email: user.email,
          image: user.image,
        };
      },
    }),
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email) return false;

      try {
        const email = user.email.toLowerCase();
        const dbUser = await db.user.upsert({
          where: { email },
          update: { image: user.image ?? undefined },
          create: { email, name: user.name, image: user.image },
        });
        // Use our DB id (not Google's `sub`) so both providers share one identity.
        user.id = dbUser.id;
        return true;
      } catch (error) {
        console.error("[auth] Failed to persist Google user", error);
        return false;
      }
    },
    async jwt({ token, user }) {
      if (user?.id) token.sub = user.id;
      return token;
    },
    async session({ session, token }) {
      if (token.sub && session.user) session.user.id = token.sub;
      return session;
    },
  },
});
