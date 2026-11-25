import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";

export async function GET() {
  try {
    const rows = await withAuthenticatedDb(async (tx) => {
      const roles = await tx`select role from public.user_roles where user_id=public.app_current_user_id() and role in ('admin','super_admin')`;
      if (!roles.length) throw new Error("FORBIDDEN");
      return tx`
        select sv.id,sv.verification_type,sv.status,sv.review_note,sv.submitted_at,sv.reviewed_at,
          s.id as store_id,s.name as store_name,s.slug,s.status as store_status,
          u.full_name as owner_name,u.email as owner_email
        from public.seller_verifications sv
        join public.stores s on s.id=sv.store_id
        join public.users u on u.id=sv.submitted_by
        order by case when sv.status='pending' then 0 else 1 end,sv.submitted_at desc
        limit 200
      `;
    });
    return NextResponse.json({ verifications: rows });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to load seller verifications.";
    return NextResponse.json({ error: message }, { status: message === "FORBIDDEN" ? 403 : message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
