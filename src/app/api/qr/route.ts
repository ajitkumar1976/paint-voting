import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";
import { isAdminAuthenticated } from "@/lib/auth";
import { protocolForHost } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  if (!(await isAdminAuthenticated())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const host = request.headers.get("host") ?? "localhost:3000";
  const protocol = protocolForHost(host);
  const voteUrl = `${protocol}://${host}/vote`;
  const qrDataUrl = await QRCode.toDataURL(voteUrl, {
    width: 320,
    margin: 2,
    color: { dark: "#5b21b6", light: "#ffffff" },
  });

  return NextResponse.json({ voteUrl, qrDataUrl });
}
