import type { LoaderFunctionArgs } from "@remix-run/node";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const host =
    request.headers.get("X-Forwarded-Host") ?? request.headers.get("host");

  try {
    const url = new URL("/", `http://${host}`);
    const response = await fetch(url.toString(), { method: "HEAD" });
    if (!response.ok) return new Response("ERROR", { status: 500 });
    return new Response("OK");
  } catch {
    return new Response("ERROR", { status: 500 });
  }
};
