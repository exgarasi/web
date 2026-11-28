import { OrderPaymentView } from "./order-payment-view";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const metadata = { title: "Detail Pesanan | EXGARASI" };

export default async function OrderDetailPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return <OrderPaymentView orderId={orderId} />;
}
