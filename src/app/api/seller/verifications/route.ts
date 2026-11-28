import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const rows = await withAuthenticatedDb((tx) => tx`
      select sv.id,sv.verification_type,sv.status,sv.review_note,sv.submitted_at,sv.reviewed_at,
        (sv.document_object_key is not null) as has_document,
        s.id as store_id,s.name as store_name
      from public.seller_verifications sv
      join public.stores s on s.id=sv.store_id
      where s.owner_user_id=public.app_current_user_id()
        or exists(select 1 from public.store_members sm where sm.store_id=s.id and sm.user_id=public.app_current_user_id())
      order by sv.submitted_at desc
    `);
    return NextResponse.json({ verifications: rows }, { headers:{"Cache-Control":"no-store"} });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load verification.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as { storeId?: unknown; verificationType?: unknown } | null;
  const storeId = typeof body?.storeId === "string" ? body.storeId.trim() : "";
  const requestedVerificationType = typeof body?.verificationType === "string" ? body.verificationType.trim() : "";
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(storeId)
    || !["individual", "business"].includes(requestedVerificationType)) {
    return NextResponse.json({ error: "Pilih toko dan jenis verifikasi yang valid." }, { status: 400 });
  }
  const verificationType = requestedVerificationType as "individual" | "business";
  try {
    const result = await withAuthenticatedDb(async (tx) => {
      const stores = await tx`
        select id,status from public.stores
        where id=${storeId}::uuid
          and (owner_user_id=public.app_current_user_id()
            or exists(select 1 from public.store_members sm where sm.store_id=stores.id and sm.user_id=public.app_current_user_id() and sm.member_role='owner'))
        limit 1
      `;
      if (!stores.length) throw new Error("STORE_NOT_FOUND");
      if (!["invited", "pending_review"].includes(String(stores[0].status))) {
        throw new Error(stores[0].status === "active" ? "STORE_ALREADY_APPROVED" : "STORE_NOT_ELIGIBLE");
      }
      const pending = await tx`
        select id,status,submitted_at,document_object_key
        from public.seller_verifications
        where store_id=${storeId}::uuid and status='pending'
        limit 1
      `;
      if (pending.length) {
        if (!pending[0].document_object_key) return pending[0];
        throw new Error("VERIFICATION_PENDING");
      }
      const inserted = await tx`
        insert into public.seller_verifications(store_id,submitted_by,verification_type)
        values(${storeId}::uuid,public.app_current_user_id(),${verificationType})
        returning id,status,submitted_at,document_object_key
      `;
      return inserted[0];
    });
    return NextResponse.json({ verification: result }, { status: 201 });
  } catch (error) {
    const code = (error as { code?: string })?.code;
    const message = error instanceof Error ? error.message : "Submission failed.";
    const status = message === "UNAUTHENTICATED" ? 401
      : message === "STORE_NOT_FOUND" ? 404
      : ["VERIFICATION_PENDING", "STORE_ALREADY_APPROVED", "STORE_NOT_ELIGIBLE"].includes(message) || code === "23505" ? 409
      : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
