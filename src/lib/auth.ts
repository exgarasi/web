import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDatabase } from "@/db";
import { authSchemaTables } from "@/db/auth-schema";

type RuntimeEnv = {
};

async function sendVerificationEmail(to: string, url: string, env: RuntimeEnv) {
  const apiKey = env.RESEND_API_KEY;
  const from = env.EMAIL_FROM;
  if (!apiKey || !from) {
    throw new Error("RESEND_API_KEY and EMAIL_FROM must be configured to send verification emails.");
  }
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [to],
      subject: "Verify your EXGARASI account",
      html: `<p>Welcome to EXGARASI.</p><p><a href="${url}">Verify your email address</a></p><p>This link expires according to the verification policy.</p>`,
    }),
  });
  if (!response.ok) throw new Error(`Email delivery failed: ${response.status}`);
}

export async function getAuth() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  }

  const database = await getDatabase();
  const production = process.env.NODE_ENV === "production";
  const auth = betterAuth({
    appName: "EXGARASI",
    secret,
    baseURL: process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL,
    database: drizzleAdapter(database.db, { provider: "pg", schema: authSchemaTables }),
    emailAndPassword: {
      enabled: true,
      requireEmailVerification: production,
      minPasswordLength: 10,
      maxPasswordLength: 128,
    },
    emailVerification: {
      sendOnSignUp: production,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => sendVerificationEmail(user.email, url, runtimeEnv),
    },
    session: {
      expiresIn: 60 * 60 * 24 * 14,
      updateAge: 60 * 60 * 24,
      cookieCache: { enabled: true, maxAge: 60 * 5 },
    },
    advanced: {
      useSecureCookies: production,
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", secure: production },
    },
  });

  return { auth, close: database.close };
}
