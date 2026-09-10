import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: { hash: string } }
) {
  const hash = params.hash;
  const gateways = [
    `https://cloudflare-ipfs.com/ipfs/${hash}`,
    `https://gateway.pinata.cloud/ipfs/${hash}`,
    `https://ipfs.io/ipfs/${hash}`,
  ];

  for (const gateway of gateways) {
    try {
      const res = await fetch(gateway, {
        signal: AbortSignal.timeout(8000),
      });
      if (res.ok) {
        const contentType = res.headers.get("content-type") ?? "application/octet-stream";
        const buffer = await res.arrayBuffer();
        return new NextResponse(buffer, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=31536000, immutable",
            "Access-Control-Allow-Origin": "*",
          },
        });
      }
    } catch {
      continue;
    }
  }
  return new NextResponse("Not found", { status: 404 });
}
