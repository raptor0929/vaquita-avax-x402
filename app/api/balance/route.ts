import { NextResponse } from "next/server";
import { ethers } from "ethers";
import MSV_ABI from "../../MSV.json";

const RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
const MSV_CONTRACT = "0x1c3efaAea2772863ff5848A3B09c2b0af48685ec";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const address = searchParams.get("address");

  if (!address) {
    return NextResponse.json({ error: "address is required" }, { status: 400 });
  }

  try {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    const contract = new ethers.Contract(MSV_CONTRACT, MSV_ABI, wallet);

    const assets: bigint = await contract.maxWithdraw(address);
    console.log("assets: ", assets);
    const usdc = Number(assets) / 1_000_000;

    return NextResponse.json({
      address,
      assets: assets.toString(),
      usdc,
    });
  } catch (error) {
    console.error("Failed to fetch balance", error);
    return NextResponse.json({ error: "Failed to fetch balance" }, { status: 500 });
  }
}

