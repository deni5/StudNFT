import { NextRequest, NextResponse } from "next/server";
import { createPublicClient, http } from "viem";
import { sepolia } from "viem/chains";

const NFT_CONTRACT_ADDRESS = "0x19a9D64Fe37e02f7a07f3749fC1c58a6bcEa5E77" as `0x${string}`;
const DEPLOY_BLOCK = 10640000n;
const CHUNK = 9000n;
const DELAY_MS = 200;

function sleep(ms: number) {
  return new Promise(r => setTimeout(r, ms));
}

export async function GET(request: NextRequest) {
  const address = request.nextUrl.searchParams.get("address");
  if (!address) return NextResponse.json({ tokenIds: [] });

  const client = createPublicClient({
    chain: sepolia,
    transport: http("https://sepolia.infura.io/v3/2ca257ec21864f79bd68782dfd3eb391"),
  });

  try {
    const latest = await client.getBlockNumber();
    const allIds: string[] = [];

    for (let from = DEPLOY_BLOCK; from <= latest; from += CHUNK) {
      const to = from + CHUNK - 1n > latest ? latest : from + CHUNK - 1n;
      try {
        const logs = await client.getLogs({
          address: NFT_CONTRACT_ADDRESS,
          event: {
            name: "Minted",
            type: "event",
            inputs: [
              { name: "tokenId", type: "uint256", indexed: true },
              { name: "owner", type: "address", indexed: true },
              { name: "tokenURI", type: "string", indexed: false },
            ],
          },
          args: { owner: address as `0x${string}` },
          fromBlock: from,
          toBlock: to,
        });
        for (const log of logs) {
          allIds.push(((log.args as any).tokenId as bigint).toString());
        }
        await sleep(DELAY_MS);
      } catch (e) {
        console.error("chunk error", e);
      }
    }

    return NextResponse.json({ tokenIds: allIds }, {
      headers: { "Cache-Control": "public, max-age=60" }
    });
  } catch (e) {
    return NextResponse.json({ tokenIds: [], error: String(e) });
  }
}
