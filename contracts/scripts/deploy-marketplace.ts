import { ethers } from "hardhat";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying NFTMarketplace with account:", deployer.address);

  const Marketplace = await ethers.getContractFactory("NFTMarketplace");
  const marketplace = await Marketplace.deploy(deployer.address, { gasLimit: 3_000_000 });
  await marketplace.waitForDeployment();

  const address = await marketplace.getAddress();
  console.log("NFTMarketplace deployed to:", address);
  console.log("NEXT_PUBLIC_MARKETPLACE_CONTRACT_ADDRESS=" + address);
}

main().catch((err) => { console.error(err); process.exit(1); });
