import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { token?: string; storeName?: string; storeSlug?: string } | null;
  const token = body?.token?.trim(), storeName = body?.storeName?.trim(), storeSlug = body?.storeSlug?.trim().toLowerCase();
  if (!token || !storeName || !storeSlug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(storeSlug))
    return NextResponse.json({ error: "Token, store name, and valid store slug are required." }, { status: 400 });
  try {
    const tokenHash = createHash("sha256").update(token).digest("hex");
    const store = await withAuthenticatedDb(async (tx) => {
      const rows = await tx`select * from public.app_accept_seller_invitation(${tokenHash},${storeName},${storeSlug})`;
      return rows[0];
    });
    return NextResponse.json({ store, status: "pending_review" }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not accept invitation.";
    const status = message === "UNAUTHENTICATED" ? 401 : message.includes("unique") ? 409 : 400;
    return NextResponse.json({ error: message }, { status });
  }
}
