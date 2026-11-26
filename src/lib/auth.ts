import { betterAuth } from "better-auth";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDatabase } from "@/db";
import { authSchemaTables } from "@/db/auth-schema";

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

function parseEmailFrom(value: string) {
  const match = value.match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  if (match) {
    return { name: match[1].replace(/^["']|["']$/g, "").trim(), email: match[2].trim() };
  }
  return { name: "EXGARASI", email: value.trim() };
}

async function sendWithResend(message: EmailMessage, from: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      ...(message.text ? { text: message.text } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Resend rejected the email with status ${response.status}.`);
  }
}

async function sendWithBrevo(message: EmailMessage, from: string) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not configured.");

  const sender = parseEmailFrom(from);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": apiKey, "Content-Type": "application/json", accept: "application/json" },
    body: JSON.stringify({
      sender,
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html,
      ...(message.text ? { textContent: message.text } : {}),
    }),
  });

  if (!response.ok) {
    throw new Error(`Brevo rejected the email with status ${response.status}.`);
  }
}

async function sendEmail(message: EmailMessage) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM must be configured to send emails.");

  // Brevo is the primary provider. Resend is only a fallback if Brevo fails.
  try {
    await sendWithBrevo(message, from);
    console.info("[email] Email sent successfully via Brevo.");
    return;
  } catch (brevoError) {
    console.error("[email] Brevo primary delivery failed; trying Resend fallback.", brevoError);
  }

  try {
    await sendWithResend(message, from);
    console.warn("[email] Email delivered via Resend fallback.");
    return;
  } catch (resendError) {
    console.error("[email] Resend fallback also failed.", resendError);
    throw new Error("Email delivery failed with both Brevo and Resend.");
  }
}

async function sendVerificationEmail(to: string, url: string) {
  await sendEmail({
    to,
    subject: "Verify your EXGARASI account",
    html: `<p>Welcome to EXGARASI.</p><p><a href="${url}">Verify your email address</a></p><p>This link expires according to the verification policy.</p>`,
  });
}

async function sendPasswordResetEmail(to: string, url: string) {
  await sendEmail({
    to,
    subject: "Reset your EXGARASI password",
    html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#111318;line-height:1.6"><p style="font-size:12px;font-weight:700;letter-spacing:3px;color:#0099ff">EXGARASI</p><h1 style="font-size:24px">Reset your password</h1><p>We received a request to reset the password for your EXGARASI account.</p><p style="margin:28px 0"><a href="${url}" style="display:inline-block;background:#111318;color:#fff;text-decoration:none;padding:13px 22px;border-radius:8px">Reset password</a></p><p>This link expires in 1 hour. If you did not request a password reset, you can safely ignore this email.</p><p style="font-size:12px;color:#7b8794">EXGARASI · The automotive marketplace for enthusiasts.</p></div>`,
    text: `We received a request to reset your EXGARASI password. Open this link to choose a new password: ${url}\n\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
  });
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
      resetPasswordTokenExpiresIn: 60 * 60,
      revokeSessionsOnPasswordReset: true,
      sendResetPassword: async ({ user, url }) => sendPasswordResetEmail(user.email, url),
    },
    emailVerification: {
      sendOnSignUp: production,
      autoSignInAfterVerification: true,
      expiresIn: 60 * 60,
      sendVerificationEmail: async ({ user, url }) => sendVerificationEmail(user.email, url),
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
