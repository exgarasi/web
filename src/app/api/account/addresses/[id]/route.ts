import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };
type Body = { recipientName?: unknown; phone?: unknown; addressLine?: unknown; village?: unknown; district?: unknown; city?: unknown; province?: unknown; postalCode?: unknown; isDefault?: unknown };
const text = (v: unknown, max: number) => typeof v === "string" ? v.trim().slice(0, max) : "";

function errorResponse(error: unknown) {
  const auth = error instanceof Error && error.message === "UNAUTHENTICATED";
  return NextResponse.json({ error: auth ? "Silakan masuk kembali." : "Terjadi kesalahan. Silakan coba lagi." }, { status: auth ? 401 : 500 });
}
function parse(body: Body) {
  const v = { recipientName:text(body.recipientName,120), phone:text(body.phone,30), addressLine:text(body.addressLine,500),
    village:text(body.village,120), district:text(body.district,120), city:text(body.city,120), province:text(body.province,120),
    postalCode:text(body.postalCode,12), isDefault:body.isDefault === true };
  if(v.recipientName.length<2 || !/^\+?[0-9\s().-]{7,30}$/.test(v.phone) || v.addressLine.length<5 || v.city.length<2 || v.province.length<2)
    return null;
  return v;
}

export async function PATCH(request: Request, { params }: Context) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error:"Alamat tidak ditemukan." },{status:404});
  const body = await request.json().catch(() => null) as Body | null;
  const v = body && parse(body);
  if (!v) return NextResponse.json({ error:"Periksa kembali data alamat." },{status:400});
  try {
    const address = await withAuthenticatedDb(async (tx) => {
      const owned = await tx`select id from public.addresses where id=${id}::uuid and user_id=public.app_current_user_id() limit 1`;
      if (!owned.length) return null;
      if(v.isDefault) await tx`update public.addresses set is_default=false where user_id=public.app_current_user_id()`;
      const rows = await tx`
        update public.addresses set recipient_name=${v.recipientName}, phone=${v.phone}, address_line=${v.addressLine},
          village=nullif(${v.village},''), district=nullif(${v.district},''), city=${v.city}, province=${v.province},
          postal_code=nullif(${v.postalCode},''), is_default=${v.isDefault}
        where id=${id}::uuid and user_id=public.app_current_user_id()
        returning id, recipient_name, phone, address_line, village, district, city, province, postal_code, country_code, is_default, created_at
      `;
      return rows[0] ?? null;
    });
    if(!address) return NextResponse.json({error:"Alamat tidak ditemukan."},{status:404});
    return NextResponse.json({address});
  } catch(error) { return errorResponse(error); }
}

export async function DELETE(_request: Request, { params }: Context) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return NextResponse.json({ error:"Alamat tidak ditemukan." },{status:404});
  try {
    const removed = await withAuthenticatedDb(async (tx) => {
      const rows = await tx`delete from public.addresses where id=${id}::uuid and user_id=public.app_current_user_id() returning id, is_default`;
      if(rows[0]?.is_default) await tx`
        update public.addresses set is_default=true where id=(
          select id from public.addresses where user_id=public.app_current_user_id() order by created_at desc limit 1
        )
      `;
      return rows.length > 0;
    });
    if(!removed) return NextResponse.json({error:"Alamat tidak ditemukan."},{status:404});
    return NextResponse.json({success:true});
  } catch(error) { return errorResponse(error); }
}
