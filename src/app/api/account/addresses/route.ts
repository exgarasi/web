import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type AddressInput = {
  recipientName?: unknown; phone?: unknown; addressLine?: unknown;
  village?: unknown; district?: unknown; city?: unknown; province?: unknown;
  postalCode?: unknown; isDefault?: unknown;
};

function clean(value: unknown, max: number) {
  return typeof value === "string" ? value.trim().slice(0, max) : "";
}
function validate(body: AddressInput) {
  const value = {
    recipientName: clean(body.recipientName, 120), phone: clean(body.phone, 30),
    addressLine: clean(body.addressLine, 500), village: clean(body.village, 120),
    district: clean(body.district, 120), city: clean(body.city, 120),
    province: clean(body.province, 120), postalCode: clean(body.postalCode, 12),
    isDefault: body.isDefault === true,
  };
  if (value.recipientName.length < 2 || value.phone.length < 7 ||
      !/^\+?[0-9\s().-]{7,30}$/.test(value.phone) ||
      value.addressLine.length < 5 || value.city.length < 2 || value.province.length < 2)
    return { error: "Lengkapi nama penerima, nomor telepon, alamat, kota, dan provinsi dengan benar." } as const;
  return { value } as const;
}
function failure(error: unknown) {
  const unauthenticated = error instanceof Error && error.message === "UNAUTHENTICATED";
  return NextResponse.json({ error: unauthenticated ? "Silakan masuk kembali." : "Terjadi kesalahan. Silakan coba lagi." }, { status: unauthenticated ? 401 : 500 });
}

export async function GET() {
  try {
    const addresses = await withAuthenticatedDb((tx) => tx`
      select id, recipient_name, phone, address_line, village, district, city,
        province, postal_code, country_code, is_default, created_at
      from public.addresses where user_id = public.app_current_user_id()
      order by is_default desc, created_at desc
    `);
    return NextResponse.json({ addresses });
  } catch (error) { return failure(error); }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as AddressInput | null;
  if (!body) return NextResponse.json({ error: "Data alamat tidak valid." }, { status: 400 });
  const checked = validate(body);
  if ("error" in checked) return NextResponse.json({ error: checked.error }, { status: 400 });
  try {
    const address = await withAuthenticatedDb(async (tx) => {
      const count = await tx`select count(*)::int as total from public.addresses where user_id = public.app_current_user_id()`;
      if (count[0].total >= 10) throw new Error("ADDRESS_LIMIT");
      if (checked.value.isDefault || count[0].total === 0)
        await tx`update public.addresses set is_default = false where user_id = public.app_current_user_id()`;
      const v = checked.value;
      const rows = await tx`
        insert into public.addresses
          (user_id, recipient_name, phone, address_line, village, district, city, province, postal_code, country_code, is_default)
        values (public.app_current_user_id(), ${v.recipientName}, ${v.phone}, ${v.addressLine},
          nullif(${v.village},''), nullif(${v.district},''), ${v.city}, ${v.province},
          nullif(${v.postalCode},''), 'ID', ${v.isDefault || count[0].total === 0})
        returning id, recipient_name, phone, address_line, village, district, city, province, postal_code, country_code, is_default, created_at
      `;
      return rows[0];
    });
    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "ADDRESS_LIMIT")
      return NextResponse.json({ error: "Maksimal 10 alamat per akun." }, { status: 400 });
    return failure(error);
  }
}
