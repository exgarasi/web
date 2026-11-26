import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const { id } = await context.params;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
    return NextResponse.json({ error: "Invalid verification ID." }, { status: 400 });
  }
  const body = await request.json().catch(() => null) as { decision?: unknown; reviewNote?: unknown } | null;
  const requestedDecision = typeof body?.decision === "string" ? body.decision : "";
  const reviewNote = typeof body?.reviewNote === "string" ? body.reviewNote.trim() : "";
  if (!["approved", "rejected"].includes(requestedDecision) || reviewNote.length > 1000) {
    return NextResponse.json({ error: "Keputusan atau catatan tidak valid." }, { status: 400 });
  }
  const decision = requestedDecision as "approved" | "rejected";
  try {
    const result = await withAuthenticatedDb(async (tx) => {
      const roles = await tx`select role from public.user_roles where user_id=public.app_current_user_id() and role in ('admin','super_admin')`;
      if (!roles.length) throw new Error("FORBIDDEN");
      const rows = await tx`
        update public.seller_verifications
        set status=${decision},review_note=nullif(${reviewNote},''),reviewer_user_id=public.app_current_user_id(),reviewed_at=now()
        where id=${id}::uuid and status='pending'
        returning store_id,status
      `;
      if (!rows.length) throw new Error("VERIFICATION_NOT_PENDING");
      if (decision === "approved") {
        const stores = await tx`
          update public.stores
          set status='active',approved_at=now(),updated_at=now()
          where id=${rows[0].store_id}::uuid
          returning id
        `;
        if (!stores.length) throw new Error("STORE_NOT_FOUND");
      }
      return rows[0];
    });
    return NextResponse.json({ verification: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed.";
    const status = message === "FORBIDDEN" ? 403
      : message === "UNAUTHENTICATED" ? 401
      : message === "VERIFICATION_NOT_PENDING" ? 409
      : message === "STORE_NOT_FOUND" ? 404
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
