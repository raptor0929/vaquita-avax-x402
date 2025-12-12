import { settlePayment, facilitator } from "thirdweb/x402";
import { createThirdwebClient } from "thirdweb";
import { avalancheFuji } from "thirdweb/chains";
import { USDC_FUJI_ADDRESS, PAYMENT_AMOUNTS } from "@/lib/constants";
import accessManagerAbi from '../../AccessManager.json';
import { ethers } from 'ethers';

const RPC_URL = "https://api.avax-test.network/ext/bc/C/rpc";
const ACCESS_MANAGER_CONTRACT = "0xA8E74Fda80327a103F8598A6CE7f8C0bC13980cb";
const DEPOSIT_ROLE = "8";
const WITHDRAW_ROLE = "9";

const client = createThirdwebClient({
  secretKey: process.env.THIRDWEB_SECRET_KEY!,
});

const thirdwebFacilitator = facilitator({
  client,
  serverWalletAddress: process.env.THIRDWEB_SERVER_WALLET_ADDRESS!,
});

export async function GET(request: Request) {
  const paymentData = request.headers.get("x-payment");
  const resourceUrl = new URL(request.url).href;

  const result = await settlePayment({
    resourceUrl,
    method: "GET",
    paymentData,
    payTo: process.env.MERCHANT_WALLET_ADDRESS!,
    network: avalancheFuji,
    price: {
      amount: PAYMENT_AMOUNTS.PREMIUM.amount,
      asset: {
        address: USDC_FUJI_ADDRESS,
      },
    },
    facilitator: thirdwebFacilitator,
  });

  if (result.status === 200) {
    // decode base64 payment data to json
    const paymentDataJson = JSON.parse(atob(paymentData!));
    const userAddress = paymentDataJson.payload.authorization.from as `0x${string}`;
    // add role to the address
    // Create a wallet using PRIVATE_KEY and connect it to the provider
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    const wallet = new ethers.Wallet(process.env.PRIVATE_KEY!, provider);
    console.log('deployer address = ' + wallet.address);
    const contract = new ethers.Contract(
      ACCESS_MANAGER_CONTRACT!,
      accessManagerAbi,
      wallet
    );
    // Batch both grants into a single transaction via multicall
    const grantDepositData = contract.interface.encodeFunctionData("grantRole", [DEPOSIT_ROLE, userAddress, 0]);
    const grantWithdrawData = contract.interface.encodeFunctionData("grantRole", [WITHDRAW_ROLE, userAddress, 0]);

    const multicallTx = await contract.multicall([grantDepositData, grantWithdrawData]);
    await multicallTx.wait();

    return Response.json({
      tier: "premium",
      data: "Welcome to Vaquita Premium! You now have access to a premium pool with lots of perks!",
      timestamp: new Date().toISOString(),
    });
  } else {
    return Response.json(result.responseBody, {
      status: result.status,
      headers: result.responseHeaders,
    });
  }
}
