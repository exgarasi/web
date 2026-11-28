export type ManualPaymentMethod = "manual_bank_transfer" | "manual_qris";

export type PaymentInstructions = {
  method: ManualPaymentMethod;
  bank?: {
    name: string;
    accountName: string;
    accountNumber: string;
  };
  qrisImageUrl?: string;
};

export type PaymentCreationInput = {
  orderId: string;
  orderNumber: string;
  amount: number;
  currency: string;
  method: ManualPaymentMethod;
  idempotencyKey: string;
};

export type PaymentCreationResult =
  | { mode: "manual"; status: "pending"; instructions: PaymentInstructions }
  | { mode: "gateway"; status: "pending"; provider: "midtrans"; redirectUrl: string; providerReference: string };

/**
 * Payment-provider boundary.
 *
 * Checkout and order records must not depend on a gateway's response format.
 * A future Midtrans adapter can implement this contract and be selected by
 * trusted server configuration after credentials, webhook verification and
 * reconciliation have been tested. Never select a gateway from client input.
 */
export interface PaymentProviderAdapter {
  readonly provider: "manual" | "midtrans";
  createPayment(input: PaymentCreationInput): Promise<PaymentCreationResult>;
}

export function getManualPaymentInstructions(method: ManualPaymentMethod): PaymentInstructions {
  if (method === "manual_bank_transfer") {
    const name = process.env.PAYMENT_BANK_NAME?.trim();
    const accountName = process.env.PAYMENT_BANK_ACCOUNT_NAME?.trim();
    const accountNumber = process.env.PAYMENT_BANK_ACCOUNT_NUMBER?.trim();

    return {
      method,
      ...(name && accountName && accountNumber
        ? { bank: { name, accountName, accountNumber } }
        : {}),
    };
  }

  const qrisImageUrl = process.env.PAYMENT_QRIS_IMAGE_URL?.trim();
  return {
    method,
    ...(qrisImageUrl ? { qrisImageUrl } : {}),
  };
}

export const manualPaymentProvider: PaymentProviderAdapter = {
  provider: "manual",
  async createPayment(input) {
    return {
      mode: "manual",
      status: "pending",
      instructions: getManualPaymentInstructions(input.method),
    };
  },
};
