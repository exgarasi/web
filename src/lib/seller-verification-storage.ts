import "server-only";

import { getCloudflareContext } from "@opennextjs/cloudflare";

function getStorageConfig() {
  const { env } = getCloudflareContext();
  const runtime = env as unknown as Record<string, string | undefined>;
  const read = (key: string) => process.env[key]?.trim() || runtime[key]?.trim() || "";
  const url = (read("SUPABASE_URL") || read("NEXT_PUBLIC_SUPABASE_URL") || "https://yttwrhnbbbcnbvvkukdz.supabase.co").replace(/\/$/, "");
  const key = read("SUPABASE_SERVICE_ROLE_KEY");
  if (!key) throw new Error("SELLER_DOCUMENT_STORAGE_NOT_CONFIGURED");
  return { url, key };
}

function encodeObjectKey(key: string) {
  return key.split("/").map(encodeURIComponent).join("/");
}

export async function uploadSellerVerificationDocument(objectKey: string, bytes: Uint8Array, mimeType: string) {
  const { url, key } = getStorageConfig();
  const body = new ArrayBuffer(bytes.byteLength);
  new Uint8Array(body).set(bytes);
  const response = await fetch(`${url}/storage/v1/object/seller-verification-documents/${encodeObjectKey(objectKey)}`, {
    method: "POST",
    headers: { apikey:key, Authorization:`Bearer ${key}`, "Content-Type":mimeType, "x-upsert":"false", "Cache-Control":"no-store" },
    body,
  });
  if (!response.ok) {
    const detail = await response.text();
    console.error("[seller-document] upload failed",response.status,detail.slice(0,400));
    throw new Error("SELLER_DOCUMENT_UPLOAD_FAILED");
  }
}

export async function deleteSellerVerificationDocument(objectKey: string) {
  const {url,key}=getStorageConfig();
  await fetch(`${url}/storage/v1/object/seller-verification-documents`,{
    method:"DELETE",
    headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({prefixes:[objectKey]}),
  });
}

export async function createSellerVerificationDocumentSignedUrl(objectKey: string, expiresIn=300) {
  const {url,key}=getStorageConfig();
  const response=await fetch(`${url}/storage/v1/object/sign/seller-verification-documents/${encodeObjectKey(objectKey)}`,{
    method:"POST",
    headers:{apikey:key,Authorization:`Bearer ${key}`,"Content-Type":"application/json"},
    body:JSON.stringify({expiresIn}),
    cache:"no-store",
  });
  if(!response.ok) throw new Error("SELLER_DOCUMENT_ACCESS_FAILED");
  const payload=await response.json() as {signedURL?:string};
  if(!payload.signedURL) throw new Error("SELLER_DOCUMENT_ACCESS_FAILED");
  return payload.signedURL.startsWith("http")?payload.signedURL:`${url}/storage/v1${payload.signedURL.startsWith("/")?"":"/"}${payload.signedURL}`;
}
