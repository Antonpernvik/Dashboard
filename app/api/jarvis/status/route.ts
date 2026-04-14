import { NextResponse } from "next/server";

// Kollar om OpenClaw gateway är online via Cloudflare Tunnel
export async function GET() {
  const gatewayUrl = process.env.OPENCLAW_GATEWAY_URL;

  if (!gatewayUrl) {
    return NextResponse.json(
      { online: false, error: "OPENCLAW_GATEWAY_URL ej konfigurerad" },
      { status: 200 }
    );
  }

  try {
    const res = await fetch(`${gatewayUrl}/health`, {
      method: "GET",
      signal: AbortSignal.timeout(5000),
    });

    if (res.ok) {
      const data = await res.json().catch(() => ({}));
      return NextResponse.json({
        online: true,
        model: data.model || "anthropic/claude-sonnet-4-6",
        version: data.version || null,
        uptime: data.uptime || null,
      });
    }

    // Gateway svarar men inte 200 — ändå online
    return NextResponse.json({ online: true, model: "anthropic/claude-sonnet-4-6" });
  } catch {
    return NextResponse.json({ online: false, error: "Kan inte nå gateway" });
  }
}
