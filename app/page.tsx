"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { createThirdwebClient, getContract, prepareContractCall, sendTransaction, readContract } from "thirdweb";
import type { Abi } from "viem";
import { avalancheFuji } from "thirdweb/chains";
import { ConnectButton, useActiveAccount, useActiveWallet } from "thirdweb/react";
import { wrapFetchWithPayment } from "thirdweb/x402";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createNormalizedFetch } from "@/lib/payment";
import { AVALANCHE_FUJI_CHAIN_ID, API_ENDPOINTS, USDC_FUJI_ADDRESS } from "@/lib/constants";
import MSV_ABI from "./MSV.json";

const MSV_CONTRACT = "0x1c3efaAea2772863ff5848A3B09c2b0af48685ec";

// Standard ERC20 ABI for approve and allowance
const ERC20_ABI = [
  {
    inputs: [
      { internalType: "address", name: "spender", type: "address" },
      { internalType: "uint256", name: "amount", type: "uint256" },
    ],
    name: "approve",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "owner", type: "address" },
      { internalType: "address", name: "spender", type: "address" },
    ],
    name: "allowance",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
] as const;


const client = createThirdwebClient({
  clientId: process.env.NEXT_PUBLIC_THIRDWEB_CLIENT_ID!,
});

interface ContentData {
  tier: string;
  data: string;
  timestamp: string;
}

const QUICK_AMOUNTS = [0.1, 0.5, 1];

