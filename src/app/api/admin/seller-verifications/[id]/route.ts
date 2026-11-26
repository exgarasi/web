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
      const rows = await tx`
        select verification_id,store_id,decision
        from public.app_review_seller_verification(
          ${id}::uuid,
          ${decision},
          nullif(${reviewNote},'')
        )
      `;
      if (!rows.length) throw new Error("VERIFICATION_NOT_PENDING");
      return rows[0];
    });
    return NextResponse.json({ verification: result });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Review failed.";
    const status = message === "FORBIDDEN" ? 403
      : message === "UNAUTHENTICATED" ? 401
      : message === "VERIFICATION_NOT_PENDING" ? 409
      : message === "STORE_NOT_FOUND" ? 404
      : ["INVALID_DECISION", "INVALID_REVIEW_NOTE"].includes(message) ? 400
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
