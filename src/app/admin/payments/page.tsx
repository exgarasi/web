import { PaymentsReviewView } from "./payments-review-view";
import { getAdminAccess } from "@/lib/admin-permissions";
import { redirect } from "next/navigation";

export const metadata = { title: "Verifikasi Pembayaran | EXGARASI" };

export default async function AdminPaymentsPage() {
  const access = await getAdminAccess("payments.verify");
  if (!access) redirect("/admin/dashboard");
  return <PaymentsReviewView />;
}
