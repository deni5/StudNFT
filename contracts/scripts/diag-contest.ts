import { ethers } from "hardhat";

async function main() {
  const NFT = "0x19a9D64Fe37e02f7a07f3749fC1c58a6bcEa5E77";
  const END = Date.UTC(2026, 11, 31, 21, 59, 59) / 1000;
  const F = await ethers.getContractFactory("NFTContest");
  const tx = await F.getDeployTransaction(NFT, END);
  console.log("initcode bytes:", (tx.data.length - 2) / 2);
  const [s] = await ethers.getSigners();
  console.log("network:", (await ethers.provider.getNetwork()).name, "block ts:", (await ethers.provider.getBlock("latest"))?.timestamp);
  try {
    const gas = await ethers.provider.estimateGas({ from: s.address, data: tx.data });
    console.log("estimateGas OK:", gas.toString());
  } catch (e: any) {
    console.log("estimateGas FAIL:", (e.shortMessage ?? e.message).slice(0, 300));
    console.log("data:", e.data ?? e.info?.error?.data ?? "none");
  }
  try {
    const r = await ethers.provider.call({ from: s.address, data: tx.data, gasLimit: 6_000_000 });
    console.log("call OK, runtime bytes:", (r.length - 2) / 2);
  } catch (e: any) {
    console.log("call FAIL:", (e.shortMessage ?? e.message).slice(0, 300));
    console.log("data:", e.data ?? e.info?.error?.data ?? "none");
  }
}
main();
