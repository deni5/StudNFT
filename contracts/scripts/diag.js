require("dotenv").config();
const { ethers } = require("ethers");

const NFT = "0x19a9D64Fe37e02f7a07f3749fC1c58a6bcEa5E77";
const MARKET = "0x2B81415a26f4da8D78D129f7c340464F473dF0F7";
const USER = process.argv[2];      // адрес гаманця, який виставляє
const TOKEN = BigInt(process.argv[3] || "0");

(async () => {
  const p = new ethers.JsonRpcProvider(process.env.SEPOLIA_RPC_URL);
  console.log("Network:", (await p.getNetwork()).chainId.toString());
  console.log("Code NFT   :", (await p.getCode(NFT)).length > 2 ? "yes" : "NO CODE");
  console.log("Code MARKET:", (await p.getCode(MARKET)).length > 2 ? "yes" : "NO CODE");

  const nft = new ethers.Contract(NFT, [
    "function ownerOf(uint256) view returns (address)",
    "function isApprovedForAll(address,address) view returns (bool)",
    "function getApproved(uint256) view returns (address)",
  ], p);
  console.log("ownerOf(token):", await nft.ownerOf(TOKEN));
  console.log("isApprovedForAll(user, market):", await nft.isApprovedForAll(USER, MARKET));
  console.log("getApproved(token):", await nft.getApproved(TOKEN));

  const mk = new ethers.Contract(MARKET, [
    "function listNFT(address,uint256,uint256) returns (uint256)",
  ], p);
  try {
    const gas = await mk.listNFT.estimateGas(NFT, TOKEN, ethers.parseEther("0.01"), { from: USER });
    console.log("listNFT simulation OK, gas estimate:", gas.toString());
  } catch (e) {
    console.log("listNFT simulation REVERT:", e.shortMessage || e.message);
  }
})();
