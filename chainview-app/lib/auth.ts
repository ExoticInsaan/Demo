import { NextAuthOptions, getServerSession } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { db } from "./db";

export const isAdmin = (email?: string | null) =>
  !!email && (process.env.ADMIN_EMAILS ?? "").split(",").map(s => s.trim().toLowerCase()).includes(email.toLowerCase());

export const authOptions: NextAuthOptions = {
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google({ clientId: process.env.GOOGLE_CLIENT_ID ?? "", clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "" }),
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(c) {
        const user = await db.user.findUnique({ where: { email: (c?.email ?? "").toLowerCase() } });
        if (!user?.passwordHash || user.suspended) return null;
        if (!(await bcrypt.compare(c?.password ?? "", user.passwordHash))) return null;
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google" && user.email) {
        const u = await db.user.upsert({
          where: { email: user.email.toLowerCase() },
          update: {},
          create: { email: user.email.toLowerCase(), name: user.name },
        });
        if (u.suspended) return false;
      }
      return true;
    },
    async jwt({ token }) {
      if (token.email) {
        const u = await db.user.findUnique({ where: { email: token.email } });
        token.uid = u?.id; token.suspended = u?.suspended ?? false;
      }
      return token;
    },
    async session({ session, token }) {
      (session.user as any).id = token.uid;
      return session;
    },
  },
  events: {
    async signIn({ user }) {
      const u = user.email ? await db.user.findUnique({ where: { email: user.email.toLowerCase() } }) : null;
      if (u) await db.activityLog.create({ data: { userId: u.id, action: "Logged in" } });
    },
  },
};
export const getSession = () => getServerSession(authOptions);
