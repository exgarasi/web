import { NextResponse } from "next/server";
import { getManualPaymentInstructions, type ManualPaymentMethod } from "@/lib/payments/provider";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const method = searchParams.get("method");

  if (method !== "manual_bank_transfer" && method !== "manual_qris") {
    return NextResponse.json({ error: "Metode pembayaran tidak valid." }, { status: 400 });
  }

  const instructions = getManualPaymentInstructions(method as ManualPaymentMethod);
  const configured = method === "manual_bank_transfer"
    ? Boolean(instructions.bank)
    : Boolean(instructions.qrisImageUrl);

  return NextResponse.json(
    { provider: "manual", configured, instructions },
    { headers: { "Cache-Control": "no-store" } },
  );
}
