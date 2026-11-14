import { ethers } from "hardhat";

const NFT_ADDRESS = process.env.NFT_ADDRESS ?? "0x19a9D64Fe37e02f7a07f3749fC1c58a6bcEa5E77";
// First contest deadline: 2026-12-31 23:59:59 (UTC+2) = 21:59:59 UTC
const FIRST_END = Number(process.env.FIRST_END ?? Date.UTC(2026, 11, 31, 21, 59, 59) / 1000);

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying NFTContest with account:", deployer.address);
  console.log("NFT collection:", NFT_ADDRESS);
  console.log("First contest ends:", new Date(FIRST_END * 1000).toISOString());

  const Contest = await ethers.getContractFactory("NFTContest");
  const contest = await Contest.deploy(NFT_ADDRESS, FIRST_END, { gasLimit: 15_000_000 });
  await contest.waitForDeployment();

  const address = await contest.getAddress();
  console.log("NFTContest deployed to:", address);
  console.log(`NEXT_PUBLIC_CONTEST_CONTRACT_ADDRESS=${address}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
