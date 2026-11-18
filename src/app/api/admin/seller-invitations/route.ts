import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "A valid seller email is required." }, { status: 400 });

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
      return { invitationId: rows[0].id, expiresAt: rows[0].expires_at, rawToken };
    });
    const baseUrl = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
    if (!baseUrl) return NextResponse.json({ error: "Application URL is not configured." }, { status: 500 });
    const acceptUrl = new URL("/seller/accept-invitation", baseUrl);
    acceptUrl.searchParams.set("token", result.rawToken);
    return NextResponse.json({ invitationId: result.invitationId, email, expiresAt: result.expiresAt, acceptUrl: acceptUrl.toString() }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Invitation failed.";
    return NextResponse.json({ error: message }, { status: message === "FORBIDDEN" ? 403 : 401 });
  }
}
