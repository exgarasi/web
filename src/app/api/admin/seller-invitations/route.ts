import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";
import { getAdminAccess } from "@/lib/admin-permissions";
import { sendSellerInvitationEmail } from "@/lib/auth";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const access = await getAdminAccess("sellers.invite");
  if (!access) return NextResponse.json({ error: "Forbidden." }, { status: 403 });

  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(email))
    return NextResponse.json({ error: "A valid seller email is required." }, { status: 400 });

  const configuredBaseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  if (!configuredBaseUrl) {
    return NextResponse.json({ error: "APP_BASE_URL must point to the current Preview environment." }, { status: 500 });
  }
  let invitationBaseUrl: URL;
  try {
    invitationBaseUrl = new URL(configuredBaseUrl);
    if (invitationBaseUrl.protocol !== "https:" || invitationBaseUrl.username || invitationBaseUrl.password)
      throw new Error("Invalid application URL");
    invitationBaseUrl.pathname = "/";
    invitationBaseUrl.search = "";
    invitationBaseUrl.hash = "";
  } catch {
    return NextResponse.json({ error: "Application URL is not configured correctly." }, { status: 500 });
  }

  let invitationId: string | null = null;
  try {
    const result = await withAuthenticatedDb(async (tx) => {
      const roles = await tx`select role from public.user_roles where user_id = public.app_current_user_id() and role in ('admin','super_admin')`;
      if (!roles.length) throw new Error("FORBIDDEN");
      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const rows = await tx`
        insert into public.seller_invitations(email,invited_by,token_hash,expires_at)
        values(${email},public.app_current_user_id(),${tokenHash},now()+interval '7 days')
        returning id,expires_at
      `;
      return { invitationId: String(rows[0].id), expiresAt: String(rows[0].expires_at), rawToken };
    });
    invitationId = result.invitationId;
    const acceptUrl = new URL("/seller/accept-invitation", invitationBaseUrl);
    acceptUrl.searchParams.set("token", result.rawToken);

    try {
      await sendSellerInvitationEmail(email, acceptUrl.toString(), result.expiresAt);
    } catch (emailError) {
      await withAuthenticatedDb(async (tx) => {
        await tx`update public.seller_invitations set status='revoked' where id=${result.invitationId}::uuid and status='pending'`;
      }).catch((revokeError) => {
        console.error("[seller-invitation] Failed to revoke invitation after email failure.", revokeError);
      });
      console.error("[seller-invitation] Invitation email delivery failed.", emailError);
      return NextResponse.json({ error: "Undangan belum terkirim. Undangan dibatalkan; periksa konfigurasi Resend/Brevo dan coba lagi." }, { status: 502 });
    }

    return NextResponse.json({ invitationId: result.invitationId, email, expiresAt: result.expiresAt, delivery: "accepted" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invitation failed.";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
