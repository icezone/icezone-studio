import { encode as base64Encode } from "https://deno.land/std@0.208.0/encoding/base64.ts";

const WECHAT_APP_ID = Deno.env.get("WECHAT_APP_ID")!;
const WECHAT_APP_SECRET = Deno.env.get("WECHAT_APP_SECRET")!;

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

interface TokenResponse {
  access_token?: string;
  expires_in?: number;
  errcode?: number;
  errmsg?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: CORS_HEADERS });
  }

  if (req.method !== "POST") {
    return jsonResponse({ success: false, error: "method not allowed" }, 405);
  }

  try {
    const body = await req.json();
    const uuid = body?.uuid;
    if (!uuid) {
      return jsonResponse({ success: false, error: "uuid is required" }, 400);
    }

    // 1. Get WeChat access_token
    const tokenUrl = `https://api.weixin.qq.com/cgi-bin/token?grant_type=client_credential&appid=${WECHAT_APP_ID}&secret=${WECHAT_APP_SECRET}`;
    const tokenRes = await fetch(tokenUrl);
    const tokenData: TokenResponse = await tokenRes.json();

    if (!tokenData.access_token) {
      return jsonResponse(
        { success: false, error: `WeChat token error: ${tokenData.errcode} ${tokenData.errmsg}` },
        400
      );
    }

    // 2. Generate Mini Program QR code
    // scene max 32 chars — UUID without dashes fits exactly
    const scene = uuid.replace(/-/g, "");
    const qrcodeUrl = `https://api.weixin.qq.com/wxa/getwxacodeunlimit?access_token=${tokenData.access_token}`;

    const qrcodeRes = await fetch(qrcodeUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scene,
        page: "pages/login/index",
        width: 430,
        env_version: "release",
      }),
    });

    const contentType = qrcodeRes.headers.get("content-type") || "";

    // If WeChat returns JSON, it's an error
    if (contentType.includes("application/json")) {
      const errData = await qrcodeRes.json();
      return jsonResponse(
        { success: false, error: `WeChat QR error: ${errData.errcode} ${errData.errmsg}` },
        400
      );
    }

    // Success — convert image buffer to base64 safely
    const imageBuffer = new Uint8Array(await qrcodeRes.arrayBuffer());
    const base64 = base64Encode(imageBuffer);

    return jsonResponse({ success: true, image: `data:image/png;base64,${base64}` }, 200);
  } catch (e) {
    return jsonResponse({ success: false, error: `Internal error: ${(e as Error).message}` }, 500);
  }
});

function jsonResponse(data: Record<string, unknown>, status: number): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json", ...CORS_HEADERS },
  });
}
