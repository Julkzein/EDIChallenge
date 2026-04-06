import { NextResponse } from 'next/server';
import { PinataSDK } from "pinata-web3";
import { createWalletClient, createPublicClient, http, publicActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { polygonAmoy, polygon } from 'viem/chains';

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT || "dummy",
  pinataGateway: process.env.PINATA_GATEWAY || "gateway.pinata.cloud"
});

const pk = process.env.PRIVATE_KEY || "";
const privateKeyStr = pk.startsWith('0x') ? pk : `0x${pk}`;
const account = pk ? privateKeyToAccount(privateKeyStr as `0x${string}`) : null;

const ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "recipient", "type": "address" },
      { "internalType": "string", "name": "tokenURI", "type": "string" }
    ],
    "name": "mintBadge",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [{ "internalType": "address", "name": "owner", "type": "address" }],
    "name": "balanceOf",
    "outputs": [{ "internalType": "uint256", "name": "", "type": "uint256" }],
    "stateMutability": "view",
    "type": "function"
  }
];

export async function POST(request: Request) {
  try {
    const data = await request.json();
    
    // Multi-chain routing logic
    const isMainnet = data.network === "mainnet";
    const contractAddress = isMainnet 
      ? process.env.NEXT_PUBLIC_MAINNET_CONTRACT_ADDRESS 
      : (process.env.NEXT_PUBLIC_AMOY_CONTRACT_ADDRESS || process.env.NEXT_PUBLIC_CONTRACT_ADDRESS);
      
    if (!contractAddress || contractAddress === "0x0000000000000000000000000000000000000000") {
      throw new Error("Target Smart Contract Address not deployed or configured in .env");
    }

    const targetChain = isMainnet ? polygon : polygonAmoy;
    const rpcUrl = isMainnet 
      ? (process.env.NEXT_PUBLIC_POLYGON_RPC_URL || "https://polygon.drpc.org") 
      : (process.env.NEXT_PUBLIC_AMOY_RPC_URL || "https://rpc-amoy.polygon.technology");

    const transport = http(rpcUrl);

    const publicClient = createPublicClient({ chain: targetChain, transport });
    const walletClient = account ? createWalletClient({
      account,
      chain: targetChain,
      transport
    }).extend(publicActions) : null;
    
    // V2 EVOLUTION CHECK
    let balance = BigInt(0);
    if (publicClient) {
      try {
        balance = await publicClient.readContract({
          address: contractAddress as `0x${string}`,
          abi: ABI,
          functionName: 'balanceOf',
          args: [data.recipientWallet as `0x${string}`]
        }) as bigint;
      } catch (e) {
        console.warn("Could not fetch balance for evolution check", e);
      }
    }

    const metadata = {
      name: `${data.eventName} Badge - ${data.badgeType}`,
      description: data.description || `Issued for ${data.eventName}`,
      image: data.compiledImageHash
        ? `https://dweb.link/ipfs/${data.compiledImageHash}`
        : (data.imageLink || ""),
      event_image: data.imageLink || "",
      profile_image: data.profileImage || "",
      attributes: [
        { trait_type: "Badge Type", value: data.badgeType },
        { trait_type: "First Name", value: data.firstName },
        { trait_type: "Last Name", value: data.lastName },
        { trait_type: "Event", value: data.eventName },
        { trait_type: "Start Date", value: data.startDate },
        { trait_type: "End Date", value: data.endDate },
      ]
    };

    let tokenURI = "";
    if (process.env.PINATA_JWT && process.env.PINATA_JWT !== "dummy") {
      const upload = await pinata.upload.json(metadata);
      tokenURI = `https://dweb.link/ipfs/${upload.IpfsHash}`;
    } else {
      tokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify(metadata)).toString('base64')}`;
    }

    if (!walletClient || !account) {
      throw new Error("Backend wallet not configured in .env");
    }

    const { request: contractReq, result: mintedTokenId } = await walletClient.simulateContract({
      address: contractAddress as `0x${string}`,
      abi: ABI,
      functionName: 'mintBadge',
      args: [data.recipientWallet as `0x${string}`, tokenURI]
    });

    const hash = await walletClient.writeContract(contractReq);
    
    let evolutionHash = null;
    let evolved = false;

    // EVOLUTION REWARD (if they just got their 2nd badge)
    if (balance === BigInt(1)) {
      evolved = true;
      const evoMetadata = {
        name: `ELCA Digital Master - Evolution Badge`,
        description: `Awarded for collecting multiple ELCA badges!`,
        image: "https://via.placeholder.com/600x600/00b2a9/ffffff?text=Evolution+Badge",
        attributes: [
          { trait_type: "Badge Type", value: "Evolution" },
          { trait_type: "Milestone", value: "2 Badges Reached" }
        ]
      };
      
      let evoTokenURI = `data:application/json;base64,${Buffer.from(JSON.stringify(evoMetadata)).toString('base64')}`;
      if (process.env.PINATA_JWT && process.env.PINATA_JWT !== "dummy") {
        const evoUpload = await pinata.upload.json(evoMetadata);
        evoTokenURI = `https://dweb.link/ipfs/${evoUpload.IpfsHash}`;
      }

      try {
        const { request: evoReq } = await walletClient.simulateContract({
          address: contractAddress as `0x${string}`,
          abi: ABI,
          functionName: 'mintBadge',
          args: [data.recipientWallet as `0x${string}`, evoTokenURI]
        });
        evolutionHash = await walletClient.writeContract(evoReq);
      } catch (err) {
        console.error("Evolution minting failed", err);
      }
    }

    return NextResponse.json({
      hash,
      tokenId: mintedTokenId != null ? String(mintedTokenId) : undefined,
      contractAddress,
      url: isMainnet ? `https://polygonscan.com/tx/${hash}` : `https://amoy.polygonscan.com/tx/${hash}`,
      evolved,
      evolutionHash
    });
  } catch (error) {
    console.error("Minting failed", error);
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
