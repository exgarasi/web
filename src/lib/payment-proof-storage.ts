import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

function getStorageConfig() {
  const { env } = getCloudflareContext();
  const runtime = env as unknown as Record<string, string | undefined>;
  const read = (key: string) => process.env[key]?.trim() || runtime[key]?.trim() || "";
  const url = (read("SUPABASE_URL") || read("NEXT_PUBLIC_SUPABASE_URL") || "https://yttwrhnbbbcnbvvkukdz.supabase.co").replace(/\/$/, "");
  const key = read("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("PAYMENT_PROOF_STORAGE_NOT_CONFIGURED");
  return { url, key };
}

function encodeObjectKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

export async function uploadPaymentProof(objectKey: string, bytes: Uint8Array, mimeType: string) {
  const { url, key } = getStorageConfig();
  const uploadBody = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(uploadBody).set(bytes);
  const response = await fetch(`${url}/storage/v1/object/payment-proofs/${encodeObjectKey(objectKey)}`, {
    method: "POST",
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      "Content-Type": mimeType,
      "Cache-Control": "3600",
      "x-upsert": "false",
    },
    body: uploadBody,
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("[payment-proof] Storage upload failed", response.status, detail.slice(0, 500));
    throw new Error("PAYMENT_PROOF_UPLOAD_FAILED");
  }
}

export async function deletePaymentProofObject(objectKey: string) {
  const { url, key } = getStorageConfig();
  await fetch(`${url}/storage/v1/object/payment-proofs`, {
    method: "DELETE",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ prefixes: [objectKey] }),
  });
}

export async function createPaymentProofSignedUrl(objectKey: string, expiresIn = 300) {
  const { url, key } = getStorageConfig();
  const response = await fetch(`${url}/storage/v1/object/sign/payment-proofs/${encodeObjectKey(objectKey)}`, {
    method: "POST",
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn }),
    cache: "no-store",
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("[payment-proof] Signed URL creation failed", response.status, detail.slice(0, 500));
    throw new Error("PAYMENT_PROOF_ACCESS_FAILED");
  }
  const payload = await response.json() as { signedURL?: string };
  if (!payload.signedURL) throw new Error("PAYMENT_PROOF_ACCESS_FAILED");
  return payload.signedURL.startsWith("http") ? payload.signedURL : `${url}/storage/v1${payload.signedURL.startsWith("/") ? "" : "/"}${payload.signedURL}`;
}
