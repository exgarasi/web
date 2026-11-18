import { SellerInvitationForm } from "./form";

export const dynamic = "force-dynamic";

export default async function AcceptSellerInvitationPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  return <main className="grid min-h-screen place-items-center bg-gray-50 px-6">
    <SellerInvitationForm token={token ?? ""} />
  </main>;
}
