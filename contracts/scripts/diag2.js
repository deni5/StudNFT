require("dotenv").config();
const RPC = process.env.SEPOLIA_RPC_URL;
const NFT = "0x19a9D64Fe37e02f7a07f3749fC1c58a6bcEa5E77";
const MARKET = "0x2B81415a26f4da8D78D129f7c340464F473dF0F7";
const USER = process.argv[2];
const TOKEN = BigInt(process.argv[3] || "0");

const w = (x) => (typeof x === "bigint" ? x.toString(16) : x.replace(/^0x/, "").toLowerCase()).padStart(64, "0");
const rpc = async (method, params) => {
  const r = await fetch(RPC, { method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }) });
  return r.json();
};

(async () => {
  const code = async (a) => ((await rpc("eth_getCode", [a, "latest"])).result || "0x").length > 2 ? "yes" : "NO CODE";
  console.log("Code NFT   :", await code(NFT));
  console.log("Code MARKET:", await code(MARKET));

  const call = async (to, data, from) =>
    rpc("eth_call", [{ to, data, ...(from ? { from } : {}) }, "latest"]);

  const o = await call(NFT, "0x6352211e" + w(TOKEN));
  console.log("ownerOf(token):", o.result ? "0x" + o.result.slice(26) : JSON.stringify(o.error));
  const a = await call(NFT, "0xe985e9c5" + w(USER) + w(MARKET));
  console.log("isApprovedForAll(user, market):", a.result ? BigInt(a.result) === 1n : JSON.stringify(a.error));
  const g = await call(NFT, "0x081812fc" + w(TOKEN));
  console.log("getApproved(token):", g.result ? "0x" + g.result.slice(26) : JSON.stringify(g.error));

  const price = 10n ** 16n;
  const s = await rpc("eth_estimateGas", [{ from: USER, to: MARKET,
    data: "0xad05f1b4" + w(NFT) + w(TOKEN) + w(price) }]);
  console.log("listNFT simulation:", s.result ? "OK, gas " + BigInt(s.result) : "REVERT " + JSON.stringify(s.error));
})().catch((e) => console.log("ERR", e.message));
