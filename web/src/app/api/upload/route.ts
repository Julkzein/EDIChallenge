import { NextResponse } from 'next/server';
import { PinataSDK } from "pinata-web3";

const pinata = new PinataSDK({
  pinataJwt: process.env.PINATA_JWT || "dummy",
  pinataGateway: process.env.PINATA_GATEWAY || "gateway.pinata.cloud"
});

export async function POST(request: Request) {
  try {
    const data = await request.formData();
    const file: File | null = data.get("file") as unknown as File;
    
    if (!file) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (process.env.PINATA_JWT && process.env.PINATA_JWT !== "dummy") {
      const upload = await pinata.upload.file(file);
      const url = `https://gateway.pinata.cloud/ipfs/${upload.IpfsHash}`;
      return NextResponse.json({ url });
    } else {
      // Fallback if no Pinata keys
      return NextResponse.json({ url: "https://via.placeholder.com/400x600?text=No+Pinata+Key" });
    }
  } catch (error) {
    console.error("Upload failed", error);
    return NextResponse.json({ error: "Failed to upload file" }, { status: 500 });
  }
}
