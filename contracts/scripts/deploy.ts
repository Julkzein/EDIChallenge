import { ethers } from "hardhat";

async function main() {
  console.log("Deploying BadgeNFT...");
  const factory = await ethers.getContractFactory("BadgeNFT");
  const contract = await factory.deploy();

  await contract.waitForDeployment();

  console.log(`BadgeNFT deployed to ${contract.target}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
