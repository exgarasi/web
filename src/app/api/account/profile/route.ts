import { NextResponse } from "next/server";
import { withAuthenticatedDb } from "@/lib/db-context";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const profile = await withAuthenticatedDb(async (tx) => {
      const rows = await tx`
        select full_name, email, phone
        from public.users
        where id = public.app_current_user_id()
        limit 1
      `;
      return rows[0] ?? null;
    });
    if (!profile) return NextResponse.json({ error: "Profil tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ profile });
  } catch (error) {
    const unauthenticated = error instanceof Error && error.message === "UNAUTHENTICATED";
    return NextResponse.json({ error: unauthenticated ? "Silakan masuk kembali." : "Gagal memuat profil." }, { status: unauthenticated ? 401 : 500 });
  }
}

export async function PATCH(request: Request) {
  const body = await request.json().catch(() => null) as { fullName?: unknown; phone?: unknown } | null;
  const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
  const phone = typeof body?.phone === "string" ? body.phone.trim() : "";
  if (fullName.length < 2 || fullName.length > 120)
    return NextResponse.json({ error: "Nama harus terdiri dari 2–120 karakter." }, { status: 400 });
  if (phone.length > 30 || (phone && !/^\+?[0-9\s().-]{7,30}$/.test(phone)))
    return NextResponse.json({ error: "Format nomor telepon tidak valid." }, { status: 400 });

  try {
    const updated = await withAuthenticatedDb(async (tx) => {
      const rows = await tx`
        update public.users
        set full_name = ${fullName}, phone = nullif(${phone}, ''), updated_at = now()
        where id = public.app_current_user_id()
        returning full_name, email, phone
      `;
      return rows[0] ?? null;
    });
    if (!updated) return NextResponse.json({ error: "Profil tidak ditemukan." }, { status: 404 });
    return NextResponse.json({ profile: updated });
  } catch (error) {
    const unauthenticated = error instanceof Error && error.message === "UNAUTHENTICATED";
    return NextResponse.json({ error: unauthenticated ? "Silakan masuk kembali." : "Gagal menyimpan profil." }, { status: unauthenticated ? 401 : 500 });
  }
}