export default function Home() {
  const wallet = useActiveWallet();
  const account = useActiveAccount();
  const [content, setContent] = useState<ContentData | null>(null);
  const [amount, setAmount] = useState<number>(QUICK_AMOUNTS[0]);
  const [balance, setBalance] = useState<number>(0);
  const [status, setStatus] = useState<string | null>(null);
  const [isSubscribing, setIsSubscribing] = useState(false);
  const [isDepositing, setIsDepositing] = useState(false);
  const [isWithdrawing, setIsWithdrawing] = useState(false);
  const [animateCow, setAnimateCow] = useState(false);

  const amountInUnits = useMemo(
    () => BigInt(Math.max(0, Math.round(amount * 1_000_000))),
    [amount]
  );

  useEffect(() => {
    setContent(null);
    setStatus(null);
    fetchVaultBalance();
  }, [wallet, account?.address]);

  useEffect(() => {
    if (!animateCow) return;
    const timer = setTimeout(() => setAnimateCow(false), 800);
    return () => clearTimeout(timer);
  }, [animateCow]);

  const fetchVaultBalance = async (opts?: { returnAssets?: boolean }) => {
    if (!account?.address) {
      setBalance(0);
      return opts?.returnAssets ? BigInt(0) : undefined;
    }

    try {
      const res = await fetch(`/api/balance?address=${account.address}`, { cache: "no-store" });
      if (!res.ok) throw new Error("Failed to fetch balance");
      const data = await res.json();
      const assets = BigInt(data.assets ?? 0);
      setBalance(Number(data.usdc ?? 0));
      return opts?.returnAssets ? assets : undefined;
    } catch (error) {
      console.error("Failed to fetch vault balance", error);
      return opts?.returnAssets ? BigInt(0) : undefined;
    }
  };

  const handleSubscribe = async () => {
    if (!wallet) {
      setStatus("Connect your wallet to subscribe.");
      return;
    }

    setIsSubscribing(true);
    setStatus("Requesting premium subscription...");

    try {
      const normalizedFetch = createNormalizedFetch(AVALANCHE_FUJI_CHAIN_ID);
      const fetchWithPay = wrapFetchWithPayment(normalizedFetch, client, wallet, {
        maxValue: amountInUnits,
      });

      const response = await fetchWithPay(API_ENDPOINTS.PREMIUM);
      const responseData = await response.json();

      if (response.ok) {
        setContent(responseData);
        setStatus("Premium subscription successful! You can now deposit to the vault.");
      } else {
        const errorMsg = responseData.error || "Subscription failed";
        setStatus(errorMsg);
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Subscription error";
      setStatus(errorMsg);
    } finally {
      setIsSubscribing(false);
    }
  };

  const handleApproveAndDeposit = async () => {
    if (!account) {
      setStatus("Connect your wallet first.");
      return;
    }

    setIsDepositing(true);
    setStatus("Approving USDC spending...");

    try {
      // Step 1: Check and approve USDC spending
      const usdcContract = getContract({
        client,
        chain: avalancheFuji,
        address: USDC_FUJI_ADDRESS,
        abi: ERC20_ABI as Abi,
      });

      // Check current allowance
      const currentAllowance = await readContract({
        contract: usdcContract,
        method: "function allowance(address owner, address spender) view returns (uint256)",
        params: [account.address as `0x${string}`, MSV_CONTRACT as `0x${string}`],
      });

      // Approve if allowance is insufficient
      if (currentAllowance < amountInUnits) {
        setStatus("Approving USDC spending for MSV...");
        const approveTx = prepareContractCall({
          contract: usdcContract,
          method: "function approve(address spender, uint256 amount) returns (bool)",
          params: [MSV_CONTRACT as `0x${string}`, amountInUnits],
        });

        const approveResult = await sendTransaction({
          account: account,
          transaction: approveTx,
        });

        // Ensure approval is mined before proceeding
        if (approveResult && typeof (approveResult as any).wait === "function") {
          await (approveResult as any).wait();
        }

        // Wait for confirmation
        await new Promise(resolve => setTimeout(resolve, 5000));
      }

      // Step 2: Deposit to MSV
      setStatus("Depositing into Vaquita MSV...");
      const msvContract = getContract({
        client,
        chain: avalancheFuji,
        address: MSV_CONTRACT,
        abi: MSV_ABI as Abi,
      });

      const depositTx = prepareContractCall({
        contract: msvContract,
        method: "function deposit(uint256 assets, address receiver) returns (uint256 shares)",
        params: [amountInUnits, account.address as `0x${string}`],
      });

      await sendTransaction({
        account: account,
        transaction: depositTx,
      });

      // Wait for confirmation
      await new Promise(resolve => setTimeout(resolve, 5000));

      await fetchVaultBalance();
      setStatus("Successfully deposited into Vaquita MSV.");
      setAnimateCow(true);
    } catch (depositError) {
      const errorMsg = depositError instanceof Error ? depositError.message : "Deposit failed";
      setStatus(`Deposit failed: ${errorMsg}`);
    } finally {
      setIsDepositing(false);
    }
  };

  const handleWithdraw = async () => {
    if (!account) {
      setStatus("Connect your wallet first.");
      return;
    }

    setIsWithdrawing(true);
    setStatus("Withdrawing from Vaquita MSV...");

    try {
      const assets = await fetchVaultBalance({ returnAssets: true });

      if (!assets || assets === BigInt(0)) {
        setStatus("No balance to withdraw yet.");
        setIsWithdrawing(false);
        return;
      }

      const msvContract = getContract({
        client,
        chain: avalancheFuji,
        address: MSV_CONTRACT,
        abi: MSV_ABI as Abi,
      });

      const withdrawTx = prepareContractCall({
        contract: msvContract,
        method: "function withdraw(uint256 assets, address receiver, address owner) returns (uint256 shares)",
        params: [assets, account.address as `0x${string}`, account.address as `0x${string}`],
      });

      await sendTransaction({
        account: account,
        transaction: withdrawTx,
      });

      await fetchVaultBalance();
      setStatus("Balance withdrawn back to your wallet.");
      setAnimateCow(true);
    } catch (withdrawError) {
      const errorMsg = withdrawError instanceof Error ? withdrawError.message : "Withdrawal failed";
      setStatus(`Withdrawal failed: ${errorMsg}`);
    } finally {
      setIsWithdrawing(false);
    }
  };

  const cowScale = 1 + Math.min(balance / 10, 0.35);
  const shortAddress = account?.address
    ? `${account.address.slice(0, 6)}...${account.address.slice(-4)}`
    : null;

  return (
    <div className="min-h-screen bg-gradient-to-b from-amber-50 via-orange-50 to-amber-100">
      <div className="max-w-5xl mx-auto px-4 py-10 space-y-8">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-[0.35em] text-amber-700">Vaquita</p>
            <h1 className="text-4xl font-bold text-slate-900">Premium Vault</h1>
            <p className="text-sm text-slate-600">
              Only premium payments are supported. Deposit to wake the cow.
            </p>
          </div>
          <ConnectButton
              client={client}
              // TODO: There is a bug in the x402 for smart wallets atm, revise later
              // accountAbstraction={{
              //   chain: avalancheFuji, // the chain where your smart accounts will be or is deployed
              //   sponsorGas: true, // enable or disable sponsored transactions
              // }}
          />
        </header>

        <Card className="bg-white/80 border-amber-100 shadow-lg shadow-amber-100/50">
          <CardContent className="p-6 md:p-8 grid md:grid-cols-2 gap-8 items-center">
            <div className="flex flex-col items-center gap-4">
              <div
                className={`bg-amber-50 border border-amber-100 rounded-2xl p-6 shadow-inner transition-transform duration-300 ${
                  animateCow ? "cow-shake" : ""
                }`}
                style={{ transform: `scale(${cowScale})` }}
              >
                <Image
                  src="/vaquita/vaquita_isotipo.svg"
                  alt="Vaquita mascot"
                  width={240}
                  height={240}
                  priority
                  className="drop-shadow-sm"
                />
              </div>
              <div className="text-center space-y-1">
                <p className="text-sm text-amber-700 font-semibold">Balance</p>
                <p className="text-3xl font-bold text-slate-900">${balance.toFixed(2)}</p>
                <p className="text-xs text-muted-foreground">
                  Cow grows and shakes when you deposit, shrinks when you withdraw.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-slate-800">Deposit to Vaquita</p>
                  <p className="text-xs text-muted-foreground">
                    Premium-only payment. On-chain price stays at $0.01 USDC.
                  </p>
                </div>
                {shortAddress && (
                  <span className="text-xs font-mono bg-amber-50 text-amber-800 px-2 py-1 rounded-md border border-amber-100">
                    {shortAddress}
                  </span>
                )}
              </div>

              <div className="space-y-2">
                <label className="text-xs uppercase font-semibold text-slate-500">
                  Amount (USDC)
                </label>
                <div className="flex flex-col gap-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={amount}
                      onChange={(e) => setAmount(Number(e.target.value) || 0)}
                      className="w-28 rounded-lg border border-amber-200 bg-white px-3 py-2 text-sm shadow-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-200"
                    />
                    <div className="flex flex-wrap gap-2">
                      {QUICK_AMOUNTS.map((value) => (
                        <Button
                          key={value}
                          type="button"
                          size="sm"
                          variant={amount === value ? "default" : "outline"}
                          onClick={() => setAmount(value)}
                          className={
                            amount === value
                              ? "bg-amber-600 hover:bg-amber-700"
                              : "border-amber-200 text-amber-700 hover:bg-amber-50"
                          }
                        >
                          ${value.toFixed(2)}
                        </Button>
                      ))}
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Payments go through thirdweb 402. We cap spending to your chosen deposit.
                  </p>
                </div>

                <div className="flex flex-col gap-3">
                  <div className="flex flex-col sm:flex-row gap-3">
                    <Button
                      onClick={handleSubscribe}
                      disabled={isSubscribing || amount <= 0}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700"
                    >
                      {isSubscribing ? "Subscribing..." : "Subscribe to Premium"}
                    </Button>
                    <Button
                      onClick={handleApproveAndDeposit}
                      disabled={isDepositing || amount <= 0}
                      className="flex-1 bg-amber-600 hover:bg-amber-700"
                    >
                      {isDepositing ? "Processing..." : "Deposit"}
                    </Button>
                  </div>
                  <Button
                    variant="outline"
                    onClick={handleWithdraw}
                    disabled={isWithdrawing || balance <= 0}
                    className="w-full border-amber-200 text-amber-700 hover:bg-amber-50"
                  >
                    {isWithdrawing ? "Withdrawing..." : "Withdraw"}
                  </Button>
                </div>

                {status && (
                  <div className="rounded-lg border border-amber-100 bg-amber-50 text-amber-800 text-sm px-3 py-2">
                    {status}
                  </div>
                )}

                {content && (
                  <div className="rounded-lg border border-emerald-100 bg-emerald-50 text-emerald-800 text-sm px-3 py-2 space-y-1">
                    <p className="font-semibold">Premium unlocked</p>
                    <p>{content.data}</p>
                    <p className="text-xs text-emerald-700">
                      Updated: {new Date(content.timestamp).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
