import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";
import { deleteSellerVerificationDocument, uploadSellerVerificationDocument } from "@/lib/seller-verification-storage";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_FILE_SIZE = 10 * 1024 * 1024;

function detectDocument(bytes: Uint8Array): { mime: string; extension: string } | null {
  if (bytes.length >= 5 && String.fromCharCode(...bytes.slice(0,5)) === "%PDF-") return {mime:"application/pdf",extension:"pdf"};
  if (bytes.length >= 3 && bytes[0]===0xff && bytes[1]===0xd8 && bytes[2]===0xff) return {mime:"image/jpeg",extension:"jpg"};
  if (bytes.length >= 8 && bytes[0]===0x89 && bytes[1]===0x50 && bytes[2]===0x4e && bytes[3]===0x47) return {mime:"image/png",extension:"png"};
  if (bytes.length >= 12 && String.fromCharCode(...bytes.slice(0,4))==="RIFF" && String.fromCharCode(...bytes.slice(8,12))==="WEBP") return {mime:"image/webp",extension:"webp"};
  return null;
}

export async function POST(request: Request) {
  const form = await request.formData().catch(()=>null);
  const verificationId = String(form?.get("verificationId") ?? "");
  const file = form?.get("file");
  const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuid.test(verificationId) || !(file instanceof File)) return NextResponse.json({error:"Pilih pengajuan dan dokumen yang valid."},{status:400});
  if (file.size<=0 || file.size>MAX_FILE_SIZE) return NextResponse.json({error:"Ukuran dokumen maksimal 10 MB."},{status:400});
  const bytes = new Uint8Array(await file.arrayBuffer());
  const detected = detectDocument(bytes);
  if (!detected) return NextResponse.json({error:"Dokumen harus PDF, JPG, PNG, atau WebP yang valid."},{status:415});
  let objectKey="";
  let uploaded=false;
  let previousKey:string|null=null;
  try {
    await withAuthenticatedDb(async (tx,userId)=>{
      const rows=await tx`
        select sv.id,sv.status,sv.document_object_key,s.id as store_id
        from public.seller_verifications sv join public.stores s on s.id=sv.store_id
        where sv.id=${verificationId}::uuid
          and (s.owner_user_id=${userId}::uuid or exists(
            select 1 from public.store_members sm where sm.store_id=s.id and sm.user_id=${userId}::uuid and sm.member_role='owner'
          ))
        for update of sv
      `;
      const row=rows[0];
      if(!row) throw new Error("VERIFICATION_NOT_FOUND");
      if(row.status!=="pending") throw new Error("VERIFICATION_NOT_PENDING");
      previousKey=typeof row.document_object_key==="string"?row.document_object_key:null;
      objectKey=`${userId}/${row.store_id}/${verificationId}/${crypto.randomUUID()}.${detected.extension}`;
      await uploadSellerVerificationDocument(objectKey,bytes,detected.mime);
      uploaded=true;
      await tx`update public.seller_verifications set document_object_key=${objectKey} where id=${verificationId}::uuid and status='pending'`;
    });
    if(previousKey) await deleteSellerVerificationDocument(previousKey).catch((error)=>console.error("[seller-document] old document cleanup failed",error));
    return NextResponse.json({success:true,message:"Dokumen berhasil diunggah dan disimpan secara privat."},{status:201});
  } catch(error) {
    if(uploaded&&objectKey) await deleteSellerVerificationDocument(objectKey).catch(()=>undefined);
    const message=error instanceof Error?error.message:"";
    const known:Record<string,{status:number;error:string}>={
      UNAUTHENTICATED:{status:401,error:"Silakan masuk terlebih dahulu."},
      VERIFICATION_NOT_FOUND:{status:404,error:"Pengajuan verifikasi tidak ditemukan."},
      VERIFICATION_NOT_PENDING:{status:409,error:"Pengajuan ini sudah diproses dan dokumen tidak dapat diganti."},
      SELLER_DOCUMENT_STORAGE_NOT_CONFIGURED:{status:503,error:"Penyimpanan dokumen seller belum dikonfigurasi."},
    };
    const result=known[message]??{status:500,error:"Gagal mengunggah dokumen verifikasi."};
    console.error("[seller-document] upload failed",message);
    return NextResponse.json({error:result.error},{status:result.status});
  }
}
