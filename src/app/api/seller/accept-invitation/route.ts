import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { sql } from "@/db";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) return NextResponse.json({ error: "Sign in before accepting the invitation." }, { status: 401 });
  const body = await request.json().catch(() => null) as { token?: string; storeName?: string; storeSlug?: string } | null;
  const token = body?.token?.trim(), storeName = body?.storeName?.trim(), storeSlug = body?.storeSlug?.trim().toLowerCase();
  if (!token || !storeName || !storeSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug))
    return NextResponse.json({ error: "Token, store name, and valid store slug are required." }, { status: 400 });
  const profile = await sql`select id, email from public.users where auth_user_id = ${session.user.id} limit 1`;
  const user = profile[0] as { id: string; email: string } | undefined;
  if (!user || user.email.toLowerCase() !== session.user.email.toLowerCase())
    return NextResponse.json({ error: "Account does not match invitation." }, { status: 403 });
  const tokenHash = createHash("sha256").update(token).digest("hex");
  try {
    const store = await sql.begin(async (tx) => {
      const invites = await tx`select id from public.seller_invitations where token_hash = ${tokenHash} and lower(email) = lower(${user.email}) and status = 'pending' and expires_at > now() for update`;
      if (invites.length !== 1) throw new Error("Invitation invalid or expired.");
      const rows = await tx`insert into public.stores (owner_user_id,slug,name,store_type,status) values (${user.id}::uuid,${storeSlug},${storeName},'partner','pending_review') returning id,slug,name`;
      const created = rows[0];
      await tx`insert into public.store_members (store_id,user_id,member_role) values (${created.id}::uuid,${user.id}::uuid,'owner')`;
      await tx`insert into public.user_roles (user_id,role) values (${user.id}::uuid,'seller') on conflict do nothing`;
      await tx`update public.seller_invitations set status='accepted', accepted_by=${user.id}::uuid where id=${invites[0].id}`;
      return created;
    });
    return NextResponse.json({ store, status: "pending_review" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not accept invitation.";
    return NextResponse.json({ error: message }, { status: message.toLowerCase().includes("unique") ? 409 : 400 });
  }
}
