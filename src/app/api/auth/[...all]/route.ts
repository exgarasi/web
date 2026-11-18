import { toNextJsHandler } from "better-auth/next-js";
import { getAuth } from "@/lib/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function handle(request: Request, method: "GET" | "POST") {
  const authRuntime = await getAuth();
  try {
    const handlers = toNextJsHandler(authRuntime.auth);
    return await handlers[method](request);
  } finally {
    await authRuntime.close();
  }
}

export const GET = (request: Request) => handle(request, "GET");
export const POST = (request: Request) => handle(request, "POST");
