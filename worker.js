const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type,x-apikey,Authorization"
};

function json(data, status=200) {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {"content-type":"application/json; charset=utf-8", ...CORS}
  });
}

async function proxy(request, env, kind) {
  const base = env.ALIGHT_MOTION_API_BASE;
  if (!base) return json({status:false,message:"ALIGHT_MOTION_API_BASE belum dikonfigurasi di Worker."}, 500);

  const incoming = new URL(request.url);
  const target = new URL(kind === "send" ? "/v1/alight-motion/send" : "/v1/alight-motion/verify", base);

  for (const [k,v] of incoming.searchParams) target.searchParams.set(k,v);

  const headers = new Headers(request.headers);
  headers.delete("host");

  // Optional server-to-server authentication for the upstream.
  if (env.UPSTREAM_API_KEY) headers.set("x-apikey", env.UPSTREAM_API_KEY);

  let init = {method: request.method, headers};
  if (request.method !== "GET" && request.method !== "HEAD") {
    init.body = await request.arrayBuffer();
  }

  const upstream = await fetch(target.toString(), init);
  const body = await upstream.arrayBuffer();
  const outHeaders = new Headers(upstream.headers);
  for (const [k,v] of Object.entries(CORS)) outHeaders.set(k,v);

  return new Response(body, {status: upstream.status, headers: outHeaders});
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === "OPTIONS") return new Response(null, {status:204, headers:CORS});

    // Static frontend.
    if (!url.pathname.startsWith("/v1/")) return env.ASSETS.fetch(request);

    if (url.pathname === "/v1/alight-motion/send" && request.method === "POST")
      return proxy(request, env, "send");

    if (url.pathname === "/v1/alight-motion/verify" && request.method === "GET")
      return proxy(request, env, "verify");

    return json({status:false,message:"Endpoint tidak ditemukan."}, 404);
  }
};