import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const application = await withAuthenticatedDb(async (tx) => {
      const rows = await tx`
        select s.id as store_id, s.name as store_name, s.slug as store_slug, s.status as store_status,
          sv.id as verification_id, sv.verification_type, sv.status as verification_status,
          sv.review_note, sv.submitted_at, sv.reviewed_at
        from public.stores s
        left join public.seller_verifications sv on sv.store_id=s.id
        where s.owner_user_id=public.app_current_user_id()
        order by sv.submitted_at desc nulls last
        limit 1
      `;
      return rows[0] ?? null;
    });
    return NextResponse.json({ application });
  } catch (error) {
    const auth = error instanceof Error && error.message === "UNAUTHENTICATED";
    return NextResponse.json({error:auth?"Silakan masuk kembali.":"Gagal memuat status pengajuan."},{status:auth?401:500});
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as {
    storeName?:unknown; description?:unknown; supportPhone?:unknown; verificationType?:unknown;
  } | null;
  const storeName=typeof body?.storeName==="string"?body.storeName.trim():"";
  const description=typeof body?.description==="string"?body.description.trim():"";
  const supportPhone=typeof body?.supportPhone==="string"?body.supportPhone.trim():"";
  const verificationType=typeof body?.verificationType==="string"?body.verificationType:"";
  if(storeName.length<3||storeName.length>80||description.length>1000||
    !/^\+?[0-9\s().-]{7,30}$/.test(supportPhone)||!["individual","business"].includes(verificationType))
    return NextResponse.json({error:"Periksa nama toko, nomor WhatsApp, deskripsi, dan jenis verifikasi."},{status:400});
  try {
    const result=await withAuthenticatedDb(async tx=>{
      const rows=await tx`
        select * from public.app_submit_seller_application(
          ${storeName}, nullif(${description},''), ${supportPhone}, ${verificationType}
        )
      `;
      return rows[0];
    });
    return NextResponse.json({application:result},{status:201});
  } catch(error) {
    const message=error instanceof Error?error.message:"SUBMISSION_FAILED";
    const known:Record<string,{status:number;message:string}>={
      UNAUTHENTICATED:{status:401,message:"Silakan masuk kembali."},
      EMAIL_VERIFICATION_REQUIRED:{status:403,message:"Verifikasi email akun sebelum mendaftar sebagai Seller."},
      STORE_APPLICATION_EXISTS:{status:409,message:"Akun ini sudah memiliki toko atau pengajuan Seller."},
      INVALID_STORE_NAME:{status:400,message:"Nama toko harus 3–80 karakter."},
      INVALID_DESCRIPTION:{status:400,message:"Deskripsi maksimal 1.000 karakter."},
      INVALID_PHONE:{status:400,message:"Format nomor WhatsApp tidak valid."},
      INVALID_VERIFICATION_TYPE:{status:400,message:"Jenis verifikasi tidak valid."}
    };
    const issue=known[message];
    return NextResponse.json({error:issue?.message||"Pengajuan gagal diproses. Silakan coba lagi."},{status:issue?.status||500});
  }
}
