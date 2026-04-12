import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying StudNFT with account:", deployer.address);

  const StudNFT = await ethers.getContractFactory("StudNFT");
  const nft = await StudNFT.deploy({ gasLimit: 3_000_000 });
  await nft.waitForDeployment();

  const address = await nft.getAddress();
  console.log("StudNFT deployed to:", address);
  console.log("NEXT_PUBLIC_NFT_CONTRACT_ADDRESS=" + address);
}

main().catch((err) => { console.error(err); process.exit(1); });
