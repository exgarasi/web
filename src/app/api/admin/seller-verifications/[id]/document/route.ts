import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";
import { getAdminAccess } from "@/lib/admin-permissions";
import { createSellerVerificationDocumentSignedUrl } from "@/lib/seller-verification-storage";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(_request:Request, context:{params:Promise<{id:string}>}) {
  const access=await getAdminAccess("sellers.admin");
  if(!access) return NextResponse.json({error:"Forbidden."},{status:403});
  const {id}=await context.params;
  if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id))
    return NextResponse.json({error:"ID pengajuan tidak valid."},{status:400});
  try {
    const key=await withAuthenticatedDb(async(tx)=>{
      const rows=await tx`
        select sv.document_object_key
        from public.seller_verifications sv
        where sv.id=${id}::uuid
          and exists(select 1 from public.user_roles ur where ur.user_id=public.app_current_user_id() and ur.role in ('admin','super_admin'))
        limit 1
      `;
      return rows[0]?.document_object_key as string|null|undefined;
    });
    if(!key) return NextResponse.json({error:"Dokumen belum diunggah."},{status:404});
    const url=await createSellerVerificationDocumentSignedUrl(key,180);
    return NextResponse.json({url,expiresIn:180},{headers:{"Cache-Control":"no-store, private"}});
  } catch(error) {
    console.error("[seller-document] admin preview failed",error);
    return NextResponse.json({error:"Tidak dapat membuka dokumen verifikasi."},{status:500});
  }
}
