import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";

export async function GET() {
  try {
    const addresses = await withAuthenticatedDb((tx, userId) => tx`
      select id, recipient_name, phone, address_line, village, district,
        city, province, postal_code, country_code, is_default
      from public.addresses
      where user_id = ${userId}::uuid
      order by is_default desc, created_at desc
    `);
    return NextResponse.json({ addresses });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal memuat alamat.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  const fields = {
    recipientName: typeof body?.recipientName === "string" ? body.recipientName.trim() : "",
    phone: typeof body?.phone === "string" ? body.phone.trim() : "",
    addressLine: typeof body?.addressLine === "string" ? body.addressLine.trim() : "",
    village: typeof body?.village === "string" ? body.village.trim() : "",
    district: typeof body?.district === "string" ? body.district.trim() : "",
    city: typeof body?.city === "string" ? body.city.trim() : "",
    province: typeof body?.province === "string" ? body.province.trim() : "",
    postalCode: typeof body?.postalCode === "string" ? body.postalCode.trim() : "",
  };
  const isDefault = body?.isDefault === true;
  if (!fields.recipientName || fields.recipientName.length > 120
    || !/^\+?[0-9\s-]{8,20}$/.test(fields.phone)
    || !fields.addressLine || fields.addressLine.length > 500
    || !fields.city || fields.city.length > 100
    || !fields.province || fields.province.length > 100) {
    return NextResponse.json({ error: "Lengkapi nama penerima, nomor telepon, alamat, kota, dan provinsi dengan benar." }, { status: 400 });
  }

  try {
    const address = await withAuthenticatedDb(async (tx, userId) => {
      if (isDefault) {
        await tx`update public.addresses set is_default = false where user_id = ${userId}::uuid`;
      }
      const rows = await tx`
        insert into public.addresses (
          user_id, recipient_name, phone, address_line, village, district,
          city, province, postal_code, country_code, is_default
        ) values (
          ${userId}::uuid, ${fields.recipientName}, ${fields.phone},
          ${fields.addressLine}, ${fields.village || null}, ${fields.district || null},
          ${fields.city}, ${fields.province}, ${fields.postalCode || null},
          'ID', ${isDefault}
        )
        returning id, recipient_name, phone, address_line, village, district,
          city, province, postal_code, country_code, is_default
      `;
      return rows[0];
    });
    return NextResponse.json({ address }, { status: 201 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gagal menyimpan alamat.";
    return NextResponse.json({ error: message }, { status: message === "UNAUTHENTICATED" ? 401 : 500 });
  }
}
