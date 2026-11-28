import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";
import { getAdminAccess } from "@/lib/admin-permissions";
import { createAdminRoute } from "@/lib/admin-route";
import { sendSellerInvitationEmail } from "@/lib/auth";

export const runtime = "nodejs";

export const POST = createAdminRoute("sellers.invite", getAdminAccess, async (request, _access) => {

  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "A valid seller email is required." }, { status: 400 });

  const configuredBaseUrl = process.env.APP_BASE_URL || process.env.NEXT_PUBLIC_APP_URL;
  let invitationBaseUrl: URL;
  try {
    // If no explicit base URL is configured, derive it only from a trusted EXGARASI host.
    invitationBaseUrl = new URL(configuredBaseUrl || request.url);
    const host = invitationBaseUrl.hostname.toLowerCase();
    const trustedHost = host === "exgarasi.id" || host === "www.exgarasi.id"
      || host.endsWith(".exgarasi-id.workers.dev") || host === "localhost";
    const secureTransport = invitationBaseUrl.protocol === "https:" || (host === "localhost" && invitationBaseUrl.protocol === "http:");
    if (!trustedHost || !secureTransport || invitationBaseUrl.username || invitationBaseUrl.password)
      throw new Error("Invalid application URL");
    invitationBaseUrl.pathname = "/";
    invitationBaseUrl.search = "";
    invitationBaseUrl.hash = "";
  } catch {
    return NextResponse.json({ error: "Application URL is not configured correctly." }, { status: 500 });
  }

  try {
    const result = await withAuthenticatedDb(async (tx) => {
      const roles = await tx`select role from public.user_roles where user_id = public.app_current_user_id() and role in ('admin','super_admin')`;
      if (!roles.length) throw new Error("FORBIDDEN");
      await tx`update public.seller_invitations set status='revoked' where lower(email)=${email} and status='pending'`;
      const rawToken = randomBytes(32).toString("base64url");
      const tokenHash = createHash("sha256").update(rawToken).digest("hex");
      const rows = await tx`
        insert into public.seller_invitations(email,invited_by,token_hash,expires_at)
        values(${email},public.app_current_user_id(),${tokenHash},now()+interval '7 days')
        returning id,expires_at
      `;
      return { invitationId: String(rows[0].id), expiresAt: String(rows[0].expires_at), rawToken };
    });
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

    return NextResponse.json({ invitationId: result.invitationId, email, expiresAt: result.expiresAt, acceptUrl: acceptUrl.toString(), delivery: "accepted" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invitation failed.";
    const status = message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
});
