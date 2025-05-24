import React from "react";
import { InputLabel } from "./ui";
import { LoadingDots } from "./ui/LoadingDots";
import { NumericInput } from "./ui/NumericInput";
import { PrimaryButton } from "./ui/PrimaryButton";
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
  cordexBalance: string | null | undefined;
  accumulatedFees: string | null | undefined;
  maxSellableAmount: string | null | undefined;
  maxBuyableAmount: string | null | undefined;
  handleBuyAmountChange: (amount: string) => void;
  handleSellAmountChange: (amount: string) => void;
  approveBuy: () => void;
  approveSell: () => void;
  executeBuy: () => void;
  executeSell: () => void;
  setActiveTab: (tab: "buy" | "sell") => void;
  clearSuccessMessage: () => void;
  onCalculateMaxBuyable?: () => Promise<string>;
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
  cordexBalance,
  accumulatedFees,
  maxSellableAmount,
  maxBuyableAmount,
  handleBuyAmountChange,
  handleSellAmountChange,
  approveBuy,
  approveSell,
  executeBuy,
  executeSell,
  setActiveTab,
  clearSuccessMessage,
  onCalculateMaxBuyable,
}) => {
  // Calculate if the user has sufficient balance to sell
  const hasInsufficientTokenBalance = () => {
    if (!tokenBalance || !sellState.amount) return false;
    return Number(sellState.amount) > Number(tokenBalance);
  };

  // Calculate if the sell amount would exceed available liquidity
  const exceedsLiquidityLimit = () => {
    if (!maxSellableAmount || !sellState.amount) return false;
    // Check if user's sell amount exceeds what would drain all liquidity
    return Number(sellState.amount) > Number(maxSellableAmount);
  };

  // Handle max button click - set to the smaller of user balance or max sellable amount
  const handleMaxSell = () => {
    if (!tokenBalance && !maxSellableAmount) return;
    
    const userBalance = Number(tokenBalance || "0");
    const maxSellable = Number(maxSellableAmount || "0");
    
    // Use the smaller of the two values
    const maxAmount = Math.min(userBalance, maxSellable);
    
    if (maxAmount > 0) {
      handleSellAmountChange(maxAmount.toString());
    }
  };

  // Handle max buy button click - calculate and set the maximum buyable amount
  const handleMaxBuy = async () => {
    if (onCalculateMaxBuyable) {
      try {
        const maxAmount = await onCalculateMaxBuyable();
        if (maxAmount && Number(maxAmount) > 0) {
          handleBuyAmountChange(maxAmount);
        }
      } catch (err) {
        console.error("[handleMaxBuy] Error calculating max buyable amount:", err);
      }
    } else if (maxBuyableAmount) {
      // Fallback to existing value if no calculator provided
      const maxBuyable = Number(maxBuyableAmount || "0");
      if (maxBuyable > 0) {
        handleBuyAmountChange(maxBuyable.toString());
      }
    }
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

      {/* ADDED: CORDEX balance display */}
      {cordexBalance !== null && cordexBalance !== undefined && (
        <div className="text-sm text-gray-400 mb-3">
          your CORDEX: {Number(cordexBalance).toFixed(4)} CORDEX
        </div>
      )}

      {/* ADDED: Liquidity and limit information */}
      {accumulatedFees !== null && accumulatedFees !== undefined && (
        <div className="text-sm text-gray-400 mb-3">
          available liquidity: {Number(accumulatedFees).toFixed(4)} CORDEX
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
              <div className="flex items-center space-x-2 w-full">
                <div className="flex-1 relative">
                  <NumericInput
                    value={buyState.amount}
                    onChange={(e) => handleBuyAmountChange(e.target.value)}
                    placeholder="0.0"
                    disabled={buyState.isProcessing || buyState.isApproving}
                    allowDecimal={true}
                  />
                  {/* Max button */}
                  {(cordexBalance || maxBuyableAmount) && (
                    <button
                      onClick={handleMaxBuy}
                      disabled={buyState.isProcessing || buyState.isApproving}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 hover:text-white disabled:text-gray-600 disabled:hover:text-gray-600 px-2 py-1 rounded border border-gray-600 hover:border-gray-400 disabled:border-gray-700"
                    >
                      max
                    </button>
                  )}
                </div>
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
              <InputLabel>amount of {tokenSymbol || "tokens"} to sell</InputLabel>
              <div className="flex items-center space-x-2 w-full">
                <div className="flex-1 relative">
                  <NumericInput
                    value={sellState.amount}
                    onChange={(e) => handleSellAmountChange(e.target.value)}
                    placeholder="0.0"
                    disabled={sellState.isProcessing || sellState.isApproving}
                    allowDecimal={true}
                  />
                  {/* Max button */}
                  {(tokenBalance || maxSellableAmount) && (
                    <button
                      onClick={handleMaxSell}
                      disabled={sellState.isProcessing || sellState.isApproving}
                      className="absolute right-2 top-1/2 transform -translate-y-1/2 text-xs text-gray-400 hover:text-white disabled:text-gray-600 disabled:hover:text-gray-600 px-2 py-1 rounded border border-gray-600 hover:border-gray-400 disabled:border-gray-700"
                    >
                      max
                    </button>
                  )}
                </div>
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

            {hasInsufficientTokenBalance() ? (
              <p className="text-cordex-red text-sm">
                insufficient token balance
              </p>
            ) : exceedsLiquidityLimit() ? (
              <p className="text-cordex-red text-sm">
                not enough liquidity
              </p>
            ) : null}

            {sellState.hasAllowance ? (
              <PrimaryButton
                onClick={executeSell}
                disabled={
                  !sellState.amount ||
                  sellState.isProcessing ||
                  Number(sellState.amount) <= 0 ||
                  hasInsufficientTokenBalance() ||
                  exceedsLiquidityLimit()
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
