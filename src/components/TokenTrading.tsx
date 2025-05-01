import React from "react";
import { NumericInput } from "./ui/NumericInput";
import { PrimaryButton } from "./ui/PrimaryButton";
import { LoadingDots } from "./ui/LoadingDots";

interface TokenTradingProps {
  tokenSymbol: string;
  tokenAddress: string;
  buyState: {
    amount: string;
    estimatedCost: string;
    hasAllowance: boolean;
    isProcessing: boolean;
    isApproving: boolean;
  };
  sellState: {
    amount: string;
    estimatedCost: string;
    hasAllowance: boolean;
    isProcessing: boolean;
    isApproving: boolean;
  };
  successInfo: {
    message: string;
    txHash: string;
  } | null;
  blockExplorerUrl: string | null;
  activeTab: "buy" | "sell";
  tokenBalance: string | null | undefined;
  handleBuyAmountChange: (amount: string) => void;
  handleSellAmountChange: (amount: string) => void;
  approveBuy: () => void;
  approveSell: () => void;
  executeBuy: () => void;
  executeSell: () => void;
  setActiveTab: (tab: "buy" | "sell") => void;
  clearSuccessMessage: () => void;
}

const TokenTrading: React.FC<TokenTradingProps> = ({
  tokenSymbol,
  tokenAddress,
  buyState,
  sellState,
  successInfo,
  blockExplorerUrl,
  activeTab,
  tokenBalance,
  handleBuyAmountChange,
  handleSellAmountChange,
  approveBuy,
  approveSell,
  executeBuy,
  executeSell,
  setActiveTab,
  clearSuccessMessage,
}) => {
  // Calculate if the user has sufficient balance to sell
  const hasInsufficientTokenBalance = () => {
    if (!tokenBalance || !sellState.amount) return false;
    return Number(sellState.amount) > Number(tokenBalance);
  };

  return (
    <div>
      {/* Display Success Message */}
      {successInfo && (
        <div className="mb-4 p-3 bg-cordex-green text-black flex justify-between items-center">
          <div>
            <span>{successInfo.message}</span>
            {blockExplorerUrl && successInfo.txHash && (
              <a
                href={`${blockExplorerUrl}/tx/${successInfo.txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="ml-2 underline hover:text-green-100 text-xs"
              >
                View Transaction
              </a>
            )}
          </div>
          <button
            onClick={clearSuccessMessage}
            className="text-black hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      <h3 className="text-xl font-medium text-gray-100 mb-4">Trade Tokens</h3>

      {/* ADDED: Token balance display */}
      {tokenBalance !== null && tokenBalance !== undefined && (
        <div className="text-sm text-gray-400 mb-3">
          Your Balance: {Number(tokenBalance).toFixed(4)}{" "}
          {tokenSymbol || "tokens"}
        </div>
      )}

      <div className="flex border-b border-gray-700">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "buy"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("buy")}
        >
          Buy Tokens
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "sell"
              ? "text-blue-400 border-b-2 border-blue-400"
              : "text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("sell")}
        >
          Sell Tokens
        </button>
      </div>

      <div className="mt-4">
        {activeTab === "buy" ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Amount of {tokenSymbol || "tokens"} to buy
              </label>
              <div className="flex items-center space-x-2">
                <NumericInput
                  value={buyState.amount}
                  onChange={(e) => handleBuyAmountChange(e.target.value)}
                  placeholder="0.0"
                  className="bg-gray-700 border border-gray-600 text-white p-2 rounded-md w-full"
                  disabled={buyState.isProcessing || buyState.isApproving}
                  allowDecimal={true}
                />
                <span className="text-gray-400 text-sm whitespace-nowrap">
                  {tokenSymbol || "tokens"}
                </span>
              </div>
            </div>

            {buyState.amount && Number(buyState.amount) > 0 && (
              <div className="bg-gray-700 p-2 rounded-md">
                <p className="text-sm text-gray-300">
                  Estimated cost: {Number(buyState.estimatedCost).toFixed(6)}{" "}
                  CORDEX
                </p>
              </div>
            )}

            {buyState.hasAllowance ? (
              <PrimaryButton
                onClick={executeBuy}
                disabled={
                  !buyState.amount ||
                  buyState.isProcessing ||
                  Number(buyState.amount) <= 0
                }
              >
                {buyState.isProcessing ? (
                  <LoadingDots text={`Buying ${tokenSymbol || "Tokens"}...`} />
                ) : (
                  `Buy ${tokenSymbol || "Tokens"}`
                )}
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={approveBuy}
                disabled={buyState.isApproving}
              >
                {buyState.isApproving ? (
                  <LoadingDots text="Approving CORDEX" />
                ) : (
                  "Approve CORDEX"
                )}
              </PrimaryButton>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Amount of {tokenSymbol || "tokens"} to sell
              </label>
              <div className="flex items-center space-x-2 w-full">
                <NumericInput
                  value={sellState.amount}
                  onChange={(e) => handleSellAmountChange(e.target.value)}
                  placeholder="0.0"
                  className="bg-gray-700 border border-gray-600 text-white p-2 rounded-md w-full"
                  disabled={sellState.isProcessing || sellState.isApproving}
                  allowDecimal={true}
                />
                <span className="text-gray-400 text-sm whitespace-nowrap">
                  {tokenSymbol || "tokens"}
                </span>
              </div>
            </div>

            {sellState.amount && Number(sellState.amount) > 0 && (
              <div className="bg-gray-700 p-2 rounded-md">
                <p className="text-sm text-gray-300">
                  Estimated payout: {Number(sellState.estimatedCost).toFixed(6)}{" "}
                  CORDEX
                </p>
              </div>
            )}

            {hasInsufficientTokenBalance() && (
              <p className="text-red-400 text-sm">Insufficient token balance</p>
            )}

            {sellState.hasAllowance ? (
              <PrimaryButton
                onClick={executeSell}
                disabled={
                  !sellState.amount ||
                  sellState.isProcessing ||
                  Number(sellState.amount) <= 0 ||
                  hasInsufficientTokenBalance()
                }
                className="w-full"
              >
                {sellState.isProcessing ? (
                  <LoadingDots text={`Selling ${tokenSymbol || "Tokens"}...`} />
                ) : (
                  `Sell ${tokenSymbol || "Tokens"}`
                )}
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={approveSell}
                disabled={sellState.isApproving}
                className="w-full"
              >
                {sellState.isApproving ? (
                  <LoadingDots
                    text={`Approving ${tokenSymbol || "Tokens"}...`}
                  />
                ) : (
                  `Approve ${tokenSymbol || "Tokens"}`
                )}
              </PrimaryButton>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TokenTrading;
