import { createHash, randomBytes } from "node:crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const profile = await sql`select id from public.users where auth_user_id = ${session.user.id} limit 1`;
  const userId = profile[0]?.id as string | undefined;
  if (!userId) return NextResponse.json({ error: "Profile not found" }, { status: 403 });
  const roles = await sql`select role from public.user_roles where user_id = ${userId}::uuid and role in ('admin','super_admin')`;
  if (!roles.length) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null) as { email?: string } | null;
  const email = body?.email?.trim().toLowerCase();
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return NextResponse.json({ error: "A valid seller email is required." }, { status: 400 });
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const invitation = await sql`
    insert into public.seller_invitations (email, invited_by, token_hash, expires_at)
    values (${email}, ${userId}::uuid, ${tokenHash}, now() + interval '7 days')
    returning id, expires_at
  `;
  const baseUrl = process.env.APP_BASE_URL ?? process.env.NEXT_PUBLIC_APP_URL;
  if (!baseUrl) return NextResponse.json({ error: "Application URL is not configured." }, { status: 500 });
  const acceptUrl = new URL("/seller/accept-invitation", baseUrl);
  acceptUrl.searchParams.set("token", rawToken);
  return NextResponse.json({ invitationId: invitation[0].id, email, expiresAt: invitation[0].expires_at, acceptUrl: acceptUrl.toString() }, { status: 201 });
}
