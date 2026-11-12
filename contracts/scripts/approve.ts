import { ethers } from "hardhat";

const NFT = "0x19a9D64Fe37e02f7a07f3749fC1c58a6bcEa5E77";
const MARKET = "0x2B81415a26f4da8D78D129f7c340464F473dF0F7";

async function main() {
  const [signer] = await ethers.getSigners();
  const nft = new ethers.Contract(
    NFT,
    [
      "function setApprovalForAll(address,bool)",
      "function isApprovedForAll(address,address) view returns (bool)",
    ],
    signer
  );
  console.log("Wallet:", signer.address);
  console.log("Before:", await nft.isApprovedForAll(signer.address, MARKET));
  const tx = await nft.setApprovalForAll(MARKET, true, { gasLimit: 200000 });
  console.log("Tx:", tx.hash);
  await tx.wait();
  console.log("After:", await nft.isApprovedForAll(signer.address, MARKET));
}

main().catch((e) => { console.error(e); process.exit(1); });
