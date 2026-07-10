// 与 apps/viewer/src/lib/remote-bundle.ts 中 REMOTE_BUNDLE_MAX_BYTES 保持一致
const REMOTE_BUNDLE_MAX_BYTES = 5 * 1024 * 1024;
const REMOTE_BASE =
  "https://newseer.61.com/Assets/StandaloneWindows64/PetAnimPackage";
const HASH_RE = /^[a-f0-9]{32}$/;

function corsHeaders(origin) {
  return {
    "Access-Control-Allow-Origin": origin && origin !== "null" ? origin : "*",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
  };
}

export function onRequestOptions() {
  return new Response(null, { status: 204, headers: corsHeaders() });
}

export async function onRequestGet(context) {
  const hash = context.params.hash;
  const origin = context.request.headers.get("Origin");

  if (!HASH_RE.test(hash)) {
    return new Response("Invalid bundle hash", {
      status: 400,
      headers: corsHeaders(origin),
    });
  }

  const upstream = await fetch(`${REMOTE_BASE}/${hash}`, {
    method: "GET",
    headers: {
      referer: "https://newseer.61.com",
      "user-agent":
        context.request.headers.get("user-agent") ?? "seer-pet-viewer-proxy",
    },
  });

  if (!upstream.ok) {
    return new Response(`上游错误: ${upstream.status}`, {
      status: upstream.status,
      headers: corsHeaders(origin),
    });
  }

  const contentLength = upstream.headers.get("content-length");
  if (contentLength) {
    const size = Number(contentLength);
    if (Number.isFinite(size) && size >= REMOTE_BUNDLE_MAX_BYTES) {
      return new Response("Bundle too large for remote proxy", {
        status: 413,
        headers: corsHeaders(origin),
      });
    }
  }

  const headers = new Headers(upstream.headers);
  headers.set("Cache-Control", "public, max-age=31536000, immutable");
  headers.set("Access-Control-Expose-Headers", "Content-Type, Content-Length");

  return new Response(upstream.body, {
    status: upstream.status,
    headers,
  });
}
