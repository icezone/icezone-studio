import { createClient } from "https://esm.sh/@supabase/supabase-js@2.100.0";

const WECHAT_APP_ID = Deno.env.get("WECHAT_APP_ID")!;
const WECHAT_APP_SECRET = Deno.env.get("WECHAT_APP_SECRET")!;

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type, Authorization",
      },
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "method not allowed" }, 405);
  }

  let body: { uuid?: string };
  try {
    body = await req.json();
  } catch {
    return jsonResponse({ success: false, error: "invalid JSON" }, 400);
  }

  const { uuid } = body;
  if (!uuid) {
    return jsonResponse({ success: false, error: "uuid is required" }, 400);
  }

  // 1. Get WeChat access_token
  const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}`;

  let tokenData: TokenResponse;
  try {
    const tokenRes = await fetch(tokenUrl);
    tokenData = await tokenRes.json();
  } catch {
    return jsonResponse({ success: false, error: "WeChat token API unavailable" }, 502);
  }

  if (!tokenData.access_token) {
    return jsonResponse(
      { success: false, error: `WeChat token error: ${tokenData.errcode} ${tokenData.errmsg}` },
      400
    );
  }

  // 2. Generate Mini Program QR code (scene max 32 chars — UUID without dashes fits exactly)
  const scene = uuid.replace(/-/g, "");
  const qrcodeUrl = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${tokenData.access_token}`;

  let qrcodeRes: Response;
  try {
    qrcodeRes = await fetch(qrcodeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scene,
        page: "pages/login/index",
        width: 430,
        auto_color: false,
        line_color: { r: 0, g: 0, b: 0 },
      }),
    });
  } catch {
    return jsonResponse({ success: false, error: "WeChat QR API unavailable" }, 502);
  }

  const contentType = qrcodeRes.headers.get("content-type") || "";

  // If WeChat returns JSON, it's an error
  if (contentType.includes("application/json")) {
    const errData = await qrcodeRes.json();
    return jsonResponse(
      { success: false, error: `WeChat QR error: ${errData.errcode} ${errData.errmsg}` },
      400
    );
  }

  // Success — convert image buffer to base64
  const imageBuffer = await qrcodeRes.arrayBuffer();
  const base64 = btoa(String.fromCharCode(...new Uint8Array(imageBuffer)));

  return jsonResponse({ success: true, image: `data:image/png;base64,${base64}` }, 200);
});

function jsonResponse(data: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
