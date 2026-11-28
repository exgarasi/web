import { betterAuth } from "better-auth";
import { getCloudflareContext } from "@opennextjs/cloudflare";
import { drizzleAdapter } from "@better-auth/drizzle-adapter";
import { getDatabase } from "@/db";
import { authSchemaTables } from "@/db/auth-schema";

type EmailMessage = {
  to: string;
  subject: string;
  html: string;
  text?: string;
};

class ResendDeliveryError extends Error {
  readonly code: string | null;

  constructor(
    readonly status: number,
    readonly response: string,
  ) {
    super(`Resend rejected the email (HTTP ${status}): ${response.slice(0, 500)}`);
    this.name = "ResendDeliveryError";

    try {
      const payload = JSON.parse(response) as { name?: unknown };
      this.code = typeof payload.name === "string" ? payload.name : null;
    } catch {
      this.code = null;
    }
  }
}

function parseEmailFrom(value: string) {
  const match = value.trim().match(/^\s*(.*?)\s*<([^<>]+)>\s*$/);
  const name = match?.[1]?.replace(/^["']|["']$/g, "").trim() || "EXGARASI";
  const email = (match?.[2] ?? value).trim();

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("EMAIL_FROM must contain a valid sender email address.");
  }

  return { name, email };
}

async function sendWithResend(message: EmailMessage, from: string) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [message.to],
      subject: message.subject,
      html: message.html,
      ...(message.text ? { text: message.text } : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[email] Resend delivery failed.", {
      status: response.status,
      response: errorBody.slice(0, 2000),
    });
    throw new ResendDeliveryError(response.status, errorBody);
  }

  const result = (await response.json()) as { id?: string };
  console.info("[email] Email accepted by Resend.", {
    messageId: result.id ?? "not-provided",
  });
}

async function sendWithBrevo(message: EmailMessage, from: string) {
  const apiKey = process.env.BREVO_API_KEY;
  if (!apiKey) throw new Error("BREVO_API_KEY is not configured.");

  const sender = parseEmailFrom(from);
  const response = await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "Content-Type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({
      sender,
      to: [{ email: message.to }],
      subject: message.subject,
      htmlContent: message.html,
      ...(message.text ? { textContent: message.text } : {}),
    }),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    console.error("[email] Brevo fallback delivery failed.", {
      status: response.status,
      response: errorBody.slice(0, 2000),
    });
    throw new Error(
      `Brevo rejected the fallback email (HTTP ${response.status}): ${errorBody.slice(0, 500)}`,
    );
  }

  const result = (await response.json()) as { messageId?: string };
  console.info("[email] Email accepted by Brevo fallback.", {
    messageId: result.messageId ?? "not-provided",
  });
}

function shouldUseBrevoFallback(error: unknown) {
  if (!(error instanceof ResendDeliveryError)) return false;

  // Resend uses HTTP 429 for request-rate limits and exhausted daily/monthly
  // email quotas. Prefer its structured error name, with a message fallback
  // for responses that do not include a machine-readable name.
  const fallbackCodes = new Set([
    "rate_limit_exceeded",
    "daily_quota_exceeded",
    "monthly_quota_exceeded",
  ]);

  return (
    error.status === 429 ||
    (error.code !== null && fallbackCodes.has(error.code)) ||
    /quota|daily.{0,30}limit|monthly.{0,30}limit|sending limit|limit exceeded/i.test(
      error.response,
    )
  );
}

async function sendEmail(message: EmailMessage) {
  const from = process.env.EMAIL_FROM;
  if (!from) throw new Error("EMAIL_FROM must be configured to send emails.");

  try {
    await sendWithResend(message, from);
  } catch (error) {
    if (!shouldUseBrevoFallback(error)) {
      throw error;
    }

    console.warn("[email] Resend quota/rate limit reached; switching to Brevo.");
    await sendWithBrevo(message, from);
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
    text: `We received a request to reset your EXGARASI password. Open this link to choose a new password: ${url}\\n\\nThis link expires in 1 hour. If you did not request this, you can ignore this email.`,
  });
}

export async function getAuth() {
  const { env } = getCloudflareContext();
  const runtimeEnv = env as unknown as Record<string, string | undefined>;
  const readEnv = (key: string) =>
    process.env[key]?.trim() || runtimeEnv[key]?.trim() || "";
  const secret = readEnv("AUTH_SECRET");
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET must be configured with at least 32 characters.");
  }

  const googleClientId = readEnv("GOOGLE_CLIENT_ID");
  const googleClientSecret = readEnv("GOOGLE_CLIENT_SECRET");
  const googleCredentialsAvailable = Boolean(googleClientId && googleClientSecret);
  console.info("[auth] Google OAuth credentials available:", googleCredentialsAvailable);

  const database = await getDatabase();
  const production = process.env.NODE_ENV === "production";
  const auth = betterAuth({
    appName: "EXGARASI",
    secret,
    baseURL: {
      allowedHosts: [
        "exgarasi.id",
        "www.exgarasi.id",
        "fix-google-oauth-prod-isolated-exgarasi.exgarasi-id.workers.dev",
        "feat-seller-verification-exgarasi.exgarasi-id.workers.dev",
        "*-exgarasi.exgarasi-id.workers.dev",
      ],
      protocol: "auto",
      fallback: "https://exgarasi.id",
    },
    trustedOrigins: [
      "https://exgarasi.id",
      "https://www.exgarasi.id",
      "https://*-exgarasi.exgarasi-id.workers.dev",
    ],
    database: drizzleAdapter(database.db, { provider: "pg", schema: authSchemaTables }),
    ...(googleCredentialsAvailable
      ? {
          socialProviders: {
            google: {
              clientId: googleClientId,
              clientSecret: googleClientSecret,
              prompt: "select_account" as const,
            },
          },
        }
      : {}),
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
