import React from "react";
import { NumericInput } from "./ui/NumericInput";
import { PrimaryButton } from "./ui/PrimaryButton";
import { LoadingDots } from "./ui/LoadingDots";
import { InputLabel } from "./ui";
import { SecondaryButton } from "./ui/SecondaryButton";

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
        <div className="mb-4 text-white flex justify-between items-center">
          <div>
            <div>{successInfo.message}</div>
            {blockExplorerUrl && successInfo.txHash && (
              <SecondaryButton
                href={`${blockExplorerUrl}/tx/${successInfo.txHash}`}
              >
                view transaction
              </SecondaryButton>
            )}
          </div>
          <button
            onClick={clearSuccessMessage}
            className="text-white hover:text-white"
          >
            &times;
          </button>
        </div>
      )}

      <h3 className="text-xl font-medium text-gray-100 mb-4">trade tokens</h3>

      {/* ADDED: Token balance display */}
      {tokenBalance !== null && tokenBalance !== undefined && (
        <div className="text-sm text-gray-400 mb-3">
          your balance: {Number(tokenBalance).toFixed(4)}{" "}
          {tokenSymbol || "tokens"}
        </div>
      )}

      <div className="flex border-b border-gray-700">
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "buy"
              ? "text-white border-b-2 border-white"
              : "text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("buy")}
        >
          buy tokens
        </button>
        <button
          className={`px-4 py-2 text-sm font-medium ${
            activeTab === "sell"
              ? "text-white border-b-2 border-white"
              : "text-gray-400 hover:text-gray-300"
          }`}
          onClick={() => setActiveTab("sell")}
        >
          sell tokens
        </button>
      </div>

      <div className="mt-4">
        {activeTab === "buy" ? (
          <div className="space-y-4">
            <div>
              <InputLabel>
                amount of {tokenSymbol || "tokens"} to buy
              </InputLabel>
              <div className="flex items-center space-x-2">
                <NumericInput
                  value={buyState.amount}
                  onChange={(e) => handleBuyAmountChange(e.target.value)}
                  placeholder="0.0"
                  disabled={buyState.isProcessing || buyState.isApproving}
                  allowDecimal={true}
                />
                <span className="text-gray-400 text-sm whitespace-nowrap">
                  {tokenSymbol || "tokens"}
                </span>
              </div>
            </div>

            {buyState.amount && Number(buyState.amount) > 0 && (
              <div className="">
                <p className="text-sm text-gray-300">
                  estimated cost: {Number(buyState.estimatedCost).toFixed(6)}{" "}
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
                  <LoadingDots text={`buying ${tokenSymbol || "tokens"}`} />
                ) : (
                  `buy ${tokenSymbol || "tokens"}`
                )}
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={approveBuy}
                disabled={buyState.isApproving}
              >
                {buyState.isApproving ? (
                  <LoadingDots text="setting spending cap" />
                ) : (
                  "set spending cap"
                )}
              </PrimaryButton>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <div>
              <InputLabel>amount of CORDEX to sell</InputLabel>
              <div className="flex items-center space-x-2 w-full">
                <NumericInput
                  value={sellState.amount}
                  onChange={(e) => handleSellAmountChange(e.target.value)}
                  placeholder="0.0"
                  disabled={sellState.isProcessing || sellState.isApproving}
                  allowDecimal={true}
                />
                <span className="text-gray-400 text-sm whitespace-nowrap">
                  {tokenSymbol || "tokens"}
                </span>
              </div>
            </div>

            {sellState.amount && Number(sellState.amount) > 0 && (
              <div className="">
                <p className="text-sm text-gray-300">
                  estimated payout: {Number(sellState.estimatedCost).toFixed(6)}{" "}
                  CORDEX
                </p>
              </div>
            )}

            {hasInsufficientTokenBalance() && (
              <p className="text-cordex-red text-sm">
                insufficient token balance
              </p>
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
              >
                {sellState.isProcessing ? (
                  <LoadingDots text={`selling ${tokenSymbol || "tokens"}`} />
                ) : (
                  `sell ${tokenSymbol || "tokens"}`
                )}
              </PrimaryButton>
            ) : (
              <PrimaryButton
                onClick={approveSell}
                disabled={sellState.isApproving}
              >
                {sellState.isApproving ? (
                  <LoadingDots text="setting spending cap" />
                ) : (
                  "set spending cap"
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
